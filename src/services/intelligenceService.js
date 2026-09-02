import { request, registerMock } from './client'
import { sourceReliability, reliabilityCriteria } from '../data/sourceReliability'
import { legislativeItems } from '../data/legislative'

// -----------------------------------------------------------------------------
// INTELIGÊNCIA — o que sobrou depois da limpeza
//
// Este serviço registrava nove endpoints. Sete deles serviam telas cujo
// conteúdo era redigido à mão: dossiês, matriz de riscos, monitor de
// narrativas, programas estratégicos, calendário. Nenhum tinha fonte pública
// que o alimentasse, e todos foram removidos junto com as telas.
//
// Ficaram os dois que têm backend de verdade:
//
//   /intel/sources           fontes e sua disponibilidade MEDIDA
//   /strategic/legislative   proposições da API da Câmara
//
// Ambos passam pela ponte (`apiBridge`) antes de chegar aqui. Os resolvedores
// abaixo só entram em cena quando o servidor está fora do ar — e nesse caso a
// tela marca a origem como reserva, não como dado ao vivo.
// -----------------------------------------------------------------------------

const includes = (haystack, needle) =>
  String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase())

registerMock('GET /intel/sources', ({ tier, q } = {}) => {
  let items = [...sourceReliability]
  if (tier) items = items.filter((s) => s.tier === tier)
  if (q) items = items.filter((s) => includes(`${s.name} ${s.type || ''}`, q))
  return { items, total: items.length, criteria: reliabilityCriteria }
})

registerMock('GET /strategic/legislative', ({ stage, q } = {}) => {
  let items = [...legislativeItems]
  if (stage) items = items.filter((i) => i.stage === stage)
  if (q) items = items.filter((i) => includes(`${i.code} ${i.title} ${i.summary}`, q))
  return { items, total: items.length }
})

export const intelligenceService = {
  sources: (params) => request('GET /intel/sources', { params }),
  legislative: (params) => request('GET /strategic/legislative', { params }),
}

export default intelligenceService
