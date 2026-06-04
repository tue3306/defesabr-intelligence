// World Bank API — gastos militares (GRATIS, sem chave).
import { fetchJSON } from './http'
import { militarySpendingBR, militaryPctGdpComparison } from '../data/mockData'

const BASE = 'https://api.worldbank.org/v2'

// Gasto militar do Brasil em USD corrente (MS.MIL.XPND.CD) — historico.
export async function fetchBrazilMilitarySpending() {
  try {
    const url = `${BASE}/country/BR/indicator/MS.MIL.XPND.CD?format=json&per_page=30`
    const data = await fetchJSON(url, {}, { timeout: 10000, retries: 1 })
    const rows = (data?.[1] || [])
      .filter((d) => d.value != null)
      .map((d) => ({ year: Number(d.date), usd: Number((d.value / 1e9).toFixed(1)) }))
      .sort((a, b) => a.year - b.year)
    if (!rows.length) throw new Error('Sem dados World Bank')
    // mescla com BRL/pctGdp do mock (World Bank nao fornece BRL diretamente)
    const merged = militarySpendingBR.map((m) => {
      const live = rows.find((r) => r.year === m.year)
      return live ? { ...m, usd: live.usd } : m
    })
    return { data: merged, source: 'live' }
  } catch (err) {
    console.warn(`World Bank indisponivel, usando mock: ${err.message}`)
    return { data: militarySpendingBR, source: 'demo' }
  }
}

// Comparacao internacional % do PIB (MS.MIL.XPND.GD.ZS)
export async function fetchPctGdpComparison() {
  try {
    const url = `${BASE}/country/BR;US;CN;RU;DE;FR;GB/indicator/MS.MIL.XPND.GD.ZS?format=json&per_page=100&mrv=1`
    const data = await fetchJSON(url, {}, { timeout: 10000, retries: 1 })
    const names = { BR: 'Brasil', US: 'EUA', CN: 'China', RU: 'Rússia', DE: 'Alemanha', FR: 'França', GB: 'Reino Unido' }
    const rows = (data?.[1] || [])
      .filter((d) => d.value != null)
      .map((d) => ({
        country: names[d.countryiso3code] || names[d.country?.id] || d.country?.value,
        code: d.country?.id,
        pctGdp: Number(d.value.toFixed(1)),
      }))
    if (!rows.length) throw new Error('Sem dados comparativos')
    return { data: rows, source: 'live' }
  } catch (err) {
    console.warn(`World Bank (comparacao) indisponivel, usando mock: ${err.message}`)
    return { data: militaryPctGdpComparison, source: 'demo' }
  }
}
