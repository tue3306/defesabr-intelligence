import { request } from './client'

// -----------------------------------------------------------------------------
// NOTÍCIAS
//
// Este arquivo registrava sete resolvedores locais — feed, volume, clipping,
// arquivo, análise semanal e notificações — todos servindo arrays de
// `mockData.js`. Quatro deles alimentavam telas que não existem mais; os
// outros três tinham backend real do outro lado e continuavam sendo servidos
// de dentro do navegador quando ninguém configurava a API.
//
// Restaram os que a interface usa, e todos falam com o servidor.
// -----------------------------------------------------------------------------

export const newsService = {
  /** Feed com filtros: categoria, urgência, texto, período. */
  list: (params) => request('GET /news', { params }),

  /** Volume por dia e categoria — alimenta os gráficos de série. */
  volume: (params) => request('GET /news/volume', { params }),

  /** A edição do período, montada pelo servidor a partir do que foi coletado. */
  latestClipping: (params) => request('GET /clipping/latest', { params }),
}

export default newsService
