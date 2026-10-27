// -----------------------------------------------------------------------------
// LIMITE DE TENTATIVAS
//
// Duas ameaças, o mesmo endpoint, e a segunda é a que assusta:
//
//  1. FORÇA BRUTA. `/auth/login` aceita tentativas ilimitadas. Com três contas
//     de exemplo cujos e-mails são públicos, adivinhar senha é só questão de
//     tempo de CPU de quem tenta.
//
//  2. NEGAÇÃO DE SERVIÇO. `scryptSync` custa 26 ms medidos e é SÍNCRONO: ele
//     para o event loop inteiro. Cerca de 39 requisições por segundo bastam
//     para o servidor não responder mais a nada — incluindo `/api/health`, o
//     que faz a plataforma concluir que a aplicação morreu e reiniciar o
//     processo. Um laço de shell derruba a plataforma sem exploit nenhum.
//
// O scrypt passou a ser assíncrono (ver `lib/auth.js`), o que resolve o
// travamento do event loop. Este módulo resolve o resto: um teto por IP, sem
// dependência nova.
//
// POR QUE NO BANCO. A plataforma é serverless: várias instâncias atendem ao
// mesmo tempo, cada requisição pode cair numa diferente, e uma instância some
// quando fica ociosa. Um contador em memória valeria POR INSTÂNCIA — o teto de
// 10 tentativas virava 10 vezes o número de instâncias, e zerava a cada
// reciclagem. O contador mora em `limite_tentativas`, no Postgres, e a admissão
// é um único upsert atômico: instâncias diferentes disputam a mesma linha e o
// banco serializa.
//
// O que NÃO se faz aqui: contar por e-mail. Isso permitiria a um terceiro
// trancar a conta de alguém só mandando senhas erradas — a proteção viraria a
// ferramenta do ataque.
// -----------------------------------------------------------------------------

import { createHash } from 'node:crypto'
import { waitUntil } from '@vercel/functions'
import { get, run } from '../db/index.js'

/**
 * IP de quem chama, atrás do proxy da plataforma.
 *
 * `req.ip`, e não o PRIMEIRO item de `x-forwarded-for`. O primeiro item é o
 * que o próprio cliente escreveu: o proxy ACRESCENTA o endereço real ao fim da
 * cadeia, sem apagar o que veio antes. Lendo o primeiro, bastava mandar um
 * `X-Forwarded-For` diferente a cada tentativa para nunca atingir o teto — o
 * limite de login não limitava ninguém. Com `trust proxy` = 1 (ver `app.js`),
 * o Express confia só no último salto e `req.ip` é o endereço que o proxy viu.
 */
function ipDe(req) {
  return req.ip || req.socket?.remoteAddress || 'desconhecido'
}

/**
 * O IP entra no banco como resumo SHA-256, não em texto: o contador só precisa
 * reconhecer o mesmo endereço dentro da janela, não saber qual é (LGPD, art. 6º, III).
 */
export const chaveDeIp = (ip) => `ip:${createHash('sha256').update(`defesabr-limite:${ip}`).digest('hex').slice(0, 32)}`

// ─────────────────────────────────────────────────────────────────────────────
// POR IP OU POR CONTA — E A ESCOLHA DEPENDE DO QUE SE PROTEGE
//
// O aviso lá em cima ("não contar por e-mail") vale para `/auth/login`, e vale
// muito: lá quem chama ESCOLHE a identidade que declara, e contar por ela
// deixaria qualquer pessoa trancar a conta de outra só mandando senha errada.
// A proteção viraria a ferramenta do ataque.
//
// Nas rotas de quem já entrou (troca de senha, por exemplo) a situação é a
// inversa: a identidade é PROVADA por token assinado, ninguém consome a cota de
// outra pessoa sem ter o token dela, e num escritório atrás de um endereço só
// a primeira pessoa a errar a senha não pode esgotar a cota de todas as outras.
//
// `porConta` inverte a ordem: usa a conta quando há sessão e cai no IP quando
// não há. Sem sessão o comportamento é o de antes, que é o que protege as
// rotas públicas.
// ─────────────────────────────────────────────────────────────────────────────
function chave(req, porConta) {
  if (porConta && req.conta?.sub) return `conta:${req.conta.sub}`
  return chaveDeIp(ipDe(req))
}

