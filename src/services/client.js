import { API_BASE_URL, REQUEST_TIMEOUT, APP_VERSION, clientId } from './config'

// -----------------------------------------------------------------------------
// CLIENTE HTTP
//
// Porta única para a API. Nenhum componente da interface faz `fetch` direto —
// é isso que garante que timeout, mensagem de erro e cabeçalhos sejam iguais
// em toda a aplicação, em vez de reinventados a cada tela.
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(mensagem, { endpoint, status, code, causa, corpo } = {}) {
    super(mensagem)
    this.name = 'ApiError'
    this.endpoint = endpoint
    this.status = status
    this.code = code
    this.causa = causa
    this.corpo = corpo
  }

  /**
   * Mensagem para o usuário, em português e acionável.
   *
   * O caso que mais importa é OFFLINE: sem esta distinção, "servidor fora do
   * ar" e "nenhum resultado" viram a mesma tela vazia, e quem está depurando
   * não sabe se o problema é a consulta ou a infraestrutura.
   */
  get userMessage() {
    switch (this.code) {
      case 'OFFLINE':
        return 'Não foi possível falar com a API. Confirme se o servidor está rodando (npm run dev:api).'
      case 'TIMEOUT':
        return 'A consulta demorou demais e foi cancelada.'
      case 'ABORTED':
        return 'Consulta cancelada.'
      default:
        if (this.status === 404) return 'Não encontrado.'
        if (this.status === 400) return this.message || 'Requisição inválida.'
        if (this.status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.'
        return this.message || 'Falha ao consultar a API.'
    }
  }
}

/**
 * @param {string} endpoint  "GET /news" ou "POST /system/collect"
 * @param {{params?, body?, signal?, timeout?}} opcoes
 * @returns {Promise<{data, meta}>}
 */
export async function request(endpoint, { params, body, signal, timeout = REQUEST_TIMEOUT } = {}) {
  const inicio = Date.now()
  const [metodo = 'GET', caminho = '/'] = endpoint.trim().split(/\s+/)

  const url = new URL(
    `${API_BASE_URL}/api${caminho}`,
    // Base necessária quando API_BASE_URL é relativo (o caso padrão).
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  )
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const controlador = new AbortController()
  const relogio = setTimeout(() => controlador.abort(), timeout)
  // Cancelamento externo (troca de rota) precisa propagar para o fetch.
  signal?.addEventListener?.('abort', () => controlador.abort(), { once: true })

  try {
    const resposta = await fetch(url, {
      method: metodo,
      signal: controlador.signal,
      headers: {
        Accept: 'application/json',
        'X-Client-Version': APP_VERSION,
        'X-Client-Id': clientId(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const bruto = await resposta.text()
    let dados = null
    try { dados = bruto ? JSON.parse(bruto) : null } catch { /* resposta não-JSON */ }

    if (!resposta.ok) {
      throw new ApiError(dados?.error || `HTTP ${resposta.status}`, {
        endpoint, status: resposta.status, corpo: dados,
      })
    }

    return {
      data: dados,
      meta: { endpoint, buscadoEm: new Date().toISOString(), latencia: Date.now() - inicio },
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err?.name === 'AbortError') {
      throw new ApiError('Consulta cancelada.', {
        endpoint, code: signal?.aborted ? 'ABORTED' : 'TIMEOUT', causa: err,
      })
    }
    // TypeError de fetch = servidor inalcançável. É a falha mais comum em
    // desenvolvimento (esqueceu de subir a API) e merece nome próprio.
    throw new ApiError('Servidor inalcançável.', { endpoint, code: 'OFFLINE', causa: err })
  } finally {
    clearTimeout(relogio)
  }
}

/** Sonda de disponibilidade — usada pela faixa de aviso no topo. */
export async function ping() {
  try {
    const { data } = await request('GET /health', { timeout: 4000 })
    return { online: true, ...data }
  } catch {
    return { online: false }
  }
}

export default request
