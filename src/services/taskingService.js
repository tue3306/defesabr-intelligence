import { request, registerMock } from './client'
import {
  productionQueue, informationRequests, collectionPlan, workbenchSummary,
} from '../data/tasking'

// -----------------------------------------------------------------------------
// SERVIÇO DA MESA DE TRABALHO (perfil Analista)
//
//   GET   /workbench/summary
//   GET   /workbench/queue        ?stage&priority&q
//   PATCH /workbench/queue/:id    { stage }
//   GET   /workbench/rfi          ?status&priority
//   GET   /workbench/collection
// -----------------------------------------------------------------------------

registerMock('GET /workbench/summary', () => workbenchSummary)

registerMock('GET /workbench/queue', ({ stage, priority, q } = {}) => {
  let items = [...productionQueue]
  if (stage) items = items.filter((p) => p.stage === stage)
  if (priority) items = items.filter((p) => p.priority === priority)
  if (q) {
    const needle = q.toLowerCase()
    items = items.filter((p) => `${p.title} ${p.summary} ${p.type}`.toLowerCase().includes(needle))
  }
  return { items, total: items.length }
})

registerMock('GET /workbench/rfi', ({ status, priority } = {}) => {
  let items = [...informationRequests]
  if (status) items = items.filter((r) => r.status === status)
  if (priority) items = items.filter((r) => r.priority === priority)
  return { items, total: items.length }
})

registerMock('GET /workbench/collection', () => ({
  items: collectionPlan,
  total: collectionPlan.length,
}))

export const taskingService = {
  summary: () => request('GET /workbench/summary'),
  queue: (params) => request('GET /workbench/queue', { params }),
  requests: (params) => request('GET /workbench/rfi', { params }),
  collection: () => request('GET /workbench/collection'),
}

export default taskingService
