import { request, registerMock } from './client'
import { narratives, narrativeSummary, fimiSignals } from '../data/narratives'
import { dossiers } from '../data/dossiers'
import { sourceReliability, reliabilityCriteria } from '../data/sourceReliability'
import { strategicPrograms, programsSummary } from '../data/strategicPrograms'
import { calendarEvents } from '../data/strategicCalendar'
import { legislativeItems } from '../data/legislative'
import { blueAmazonThreats, blueAmazonPillars, navalAssets } from '../data/blueAmazon'
import { borderSegments, borderThreats, borderOperations } from '../data/borderData'
import { militaryBalance, balanceMetrics } from '../data/militaryBalance'
import { bidCompanies, exportProducts } from '../data/defenseIndustry'
import { riskMatrix, riskCategories } from '../data/riskMatrix'

// -----------------------------------------------------------------------------
// SERVIÇO DE INTELIGÊNCIA — os módulos analíticos da plataforma.
//
//   GET /intel/narratives        ?sentiment&fimi&q
//   GET /intel/dossiers          ?risk&region&q
//   GET /intel/dossiers/:id
//   GET /intel/sources           ?tier&q
//   GET /intel/risks             ?category&severity
//   GET /strategic/programs      ?force&status&q
//   GET /strategic/calendar      ?from&to&type
//   GET /strategic/legislative   ?stage&q
//   GET /strategic/blue-amazon
//   GET /strategic/borders
//   GET /strategic/military-balance
//   GET /strategic/industry
// -----------------------------------------------------------------------------

const includes = (haystack, q) => !q || haystack.toLowerCase().includes(q.toLowerCase())

registerMock('GET /intel/narratives', ({ sentiment, fimi, q } = {}) => {
  let items = [...narratives]
  if (sentiment) items = items.filter((n) => n.sentiment === sentiment)
  if (fimi) items = items.filter((n) => n.classification?.includes('FIMI'))
  if (q) items = items.filter((n) => includes(`${n.topic} ${n.desc} ${n.classification}`, q))
  return { items, total: items.length, summary: narrativeSummary, signals: fimiSignals }
})

registerMock('GET /intel/dossiers', ({ risk, region, q } = {}) => {
  let items = [...dossiers]
  if (risk) items = items.filter((d) => d.risk === risk)
  if (region) items = items.filter((d) => d.region === region)
  if (q) items = items.filter((d) => includes(`${d.title} ${d.summary} ${d.context}`, q))
  return { items, total: items.length }
})

registerMock('GET /intel/dossiers/:id', ({ id } = {}) => {
  const found = dossiers.find((d) => d.id === id)
  if (!found) throw new Error(`Dossiê não encontrado: ${id}`)
  return found
})

registerMock('GET /intel/sources', ({ tier, q } = {}) => {
  let items = [...sourceReliability]
  if (tier) items = items.filter((s) => s.tier === tier)
  if (q) items = items.filter((s) => includes(`${s.name} ${s.type || ''}`, q))
  return { items, total: items.length, criteria: reliabilityCriteria }
})

registerMock('GET /intel/risks', ({ category, severity } = {}) => {
  let items = [...riskMatrix]
  if (category) items = items.filter((r) => r.category === category)
  if (severity) items = items.filter((r) => r.severity === severity)
  return { items, total: items.length, categories: riskCategories }
})

registerMock('GET /strategic/programs', ({ force, status, q } = {}) => {
  let items = [...strategicPrograms]
  if (force) items = items.filter((p) => p.force === force)
  if (status) items = items.filter((p) => p.status === status)
  if (q) items = items.filter((p) => includes(`${p.name} ${p.full} ${p.objective}`, q))
  return { items, total: items.length, summary: programsSummary }
})

registerMock('GET /strategic/calendar', ({ from, to, type } = {}) => {
  let items = [...calendarEvents]
  if (from) items = items.filter((e) => e.date >= from)
  if (to) items = items.filter((e) => e.date <= to)
  if (type) items = items.filter((e) => e.type === type)
  return { items: items.sort((a, b) => a.date.localeCompare(b.date)), total: items.length }
})

registerMock('GET /strategic/legislative', ({ stage, q } = {}) => {
  let items = [...legislativeItems]
  if (stage) items = items.filter((l) => l.stage === stage)
  if (q) items = items.filter((l) => includes(`${l.title} ${l.summary || ''} ${l.id}`, q))
  return { items, total: items.length }
})

registerMock('GET /strategic/blue-amazon', () => ({
  threats: blueAmazonThreats,
  pillars: blueAmazonPillars,
  assets: navalAssets,
}))

registerMock('GET /strategic/borders', () => ({
  segments: borderSegments,
  threats: borderThreats,
  operations: borderOperations,
}))

registerMock('GET /strategic/military-balance', () => ({
  countries: militaryBalance,
  metrics: balanceMetrics,
}))

registerMock('GET /strategic/industry', () => ({
  companies: bidCompanies,
  exports: exportProducts,
}))

export const intelligenceService = {
  narratives: (params) => request('GET /intel/narratives', { params }),
  dossiers: (params) => request('GET /intel/dossiers', { params }),
  dossier: (id) => request('GET /intel/dossiers/:id', { params: { id } }),
  sources: (params) => request('GET /intel/sources', { params }),
  risks: (params) => request('GET /intel/risks', { params }),
  programs: (params) => request('GET /strategic/programs', { params }),
  calendar: (params) => request('GET /strategic/calendar', { params }),
  legislative: (params) => request('GET /strategic/legislative', { params }),
  blueAmazon: () => request('GET /strategic/blue-amazon'),
  borders: () => request('GET /strategic/borders'),
  militaryBalance: () => request('GET /strategic/military-balance'),
  industry: () => request('GET /strategic/industry'),
}

export default intelligenceService
