import {
  DATA_MODE, API_BASE_URL, REQUEST_TIMEOUT, MOCK_LATENCY, APP_VERSION,
} from './config'

// -----------------------------------------------------------------------------
// CLIENTE DE DADOS — a única fronteira entre a interface e a origem dos dados.
//
// Todos os serviços de domínio (news, intel, admin, reports) chamam `request()`.
// Em modo 'mock' a resolução é local; em modo 'api' é HTTP. O CONTRATO de
// retorno é idêntico nos dois casos:
//
//   { data, meta: { source, endpoint, fetchedAt, latency } }
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
    if (this.status === 401 || this.status === 403) return 'Sua sessão não tem permissão para esta consulta.'
    if (this.status === 404) return 'O conteúdo solicitado não foi encontrado.'
    if (this.status >= 500) return 'O serviço de dados está instável no momento.'
    return this.message || 'Não foi possível concluir a consulta.'
  }
}

/** Registro de resolvedores locais: 'GET /news' → () => dados. */
const mockRegistry = new Map()

/**
 * Registra o resolvedor local de um endpoint.
 * @param {string} endpoint  ex.: 'GET /intel/narratives'
 * @param {Function} resolver  (params) => data | Promise<data>
 */
export function registerMock(endpoint, resolver) {
  mockRegistry.set(endpoint.trim(), resolver)
}

/** Endpoints locais disponíveis — útil para a tela de diagnóstico do Admin. */
export function listMockEndpoints() {
  return [...mockRegistry.keys()].sort()
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function simulatedLatency() {
  const { min, max } = MOCK_LATENCY
  if (max <= 0) return 0
  return Math.round(min + Math.random() * (max - min))
}

function buildQuery(params) {
  if (!params || !Object.keys(params).length) return ''
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) v.forEach((item) => usp.append(k, item))
    else usp.append(k, v)
  })
  const q = usp.toString()
  return q ? `?${q}` : ''
}

/**
 * Executa uma consulta de dados.
 *
 * @param {string} endpoint  'GET /news' · 'POST /reports'
 * @param {object} options
 * @param {object} [options.params]  query string (api) ou argumento (mock)
 * @param {object} [options.body]    corpo da requisição
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{data: any, meta: object}>}
 */
export async function request(endpoint, { params, body, signal, timeout = REQUEST_TIMEOUT } = {}) {
  const started = Date.now()
  const [method = 'GET', path = '/'] = endpoint.trim().split(/\s+/)

  // ── Modo demonstração: resolve do repositório local ──
  if (DATA_MODE === 'mock' || !API_BASE_URL) {
    const resolver = mockRegistry.get(endpoint.trim())
    if (!resolver) {
      throw new ApiError(`Endpoint não registrado no modo demonstração: ${endpoint}`, {
        endpoint,
        code: 'NOT_REGISTERED',
        status: 501,
      })
    }
    const delay = simulatedLatency()
    if (delay) await wait(delay)
    if (signal?.aborted) throw new ApiError('Consulta cancelada.', { endpoint, code: 'ABORTED' })
    try {
      const data = await resolver({ ...params }, { body })
      return {
        data,
        meta: { source: 'demo', endpoint, fetchedAt: new Date().toISOString(), latency: Date.now() - started },
      }
    } catch (err) {
      throw new ApiError(err?.message || 'Falha ao resolver os dados locais.', {
        endpoint, cause: err, code: 'MOCK_RESOLVER_FAILED',
      })
    }
  }

  // ── Modo API: HTTP real ──
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = setTimeout(() => controller.abort('timeout'), timeout)

  try {
    const res = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': APP_VERSION,
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.message } catch { /* corpo não-JSON */ }
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
      aborted ? 'A consulta excedeu o tempo limite.' : 'Não foi possível falar com o serviço de dados.',
      { endpoint, cause: err, code: aborted ? 'TIMEOUT' : 'NETWORK' }
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Consulta com degradação graciosa: se a origem falhar, devolve o fallback
 * marcado como tal em vez de quebrar a tela. Usado onde a continuidade da
 * demonstração importa mais que a atualidade do dado.
 */
export async function requestWithFallback(endpoint, options = {}, fallback) {
  try {
    return await request(endpoint, options)
  } catch (err) {
    return {
      data: typeof fallback === 'function' ? fallback() : fallback,
      meta: {
        source: 'fallback',
        endpoint,
        fetchedAt: new Date().toISOString(),
        degraded: true,
        reason: err instanceof ApiError ? err.userMessage : String(err?.message || err),
      },
    }
  }
}
