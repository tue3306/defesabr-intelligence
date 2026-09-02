// RSS via rss2json.com (GRÁTIS). Pode falhar por CORS/limite — sempre há fallback.
import { fetchJSON } from './http'
import { todayNews } from '../data/mockData'

const BASE = 'https://api.rss2json.com/v1/api.json'

// kw = palavras-chave de busca (minúsculas, sem acento); cat = categoria exibida
// (deve casar com as chaves de `categoryColors` em utils/textUtils.js).
const CATEGORY_HINTS = [
  { kw: ['ciber', 'cyber', 'hacker', 'digital'], cat: 'Cibersegurança' },
  { kw: ['fronteira', 'amazon', 'narco', 'garimpo'], cat: 'Fronteiras' },
  { kw: ['embraer', 'industria', 'contrato', 'aeronave', 'naval group'], cat: 'Indústria' },
  { kw: ['orcamento', 'verba', 'bilho', 'recurso'], cat: 'Orçamento' },
  { kw: ['diploma', 'acordo', 'bilateral', 'mercosul'], cat: 'Diplomacia' },
  { kw: ['inteligencia', 'espion'], cat: 'Inteligência' },
]

function guessCategory(text = '') {
  const t = text.toLowerCase()
  for (const h of CATEGORY_HINTS) if (h.kw.some((k) => t.includes(k))) return h.cat
  return 'Forças Armadas'
}

export async function fetchRssFeed(rssUrl, max = 10) {
  try {
    const url = `${BASE}?rss_url=${encodeURIComponent(rssUrl)}&count=${max}`
    const data = await fetchJSON(url, {}, { timeout: 10000, retries: 1 })
    if (data?.status !== 'ok' || !data.items?.length) throw new Error('RSS sem itens')
    const items = data.items.slice(0, max).map((it, i) => ({
      id: i + 1,
      title: it.title,
      source: data.feed?.title || 'RSS',
      url: it.link,
      date: it.pubDate,
      summary: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 280),
      category: guessCategory(`${it.title} ${it.description}`),
    }))
    return { data: items, source: 'live' }
  } catch (err) {
    console.warn(`RSS indisponível (${rssUrl}), usando fallback: ${err.message}`)
    return { data: todayNews, source: 'demo' }
  }
}

// Agrega várias fontes (apenas as habilitadas), com deduplicação simples.
export async function fetchAllFeeds(sources = [], maxPerFeed = 6) {
  const enabled = sources.filter((s) => s.enabled)
  if (!enabled.length) return { data: todayNews, source: 'demo' }
  const results = await Promise.allSettled(enabled.map((s) => fetchRssFeed(s.url, maxPerFeed)))
  const all = []
  let anyLive = false
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      if (r.value.source === 'live') anyLive = true
      all.push(...r.value.data)
    }
  })
  if (!all.length) return { data: todayNews, source: 'demo' }
  // dedup por título
  const seen = new Set()
  const deduped = all.filter((a) => {
    const k = a.title?.toLowerCase().slice(0, 60)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return { data: deduped, source: anyLive ? 'live' : 'demo' }
}
