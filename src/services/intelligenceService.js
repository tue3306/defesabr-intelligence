import { request } from './client'

// -----------------------------------------------------------------------------
// INTELIGÊNCIA
//
// Dois recursos, ambos com backend real:
//
//   /intel/sources           fontes e a disponibilidade MEDIDA de cada uma
//   /strategic/legislative   proposições da API de Dados Abertos da Câmara
//
// Os resolvedores locais que ficavam aqui foram removidos junto com o "modo
// demonstração": eles serviam listas escritas à mão sempre que a API não
// estivesse configurada, o que era o padrão.
// -----------------------------------------------------------------------------

export const intelligenceService = {
  sources: (params) => request('GET /intel/sources', { params }),
  legislative: (params) => request('GET /strategic/legislative', { params }),
}

export default intelligenceService