/**
 * Middleware de teto por IP.
 *
 * @param {object} opcoes
 * @param {number} opcoes.max        tentativas permitidas na janela
 * @param {number} opcoes.janelaMs   duração da janela
 * @param {boolean} opcoes.soFalhas  debita apenas respostas 4xx/5xx. Um login
 *                                   correto não consome cota, então uso normal
 *                                   nunca esbarra no teto. Uma vez ATINGIDO o
 *                                   teto, porém, o bloqueio vale para todos
 *                                   naquele IP — inclusive para quem sabe a
 *                                   senha, e é assim que tem de ser: liberar
 *                                   quem acerta na 11ª tentativa entregaria a
 *                                   conta a quem estava justamente chutando
 * @param {boolean} opcoes.porConta  conta por CONTA quando há sessão, caindo no
 *                                   IP quando não há. Para rota autenticada
 *                                   cujo custo é da própria pessoa — ver a nota
 *                                   acima de `chave()`.
 * @param {(p: Promise<void>) => void} opcoes.emSegundoPlano  recebe o estorno
 *                                   feito depois da resposta. Padrão: o
 *                                   `waitUntil` da Vercel — ver o `finish` abaixo.
 */
export function limitar({
  max = 20, janelaMs = 60_000, soFalhas = false, porConta = false, emSegundoPlano = waitUntil,
} = {}) {
  return async (req, res, next) => {
    const k = `${chave(req, porConta)}:${req.baseUrl}${req.path}`
    const agora = Date.now()

    let linha
    try {
      // Admissão atômica: abre a janela ou, se ela venceu, a reabre em 1; senão
      // soma 1. Reservar JÁ aqui (e não no `finish`) é o que faz o teto valer
      // sob rajada: a conferência de senha é assíncrona, e requisições
      // simultâneas leriam todas a contagem ainda em zero. O banco devolve o
      // valor já somado, então cada requisição enxerga a sua posição na fila.
      linha = await get(
        `INSERT INTO limite_tentativas (chave, contagem, expira) VALUES (?, 1, ?)
         ON CONFLICT (chave) DO UPDATE SET
           contagem = CASE WHEN limite_tentativas.expira <= ? THEN 1 ELSE limite_tentativas.contagem + 1 END,
           expira   = CASE WHEN limite_tentativas.expira <= ? THEN excluded.expira ELSE limite_tentativas.expira END
         RETURNING contagem, expira`,
        [k, agora + janelaMs, agora, agora],
      )
    } catch (err) {
      // Sem o contador não há como garantir o teto, e liberar sem teto
      // reabriria a força bruta: falha fechada.
      console.error('[limite] banco indisponível:', err?.message || err)
      return res.status(503).json({
        error: 'Serviço temporariamente indisponível. Tente de novo em instantes.',
        code: 'BANCO_INDISPONIVEL',
      })
    }

    const { contagem, expira } = linha

    if (contagem > max) {
      // Quem é barrado não consome cota: devolve a vaga que acabou de reservar.
      await estornar(k, expira)
      const faltam = Math.max(1, Math.ceil((expira - agora) / 1000))
      res.setHeader('Retry-After', String(faltam))
      return res.status(429).json({
        error: `Tentativas demais. Aguarde ${faltam}s e tente de novo.`,
        code: 'LIMITE_EXCEDIDO',
      })
    }

    // Um desfecho bom devolve a vaga: login correto não consome cota. Atrelado à
    // MESMA janela (`expira`) para não estornar numa janela que já foi reaberta.
    if (soFalhas) {
      // O `finish` dispara DEPOIS da resposta sair, e na Vercel a função pode
      // ser congelada logo em seguida, com o UPDATE ainda no ar: a vaga ficaria
      // consumida. Entregar a promessa ao `waitUntil` mantém a função viva até
      // ele terminar. Fora da Vercel o `waitUntil` não faz nada e a promessa
      // segue sozinha; `estornar` já captura o próprio erro.
      res.on('finish', () => { if (res.statusCode < 400) emSegundoPlano(estornar(k, expira)) })
    }

    next()
  }
}

/** Devolve uma vaga da janela `expira`; falha de banco não derruba a resposta. */
async function estornar(k, expira) {
  try {
    await run(
      'UPDATE limite_tentativas SET contagem = GREATEST(contagem - 1, 0) WHERE chave = ? AND expira = ?',
      [k, expira],
    )
  } catch (err) {
    console.error('[limite] estorno não gravado:', err?.message || err)
  }
}

/**
 * Apaga as janelas vencidas. Sem instância fixa não há `setInterval` que dure,
 * então a retenção periódica (Tarefa de coleta) chama esta função.
 */
export async function apagarJanelasVencidas() {
  const { changes } = await run('DELETE FROM limite_tentativas WHERE expira <= ?', [Date.now()])
  return changes
}

export default { limitar, apagarJanelasVencidas }
