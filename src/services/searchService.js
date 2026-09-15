import { request } from './client'
import { glossary } from '../data/learnData'
import { normalize } from '../utils/semanticSearch'

// -----------------------------------------------------------------------------
// BUSCA GLOBAL
//
// `/api/search` procura no banco: notícias coletadas, proposições da Câmara e
// fontes cadastradas. O glossário do Centro Educacional é local e entra aqui,
// no cliente — a tela anunciava que o buscava e não buscava.
//
// A comparação é por trecho, sem acento e sem caixa. Não há sinônimo nem busca
// semântica: "submarino" não encontra "PROSUB" se a palavra não estiver no
// texto, e a tela não diz o contrário.
// -----------------------------------------------------------------------------

/** Tipos de resultado, na ordem em que aparecem. */
export const SEARCH_TYPES = [
  { id: 'noticia', label: 'Notícias', icon: 'Newspaper', to: '/clipping', capability: 'news.read' },
  { id: 'proposicao', label: 'Legislativo', icon: 'Landmark', to: '/legislativo', capability: 'legislative.access' },
  { id: 'termo', label: 'Glossário', icon: 'BookOpen', to: '/aprender' },
  // A página de fontes é de administração; para os demais o resultado aparece
  // marcado como restrito, em vez de levar a uma tela de bloqueio.
  { id: 'fonte', label: 'Fontes', icon: 'Radio', to: '/fontes', capability: 'sources.reliability' },
]

const CAPACIDADE_DO_TIPO = Object.fromEntries(SEARCH_TYPES.map((t) => [t.id, t.capability]))

/**
 * Consultas que exercitam o acervo em um clique.
 *
 * São termos que sabidamente encontram resultado no que a coleta traz.
 */
export const SUGESTOES = [
  'Marinha', 'fragata', 'Amazônia Azul', 'faixa de fronteira', 'Operação Ágata',
  'ciberdefesa', 'Gripen', 'submarino', 'orçamento de defesa', 'Venezuela',
]

function noGlossario(q) {
  const alvo = normalize(q)
  if (alvo.length < 2) return []
  return glossary
    .filter((g) => normalize(`${g.term} ${g.definition}`).includes(alvo))
    .slice(0, 10)
    .map((g) => ({
      id: `termo-${g.term}`,
      type: 'termo',
      typeLabel: 'Glossário',
      title: g.term,
      subtitle: g.category,
      snippet: g.definition,
      badge: null,
      to: `/aprender?termo=${encodeURIComponent(g.term)}`,
    }))
}

export const searchService = {
  /** Banco (notícias, proposições, fontes) + glossário local. */
  query: async ({ q } = {}) => {
    const r = await request('GET /search', { params: { q } })
    const doServidor = r?.data?.items || []
    const itens = [...doServidor, ...noGlossario(q || '')]
      .map((i) => ({ ...i, capability: CAPACIDADE_DO_TIPO[i.type] }))
    const groups = SEARCH_TYPES
      .map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: itens.filter((i) => i.type === t.id).length }))
      .filter((g) => g.count > 0)
    return {
      data: { items: itens, total: itens.length, groups, query: q },
      meta: r?.meta || null,
    }
  },

  /** Termos sugeridos — constante de interface, sem ida ao servidor. */
  suggestions: async () => ({
    data: { items: SUGESTOES },
    meta: { source: 'config', endpoint: 'GET /search/suggestions' },
  }),
}

export default searchService
