// GDELT Project API — noticias globais (GRATIS, sem chave).
import { fetchJSON } from './http'
import { todayNews } from '../data/mockData'

const BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'

// Mapeia titulos do GDELT para nosso formato simplificado de noticia bruta.
function normalize(articles = []) {
  return articles.slice(0, 25).map((a, i) => ({
    id: i + 1,
    title: a.title || 'Sem titulo',
    source: a.domain || a.sourcecountry || 'GDELT',
    url: a.url,
    date: a.seendate
      ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(9, 11)}:${a.seendate.slice(11, 13)}:00`
      : new Date().toISOString(),
    image: a.socialimage,
    summary: a.title,
    category: 'Diplomacia',
  }))
}

export async function fetchDefenseNews(query = 'defesa seguranca brasil', maxRecords = 25) {
  try {
    const params = new URLSearchParams({
      query,
      mode: 'artlist',
      maxrecords: String(maxRecords),
      format: 'json',
      sourcelang: 'portuguese',
    })
    const data = await fetchJSON(`${BASE}?${params.toString()}`, {}, { timeout: 10000, retries: 1 })
    const norm = normalize(data?.articles)
    if (!norm.length) throw new Error('GDELT sem resultados')
    return { data: norm, source: 'live' }
  } catch (err) {
    console.warn(`GDELT indisponivel, usando mock: ${err.message}`)
    return { data: todayNews, source: 'demo' }
  }
}
