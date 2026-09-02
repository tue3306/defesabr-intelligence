import { request } from './client'

// -----------------------------------------------------------------------------
// BUSCA GLOBAL
//
// Havia aqui um índice montado no navegador, sobre nove domínios de conteúdo
// local. Cinco deles saíram do produto por serem texto escrito à mão, e os
// quatro que sobraram têm busca de verdade do outro lado: `/api/search` procura
// no banco, sobre as notícias coletadas e as proposições da Câmara.
//
// Manter os dois era pior que escolher um. O índice local encontrava coisas
// que o servidor não tem e deixava de encontrar o que ele tem — a mesma
// consulta dava resultados diferentes dependendo de um detalhe de configuração
// que ninguém via.
// -----------------------------------------------------------------------------

/** Tipos que a API devolve, na ordem em que aparecem nos resultados. */
export const SEARCH_TYPES = [
  { id: 'noticia', label: 'Notícias', icon: 'Newspaper', to: '/clipping', capability: 'news.read' },
  { id: 'proposicao', label: 'Legislativo', icon: 'Landmark', to: '/legislativo', capability: 'legislative.access' },
]

/**
 * Consultas que exercitam o acervo em um clique.
 *
 * É configuração de interface, não dado: são termos que sabidamente encontram
 * resultado no que a coleta traz. Sugerir um termo que não acha nada seria
 * pior que não sugerir.
 */
export const SUGESTOES = [
  'Marinha', 'fragata', 'Amazônia Azul', 'faixa de fronteira', 'Operação Ágata',
  'ciberdefesa', 'Gripen', 'submarino', 'orçamento de defesa', 'Venezuela',
]

export const searchService = {
  /** Busca no banco: notícias coletadas e proposições. */
  query: (params) => request('GET /search', { params }),

  /** Termos sugeridos — constante de interface, sem ida ao servidor. */
  suggestions: async () => ({
    data: { items: SUGESTOES },
    meta: { source: 'config', endpoint: 'GET /search/suggestions' },
  }),
}

export default searchService
