import { API_BASE_URL, REQUEST_TIMEOUT, APP_VERSION } from './config'
import { temPonte, viaPonte, cabecalhoDeSessao } from './apiBridge'

// -----------------------------------------------------------------------------
// CLIENTE DE DADOS — a única fronteira entre a interface e a origem dos dados.
//
// Todos os serviços de domínio chamam `request()`, e ele fala com UMA origem
// só: a API. O contrato de retorno é
//
//   { data, meta: { source: 'live', endpoint, fetchedAt, latency } }
//
// Este arquivo já teve três caminhos: ponte para a API, resolvedor local e um
// "modo demonstração" que era o PADRÃO — bastava não configurar nada para a
// plataforma inteira servir dados escritos à mão, sem que nada na tela deixasse
// isso óbvio. Restou um caminho. Se a API não responde, a consulta falha e a
// tela mostra erro; nenhum número aparece sem ter vindo de uma fonte.
//
// Erros sempre chegam como `ApiError` — nunca como exceções cruas de rede.
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(message, { status = 0, endpoint, cause, code = 'REQUEST_FAILED' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.endpoint = endpoint
    this.code = code
    this.cause = cause
  }

  /** Mensagem pronta para a interface — sem jargão de rede. */
  get userMessage() {
    if (this.code === 'TIMEOUT') return 'A fonte demorou demais para responder. Tente novamente.'
    if (this.code === 'NO_SOURCE') return 'Esta consulta não tem fonte de dados disponível.'
    if (this.status === 401 || this.status === 403) return 'Sua sessão não tem permissão para esta consulta.'
    if (this.status === 404) return 'O conteúdo solicitado não foi encontrado.'
    if (this.status >= 500) return 'O serviço de dados está instável no momento.'
    return this.message || 'Não foi possível concluir a consulta.'
  }
}

/**
 * Endpoints atendidos pela ponte.
 *
 * Substitui `listMockEndpoints()`, que listava os resolvedores locais. A tela
 * de diagnóstico mostra isto como "endpoints registrados".
 */
export function listEndpoints() {
  return [...temPonte.chaves()].sort()
}

/** Query string, ignorando vazios e expandindo arrays. */
function buildQuery(params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((i) => q.append(k, i))
    else q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

/**
 * Consulta de dados.
 *
 * @param {string} endpoint  'GET /news', 'POST /bookmarks/12'…
 * @param {object} opcoes    { params, body, signal, timeout }
 */
export async function request(endpoint, { params = {}, body, signal, timeout = REQUEST_TIMEOUT } = {}) {
  const started = Date.now()
  const [method = 'GET', path = '/'] = endpoint.trim().split(/\s+/)

  // ── Caminho preferido: a ponte, que conhece a forma de cada resposta ──
  if (temPonte(endpoint)) {
    try {
      const data = await viaPonte(endpoint, params)
      return {
        data,
        meta: {
          source: 'live',
          endpoint,
          fetchedAt: new Date().toISOString(),
          latency: Date.now() - started,
        },
      }
    } catch (err) {
      throw new ApiError(err?.message || 'Falha ao consultar a API.', {
        endpoint, cause: err, code: 'BRIDGE_FAILED',
      })
    }
  }

  // ── HTTP direto: endpoints que a ponte ainda não mapeia ──
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = setTimeout(() => controller.abort('timeout'), timeout)

  try {
    const res = await fetch(`${API_BASE_URL}/api${path}${buildQuery(params)}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': APP_VERSION,
        ...cabecalhoDeSessao(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.error || (await res.json())?.message } catch { /* corpo não-JSON */ }
      throw new ApiError(detail || `Falha na consulta (HTTP ${res.status}).`, {
        status: res.status, endpoint,
      })
    }

    const payload = await res.json()
    // A API pode devolver { data, meta } ou o recurso direto — normalizamos.
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
    return {
      data,
      meta: {
        source: 'live',
        endpoint,
        fetchedAt: new Date().toISOString(),
        latency: Date.now() - started,
        ...(payload?.meta || {}),
      },
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    const aborted = err?.name === 'AbortError'
    throw new ApiError(
      aborted ? 'A consulta foi interrompida.' : (err?.message || 'Falha de rede.'),
      { endpoint, cause: err, code: aborted ? 'TIMEOUT' : 'NETWORK' },
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export default { request, ApiError, listEndpoints }
