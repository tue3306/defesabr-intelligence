// -----------------------------------------------------------------------------
// CAMADA DE SERVIÇOS — ponto único de acesso à API.
//
// Cada função corresponde a um endpoint real de `server/src/routes/`. Não há
// resolvedor local: se o servidor não responder, a interface mostra o erro.
//
//   import { noticias, sistema } from '../services'
// -----------------------------------------------------------------------------
import { request } from './client'
import { COLLECT_TIMEOUT } from './config'

export { request, ping, ApiError } from './client'
export {
  API_BASE_URL, APP_NAME, APP_VERSION, FONTES, NAO_IMPLEMENTADO, clientId,
} from './config'

/** Notícias coletadas. */
export const noticias = {
  listar: (params) => request('GET /news', { params }),
  clipping: (params) => request('GET /news/clipping', { params }),
  estatisticas: (params) => request('GET /news/stats', { params }),
  detalhe: (id) => request(`GET /news/${id}`),
}

/** Proposições legislativas (Dados Abertos da Câmara). */
export const legislativo = {
  listar: (params) => request('GET /legislative', { params }),
  atualizarTramitacao: (id) => request(`POST /legislative/${id}/refresh`, { timeout: 30000 }),
}

/** Indicadores econômicos (World Bank + câmbio). */
export const economia = {
  indicadores: () => request('GET /economy/indicators'),
  comparacao: (code) => request('GET /economy/comparison', { params: { code } }),
}

/** Fontes de coleta e sua saúde. */
export const fontes = {
  listar: () => request('GET /sources'),
  alternar: (id, enabled) => request(`PATCH /sources/${id}`, { body: { enabled } }),
}

/** Busca global. */
export const busca = {
  consultar: (q) => request('GET /search', { params: { q } }),
}

/**
 * Diagnóstico da plataforma.
 *
 * É o que alimenta o painel de status: o que funciona, o que está degradado e
 * o que não existe — cada resposta derivada do banco, não escrita à mão.
 */
export const sistema = {
  status: () => request('GET /system/status'),
  capacidades: () => request('GET /system/capabilities'),
  execucoes: (limit) => request('GET /system/runs', { params: { limit } }),
  metodo: () => request('GET /system/method'),
  // O teste do filtro ao vivo: cola-se um título e vê-se a decisão com os
  // termos que casaram. Sem isso, "a regra é auditável" seria só uma frase.
  testarFiltro: (text) => request('POST /system/method/test', { body: { text } }),
  // A coleta manual leva de 5 a 20 segundos e precisa do seu próprio timeout.
  coletar: () => request('POST /system/collect', { timeout: COLLECT_TIMEOUT }),
  coletarFonte: (id) => request(`POST /system/collect/${id}`, { timeout: 40000 }),
  meta: () => request('GET /meta'),
}

/** Favoritos — por navegador, sem conta. */
export const favoritos = {
  listar: () => request('GET /bookmarks'),
  salvar: (articleId, note) => request(`POST /bookmarks/${articleId}`, { body: { note } }),
  remover: (articleId) => request(`DELETE /bookmarks/${articleId}`),
}
