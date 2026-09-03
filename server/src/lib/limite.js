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
//     que faz o Railway concluir que a aplicação morreu e reiniciar o
//     contêiner. Um laço de shell derruba a plataforma sem exploit nenhum.
//
// O scrypt passou a ser assíncrono (ver `lib/auth.js`), o que resolve o
// travamento do event loop. Este módulo resolve o resto: um teto por IP, em
// memória, sem dependência nova.
//
// POR QUE EM MEMÓRIA. O Railway roda uma instância e reinicia a cada deploy;
// um contador em memória some junto, e isso é aceitável — quem estava sendo
// barrado ganha tentativas de novo, não acesso. Um armazenamento externo só se
// justifica com várias instâncias, que não é o caso.
//
// O que NÃO se faz aqui: contar por e-mail. Isso permitiria a um terceiro
// trancar a conta de alguém só mandando senhas erradas — a proteção viraria a
// ferramenta do ataque.
// -----------------------------------------------------------------------------

const janelas = new Map()

/** IP de quem chama, atrás do proxy do Railway. */
function chave(req) {
  // `x-forwarded-for` pode trazer uma cadeia; o cliente é o primeiro.
  const encaminhado = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return encaminhado || req.socket?.remoteAddress || 'desconhecido'
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
 */
export function limitar({ max = 20, janelaMs = 60_000, soFalhas = false } = {}) {
  return (req, res, next) => {
    const k = `${chave(req)}:${req.baseUrl}${req.path}`
    const agora = Date.now()
    const registro = janelas.get(k)

    if (!registro || agora > registro.expira) {
      janelas.set(k, { contagem: 0, expira: agora + janelaMs })
    }
    const atual = janelas.get(k)

    if (atual.contagem >= max) {
      const faltam = Math.ceil((atual.expira - agora) / 1000)
      res.setHeader('Retry-After', String(faltam))
      return res.status(429).json({
        error: `Tentativas demais. Aguarde ${faltam}s e tente de novo.`,
        code: 'LIMITE_EXCEDIDO',
      })
    }

    if (soFalhas) {
      // Só debita ao saber o desfecho: login correto não consome cota.
      res.on('finish', () => { if (res.statusCode >= 400) atual.contagem += 1 })
    } else {
      atual.contagem += 1
    }

    next()
  }
}

// Faxina periódica: sem ela o Map cresce com um par por IP visto, para sempre.
// `unref()` para não segurar o processo aberto no encerramento.
const faxina = setInterval(() => {
  const agora = Date.now()
  for (const [k, v] of janelas) if (agora > v.expira) janelas.delete(k)
}, 5 * 60_000)
faxina.unref?.()

export default { limitar }
