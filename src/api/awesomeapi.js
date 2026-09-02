// AwesomeAPI — cotacoes de cambio BR (GRATIS, sem chave).
import { fetchJSON } from './http'
import { usdBrl30d, mockExchangeLast } from '../data/mockData'

const BASE = 'https://economia.awesomeapi.com.br'

// Serie diaria USD-BRL dos ultimos N dias
export async function fetchUsdBrlSeries(days = 30) {
  try {
    const data = await fetchJSON(`${BASE}/json/daily/USD-BRL/${days}`, {}, { timeout: 10000, retries: 1 })
    const rows = (data || [])
      .map((d) => {
        const ts = Number(d.timestamp) * 1000
        const date = new Date(ts)
        return {
          date: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
          value: Number(Number(d.bid).toFixed(3)),
        }
      })
      .reverse()
    if (!rows.length) throw new Error('Sem dados de cambio')
    return { data: rows, source: 'live' }
  } catch (err) {
    console.warn(`AwesomeAPI indisponivel, usando mock: ${err.message}`)
    return { data: usdBrl30d, source: 'demo' }
  }
}

// Ultima cotacao USD-BRL e EUR-BRL
export async function fetchLastExchange() {
  try {
    const data = await fetchJSON(`${BASE}/last/USD-BRL,EUR-BRL`, {}, { timeout: 8000, retries: 1 })
    if (!data?.USDBRL) throw new Error('Sem cotacao')
    return { data, source: 'live' }
  } catch (err) {
    console.warn(`AwesomeAPI (last) indisponivel, usando mock: ${err.message}`)
    return { data: mockExchangeLast, source: 'demo' }
  }
}
