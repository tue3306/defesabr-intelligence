import config from '../config.js'

// -----------------------------------------------------------------------------
// BUSCA EXTERNA
//
// Toda saída para a internet passa por aqui, e por cinco motivos concretos:
//
//  • TIMEOUT. Sem AbortController, um feed que aceita a conexão e nunca
//    responde trava a coleta inteira — e o agendador nunca mais dispara.
//  • USER-AGENT. Vários sites do gov.br recusam cliente sem identificação.
//    Identificar-se é o mínimo de educação com quem publica de graça.
//  • ERRO LEGÍVEL. "HTTP 403" diz o que aconteceu; um TypeError de fetch, não.
//  • LIMITE POR HOST. Ver abaixo — é o que separa funcionar aqui de funcionar
//    no servidor de verdade.
//  • REPETIÇÃO. Falha de rede não é falha da fonte; merece uma segunda chance.
//
// ─────────────────────────────────────────────────────────────────────────────
// O CASO QUE ORIGINOU O LIMITE POR HOST
//
// A coleta roda `Promise.all` sobre as fontes: 21 requisições disparadas no
// mesmo instante. Oito delas apontam para `www.gov.br` — Defesa, Planalto,
// Polícia Federal, MJ, GSI, ABIN, Defesa Civil e Itamaraty.
//
// Na máquina de desenvolvimento isso passa. Em produção (Railway), sete das
// oito falhavam com `fetch failed` e uma passava — sempre. Falhar sete de oito
// não é indisponibilidade do gov.br, que respondia normalmente ao ser
// consultado sozinho; é o servidor cortando conexões simultâneas vindas do
// mesmo IP. Um IP de datacenter recebe esse tratamento antes de um doméstico,
// e foi por isso que o defeito não aparecia localmente.
//
// A correção não é aumentar o timeout: não havia timeout: a conexão era
// RECUSADA. É pedir com educação — no máximo duas conexões por host ao mesmo
// tempo, enfileirando o resto. A coleta fica alguns segundos mais lenta e
// para de perder um terço das fontes.
// ─────────────────────────────────────────────────────────────────────────────

/** No máximo N requisições simultâneas para o MESMO host. */
const MAX_POR_HOST = 2
const filas = new Map() // host → { ativos, espera[] }

function hostDe(url) {
  try { return new URL(url).host } catch { return 'desconhecido' }
}

/** Espera uma vaga no host e devolve a função que a libera. */
async function vaga(host) {
  let fila = filas.get(host)
  if (!fila) { fila = { ativos: 0, espera: [] }; filas.set(host, fila) }

  if (fila.ativos >= MAX_POR_HOST) {
    await new Promise((libera) => fila.espera.push(libera))
  }
  fila.ativos += 1

  return () => {
    fila.ativos -= 1
    const proximo = fila.espera.shift()
    if (proximo) proximo()
    else if (fila.ativos === 0) filas.delete(host)
  }
}

/**
 * O erro merece nova tentativa?
 *
 * Recusa de conexão, DNS instável e corte no meio são transitórios. Um 403 ou
 * um 404, não: repeti-los é insistir num "não" já dado, e a única coisa que
 * conseguem é dobrar a carga sobre quem publica de graça.
 */
function valeRepetir(err) {
  if (err?.status) return err.status === 429 || err.status >= 500
  const codigo = err?.causa?.code || err?.causa?.cause?.code || ''
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|UND_ERR/i.test(
    `${codigo} ${err?.message || ''}`
  )
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

export class ErroDeColeta extends Error {
  constructor(mensagem, { url, status, causa } = {}) {
    super(mensagem)
    this.name = 'ErroDeColeta'
    this.url = url
    this.status = status
    this.causa = causa
  }
}

async function buscarUmaVez(url, {
  aceita,
  timeoutMs = config.coleta.timeoutMs,
  // O Comex Stat só responde a POST com a consulta no corpo. Antes esta função
  // montava sempre um GET e descartava silenciosamente qualquer método ou
  // corpo que lhe passassem — um jeito discreto de a chamada falhar sem que o
  // chamador entendesse por quê.
  method = 'GET',
  body,
  headers: extras,
} = {}) {
  const controlador = new AbortController()
  const relogio = setTimeout(() => controlador.abort(), timeoutMs)
  try {
    const resposta = await fetch(url, {
      signal: controlador.signal,
      redirect: 'follow',
      method,
      body,
      headers: {
        'User-Agent': config.coleta.userAgent,
        Accept: aceita,
        'Accept-Language': 'pt-BR,pt;q=0.9',
        ...extras,
      },
    })
    if (!resposta.ok) {
      throw new ErroDeColeta(`HTTP ${resposta.status}`, { url, status: resposta.status })
    }
    return resposta
  } catch (err) {
    if (err instanceof ErroDeColeta) throw err
    if (err?.name === 'AbortError') {
      throw new ErroDeColeta(`sem resposta em ${timeoutMs}ms`, { url, causa: err })
    }
    // `fetch failed` sozinho não diz nada — e foi exatamente essa mensagem
    // que apareceu no painel por sete fontes, sem indicar o motivo. O código
    // real vem em `err.cause`, e é ele que distingue conexão recusada de DNS
    // instável de erro de TLS.
    const causa = err?.cause?.code || err?.cause?.message || ''
    const msg = causa ? `${err?.message || err} (${causa})` : String(err?.message || err)
    throw new ErroDeColeta(msg.slice(0, 180), { url, causa: err })
  } finally {
    clearTimeout(relogio)
  }
}

/**
 * Porta pública: respeita o limite do host e repete falha transitória.
 *
 * `tentativas: 1` desliga a repetição para quem já a faz por conta própria —
 * o coletor do Comex, que trata 429 com a sua própria espera.
 */
async function buscar(url, opcoes = {}) {
  const { tentativas = 2, ...resto } = opcoes
  const libera = await vaga(hostDe(url))
  try {
    let ultimo
    for (let i = 0; i < tentativas; i += 1) {
      try {
        return await buscarUmaVez(url, resto)
      } catch (err) {
        ultimo = err
        if (i === tentativas - 1 || !valeRepetir(err)) throw err
        // Espera crescente: 800ms, 1600ms. Curta o bastante para não estourar
        // a janela da coleta, longa o bastante para o host se recompor.
        await espera(800 * (i + 1))
      }
    }
    throw ultimo
  } finally {
    libera()
  }
}

export async function buscarTexto(url, opcoes = {}) {
  const r = await buscar(url, { aceita: 'application/rss+xml, application/xml, text/xml, */*', ...opcoes })
  return r.text()
}

export async function buscarJson(url, opcoes = {}) {
  const r = await buscar(url, { aceita: 'application/json', ...opcoes })
  const bruto = await r.text()
  try {
    return JSON.parse(bruto)
  } catch (err) {
    throw new ErroDeColeta('resposta não é JSON válido', { url, causa: err })
  }
}

export default { buscarTexto, buscarJson, ErroDeColeta }
