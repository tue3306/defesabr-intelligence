import { request, registerMock, listMockEndpoints } from './client'
import {
  systemHealth, integrations, ingestion, platformMetrics, auditLog,
  platformUsers, platformPlans, contentCategories, platformUsage,
} from '../data/adminData'
import { monitoredSources, sourcesByCategory, sourceStatusSummary } from '../data/monitoredSources'
import { DATA_MODE, API_BASE_URL, APP_VERSION } from './config'

// -----------------------------------------------------------------------------
// SERVIÇO DE GOVERNANÇA (perfil Administrador)
//
//   GET   /admin/overview
//   GET   /admin/users        ?q&role&plan&status
//   PATCH /admin/users/:id    { role, plan, status }
//   GET   /admin/sources      ?category&status
//   GET   /admin/audit        ?level&actor&q
//   GET   /admin/health
//   GET   /admin/diagnostics
// -----------------------------------------------------------------------------

registerMock('GET /admin/overview', () => ({
  metrics: platformMetrics,
  usage: platformUsage,
  plans: platformPlans,
  categories: contentCategories,
  ingestion,
  integrations,
}))

registerMock('GET /admin/users', ({ q, role, plan, status } = {}) => {
  let items = [...platformUsers]
  if (role) items = items.filter((u) => u.role === role)
  if (plan) items = items.filter((u) => u.plan === plan)
  if (status) items = items.filter((u) => u.status === status)
  if (q) {
    const needle = q.toLowerCase()
    items = items.filter((u) => `${u.name} ${u.email} ${u.unit || ''}`.toLowerCase().includes(needle))
  }
  return { items, total: items.length }
})

registerMock('GET /admin/sources', ({ category, status } = {}) => {
  let items = [...monitoredSources]
  if (category) items = items.filter((s) => s.category === category)
  if (status) items = items.filter((s) => s.status === status)
  return {
    items,
    total: items.length,
    byCategory: sourcesByCategory(),
    summary: sourceStatusSummary(),
  }
})

registerMock('GET /admin/audit', ({ level, actor, q } = {}) => {
  let items = [...auditLog]
  if (level) items = items.filter((e) => e.level === level)
  if (actor) items = items.filter((e) => e.actor === actor)
  if (q) {
    const needle = q.toLowerCase()
    items = items.filter((e) => `${e.action} ${e.target} ${e.actor}`.toLowerCase().includes(needle))
  }
  return { items, total: items.length }
})

registerMock('GET /admin/health', () => ({
  services: systemHealth,
  operational: systemHealth.filter((s) => s.status === 'operational').length,
  total: systemHealth.length,
}))

registerMock('GET /admin/diagnostics', () => ({
  mode: DATA_MODE,
  apiBaseUrl: API_BASE_URL || null,
  version: APP_VERSION,
  endpoints: listMockEndpoints(),
  browser: typeof navigator !== 'undefined' ? navigator.userAgent : '—',
  storage: typeof localStorage !== 'undefined'
    ? Object.keys(localStorage).filter((k) => k.startsWith('defesabr-'))
    : [],
}))

export const adminService = {
  overview: () => request('GET /admin/overview'),
  users: (params) => request('GET /admin/users', { params }),
  sources: (params) => request('GET /admin/sources', { params }),
  audit: (params) => request('GET /admin/audit', { params }),
  health: () => request('GET /admin/health'),
  diagnostics: () => request('GET /admin/diagnostics'),
}

export default adminService
