import config from '../config.js'

// -----------------------------------------------------------------------------
// BUSCA EXTERNA
//
// Toda saída para a internet passa por aqui, e por três motivos concretos:
//
//  • TIMEOUT. Sem AbortController, um feed que aceita a conexão e nunca
//    responde trava a coleta inteira — e o agendador nunca mais dispara.
//  • USER-AGENT. Vários sites do gov.br recusam cliente sem identificação.
//    Identificar-se é o mínimo de educação com quem publica de graça.
//  • ERRO LEGÍVEL. "HTTP 403" diz o que aconteceu; um TypeError de fetch, não.
// -----------------------------------------------------------------------------

export class ErroDeColeta extends Error {
  constructor(mensagem, { url, status, causa } = {}) {
    super(mensagem)
    this.name = 'ErroDeColeta'
    this.url = url
    this.status = status
    this.causa = causa
  }
}

async function buscar(url, { aceita, timeoutMs = config.coleta.timeoutMs } = {}) {
  const controlador = new AbortController()
  const relogio = setTimeout(() => controlador.abort(), timeoutMs)
  try {
    const resposta = await fetch(url, {
      signal: controlador.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': config.coleta.userAgent,
        Accept: aceita,
        'Accept-Language': 'pt-BR,pt;q=0.9',
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
    throw new ErroDeColeta(String(err?.message || err).slice(0, 180), { url, causa: err })
  } finally {
    clearTimeout(relogio)
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
