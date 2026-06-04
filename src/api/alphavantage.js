// Alpha Vantage — acoes do setor defesa (GRATIS, 25 req/dia). apikey=demo
// retorna dados de exemplo (IBM). Sempre ha fallback para mock.
import { fetchJSON } from './http'
import { defenseStocks } from '../data/mockData'

const BASE = 'https://www.alphavantage.co/query'

function getKey() {
  return import.meta.env.VITE_ALPHAVANTAGE_KEY || 'demo'
}

export async function fetchStockDaily(symbol) {
  try {
    const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${getKey()}`
    const data = await fetchJSON(url, {}, { timeout: 10000, retries: 1 })
    const series = data?.['Time Series (Daily)']
    if (!series) throw new Error('Sem serie diaria')
    const dates = Object.keys(series).sort().slice(-7)
    const closes = dates.map((d) => Number(series[d]['4. close']))
    const price = closes[closes.length - 1]
    const prev = closes[closes.length - 2] || price
    return {
      data: {
        ticker: symbol,
        price: Number(price.toFixed(2)),
        change: Number((((price - prev) / prev) * 100).toFixed(2)),
        spark: closes,
      },
      source: 'live',
    }
  } catch (err) {
    console.warn(`Alpha Vantage indisponivel (${symbol}), usando mock: ${err.message}`)
    const mock = defenseStocks.find((s) => s.ticker === symbol) || defenseStocks[0]
    return { data: mock, source: 'demo' }
  }
}

export async function fetchDefensePortfolio() {
  // Para nao estourar o limite de 25 req/dia, usamos o portfolio mockado por
  // padrao e marcamos como demonstrativo.
  return { data: defenseStocks, source: 'demo' }
}
