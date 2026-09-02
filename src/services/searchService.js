import { request, registerMock } from './client'
import { rankItems } from '../utils/semanticSearch'
import { todayNews, archiveSeeds, CATEGORIES } from '../data/mockData'
import { legislativeItems, LEG_STAGE } from '../data/legislative'
import { sourceReliability, reliabilityTier } from '../data/sourceReliability'
import { glossary } from '../data/learnData'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// BUSCA GLOBAL
//
// Numa plataforma de inteligência a pergunta raramente chega organizada por
// módulo: alguém digita "Essequibo" e o que interessa é a notícia, a proposição
// e o verbete — juntos, ordenados por relevância.
//
// Cada resultado declara a CAPACIDADE necessária para abri-lo. A busca não
// esconde o que existe: mostra o item e sinaliza que está bloqueado, para que
// a pessoa saiba que a informação existe e qual é o caminho até ela.
//
// O ÍNDICE ENCOLHEU, e isso é a mudança que importa aqui. Ele cobria nove
// domínios; cinco deles (dossiês, riscos, programas, narrativas, agenda) eram
// conteúdo redigido à mão e saíram do produto. Buscar sobre eles devolvia
// resultado que parecia inteligência e era texto de exemplo.
//
// Este resolvedor local só entra quando o servidor está fora: a busca de
// verdade roda em `/api/search`, direto no banco de notícias e proposições
// coletadas.
//
//   GET /search  ?q&types&limit
// -----------------------------------------------------------------------------

/** Tipos indexados, na ordem em que aparecem nos resultados. */
export const SEARCH_TYPES = [
  { id: 'noticia', label: 'Notícias', icon: 'Newspaper', to: '/clipping', capability: 'news.read' },
  { id: 'proposicao', label: 'Legislativo', icon: 'Landmark', to: '/legislativo', capability: 'legislative.access' },
  { id: 'fonte', label: 'Fontes', icon: 'BadgeCheck', to: '/fontes', capability: 'sources.reliability' },
  { id: 'clipping', label: 'Arquivo', icon: 'Archive', to: '/arquivo', capability: 'news.read' },
  { id: 'verbete', label: 'Glossário', icon: 'BookOpen', to: '/aprender', capability: null },
]

const typeMeta = (id) => SEARCH_TYPES.find((t) => t.id === id)

/**
 * Índice montado uma vez, sob demanda.
 *
 * `fields` é o texto que o ranqueador lê; `snippet` é o que a tela exibe. Os
 * dois são separados de propósito: dá para indexar mais do que se mostra.
 */
function buildIndex() {
  const registros = []

  for (const n of [...todayNews, ...archiveSeeds]) {
    registros.push({
      id: `noticia-${n.id}`,
      type: 'noticia',
      title: n.title,
      subtitle: `${n.source || 'Fonte'} · ${n.category || ''}`.trim(),
      snippet: n.summary,
      to: '/clipping',
      badge: n.urgency,
      fields: `${n.title} ${n.summary || ''} ${n.category || ''} ${n.source || ''}`,
    })
  }

  for (const p of legislativeItems) {
    registros.push({
      id: `proposicao-${p.id}`,
      type: 'proposicao',
      title: `${p.code} — ${p.title}`,
      subtitle: `${p.house} · ${LEG_STAGE[p.stage]?.label || p.stage}`,
      snippet: p.summary,
      to: '/legislativo',
      fields: `${p.code} ${p.title} ${p.summary || ''} ${p.theme || ''}`,
    })
  }

  for (const f of sourceReliability) {
    registros.push({
      id: `fonte-${f.id}`,
      type: 'fonte',
      title: f.name,
      subtitle: `${f.type || ''} · ${reliabilityTier(f.score)?.label || ''}`.trim(),
      snippet: f.note,
      to: '/fontes',
      fields: `${f.name} ${f.type || ''} ${f.note || ''}`,
    })
  }

  for (const g of glossary) {
    registros.push({
      id: `verbete-${g.term}`,
      type: 'verbete',
      title: g.term,
      subtitle: 'Glossário',
      snippet: g.definition,
      to: '/aprender',
      capability: null,
      fields: `${g.term} ${g.definition || ''}`,
    })
  }

  return registros
}

let INDEX = null
const getIndex = () => (INDEX || (INDEX = buildIndex()))

registerMock('GET /search', ({ q, types, limit = 40 } = {}) => {
  const query = (q || '').trim()
  if (!query) {
    return { items: [], total: 0, groups: [], query: '', indexed: getIndex().length }
  }

  let pool = getIndex()
  const wanted = Array.isArray(types) ? types : types ? [types] : []
  if (wanted.length) pool = pool.filter((r) => wanted.includes(r.type))

  const ranked = rankItems(query, pool, (r) => r.fields).slice(0, limit)

  const items = ranked.map(({ item, score }) => ({
    id: item.id,
    type: item.type,
    typeLabel: typeMeta(item.type)?.label || item.type,
    title: item.title,
    subtitle: item.subtitle,
    snippet: item.snippet,
    to: item.to,
    badge: item.badge,
    // A capacidade do registro tem prioridade sobre a do tipo.
    capability: item.capability !== undefined ? item.capability : typeMeta(item.type)?.capability,
    score,
  }))

  const groups = SEARCH_TYPES
    .map((t) => ({ ...t, count: items.filter((i) => i.type === t.id).length }))
    .filter((g) => g.count > 0)

  return { items, total: items.length, groups, query, indexed: getIndex().length }
})

registerMock('GET /search/suggestions', () => ({
  // Consultas que exercitam o índice em um clique. Todas devolvem resultado
  // no acervo coletado — sugerir um termo que não acha nada seria pior que
  // não sugerir.
  items: [
    'Marinha', 'fragata', 'Amazônia Azul', 'faixa de fronteira', 'Operação Ágata',
    'ciberdefesa', 'Gripen', 'submarino', 'orçamento de defesa', 'Venezuela',
  ],
  categories: CATEGORIES,
}))

export const searchService = {
  /** Busca global. `types` restringe a domínios (ver SEARCH_TYPES). */
  query: (params) => request('GET /search', { params }),
  suggestions: () => request('GET /search/suggestions'),
  /** Tamanho do índice — exibido na tela de busca e no diagnóstico. */
  indexSize: () => getIndex().length,
}

export default searchService
