import { request, registerMock } from './client'
import { fetchAllFeeds } from '../api/rss'
import {
  todayNews, mockDailyClipping, mockWeeklyAnalysis, archiveSeeds,
  seedNotifications, newsVolume14d, CATEGORIES,
} from '../data/mockData'

// -----------------------------------------------------------------------------
// SERVIÇO DE NOTÍCIAS E CLIPPING
//
// Contrato de endpoints (o mesmo em modo demonstração e contra um backend):
//   GET  /news                 ?category&urgency&q&limit
//   GET  /news/volume          ?days
//   GET  /clipping/latest
//   GET  /clipping/archive     ?q&category&alert
//   GET  /analysis/weekly      ?area
//   GET  /notifications        ?unread
// -----------------------------------------------------------------------------

const matches = (news, { q, category, urgency, region }) => {
  if (category && news.category !== category) return false
  if (urgency && news.urgency !== urgency) return false
  if (region && news.region !== region) return false
  if (q) {
    const hay = `${news.title} ${news.summary} ${(news.actors || []).join(' ')}`.toLowerCase()
    if (!hay.includes(q.toLowerCase())) return false
  }
  return true
}

// ── Resolvedores locais ───────────────────────────────────────────────────────
registerMock('GET /news', async (params = {}) => {
  // Em modo demonstração ainda tentamos as fontes RSS habilitadas pelo usuário:
  // se houver alguma ligada, o dado é real; senão cai no acervo local coerente.
  const { sources, limit = 30, ...filters } = params
  let base = todayNews
  let origin = 'demo'
  if (Array.isArray(sources) && sources.some((s) => s.enabled)) {
    const { data, source } = await fetchAllFeeds(sources)
    if (data?.length) { base = data; origin = source }
  }
  const items = base.filter((n) => matches(n, filters)).slice(0, limit)
  return { items, total: items.length, origin, categories: CATEGORIES }
})

registerMock('GET /news/volume', ({ days = 14 } = {}) => ({
  series: newsVolume14d.slice(-days),
  days,
}))

registerMock('GET /clipping/latest', () => mockDailyClipping)

registerMock('GET /clipping/archive', ({ q, category, alert } = {}) => {
  let items = [...archiveSeeds]
  if (category) items = items.filter((c) => c.categories?.includes(category))
  if (alert) items = items.filter((c) => c.alert_level === alert)
  if (q) {
    const needle = q.toLowerCase()
    items = items.filter((c) => `${c.title} ${c.preview}`.toLowerCase().includes(needle))
  }
  return { items, total: items.length }
})

registerMock('GET /analysis/weekly', ({ area = 'empresarial' } = {}) =>
  mockWeeklyAnalysis[area] || mockWeeklyAnalysis.empresarial)

registerMock('GET /notifications', ({ unread } = {}) => {
  const items = unread ? seedNotifications.filter((n) => !n.read) : seedNotifications
  return { items, total: items.length }
})

// ── API pública do serviço ────────────────────────────────────────────────────
export const newsService = {
  /** Feed de notícias, já filtrado. */
  list: (params) => request('GET /news', { params }),
  /** Volume diário por categoria (gráfico de 14 dias). */
  volume: (days = 14) => request('GET /news/volume', { params: { days } }),
  /** Último clipping publicado. */
  latestClipping: () => request('GET /clipping/latest'),
  /** Acervo de clippings arquivados. */
  archive: (params) => request('GET /clipping/archive', { params }),
  /** Análise semanal por área de foco. */
  weeklyAnalysis: (area) => request('GET /analysis/weekly', { params: { area } }),
  /** Notificações da conta. */
  notifications: (params) => request('GET /notifications', { params }),
}

export default newsService
