import { randomBytes } from 'node:crypto'
import { get, run } from '../db/index.js'

// -----------------------------------------------------------------------------
// O SEGREDO QUE ASSINA AS SESSOES
//
// Antes: sem `AUTH_SECRET` no ambiente, o servidor gerava um aleatorio A CADA
// BOOT. A intencao era certa — um segredo fixo no codigo seria publico, e
// qualquer pessoa poderia assinar um token de administrador —, mas a
// consequencia era que TODA sessao morria a cada reinicio.
//
// Isso nao e teorico. No deploy do Railway sem a variavel definida, quem
// entrava era desconectado no reinicio seguinte, e a experiencia era
// exatamente "nao consigo fazer login": a pessoa entra, navega, volta e esta
// fora de novo, sem mensagem que explique.
//
// A CORRECAO NAO E EMBUTIR UM SEGREDO NO CODIGO. E gerar um por INSTALACAO e
// guarda-lo onde a instalacao guarda o resto do seu estado: o banco. Um clone
// do repositorio nao vem com segredo nenhum; cada instancia cria o seu na
// primeira subida, e ele so muda se o banco for embora.
//
// A ORDEM DE PRECEDENCIA, e o motivo de cada degrau:
//
//   1. AUTH_SECRET do ambiente, quando tem 16+ caracteres. Continua sendo o
//      caminho recomendado em producao: e o unico que sobrevive ate a um banco
//      recriado, e permite girar o segredo sem tocar em dados.
//
//   2. O segredo guardado em `app_config`. Sobrevive a reinicio do processo e,
//      com volume montado, tambem ao deploy.
//
//   3. Um aleatorio em memoria, se nem o banco puder ser escrito. E o pior
//      caso, e continua sendo seguro — so nao e duravel.
//
// O QUE ISSO NAO MUDA: um segredo curto no ambiente segue sendo RECUSADO. Ele
// da a sensacao de configuracao feita e e adivinhavel por forca bruta, o que e
// pior que nao ter nenhum.
// -----------------------------------------------------------------------------

const CHAVE = 'auth_secret'
const MINIMO = 16

/**
 * Resolve o segredo de sessao, criando-o na primeira subida se preciso.
 *
 * @returns {{ segredo, origem, duravel }} `origem` alimenta o aviso do boot e
 *   o painel de saude: quem hospeda precisa saber de onde veio.
 */
export function resolverSegredo() {
  const doAmbiente = process.env.AUTH_SECRET || ''

  if (doAmbiente.length >= MINIMO) {
    return { segredo: doAmbiente, origem: 'ambiente', duravel: true }
  }

  try {
    const guardado = get('SELECT valor FROM app_config WHERE chave = ?', [CHAVE])?.valor
    if (guardado && guardado.length >= MINIMO) {
      return { segredo: guardado, origem: 'banco', duravel: true }
    }

    const novo = randomBytes(32).toString('hex')
    run('INSERT OR REPLACE INTO app_config (chave, valor) VALUES (?, ?)', [CHAVE, novo])
    return { segredo: novo, origem: 'banco-novo', duravel: true }
  } catch {
    // Banco somente leitura ou indisponivel: cai no aleatorio em memoria, que
    // e seguro e nao e duravel. O boot avisa.
    return { segredo: randomBytes(32).toString('hex'), origem: 'memoria', duravel: false }
  }
}

/** O ambiente trouxe um segredo curto demais para valer? */
export const segredoFraco = () => {
  const v = process.env.AUTH_SECRET || ''
  return v.length > 0 && v.length < MINIMO
}

export default { resolverSegredo, segredoFraco }
