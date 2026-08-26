import { request, registerMock } from './client'
import { rankItems } from '../utils/semanticSearch'
import { todayNews, archiveSeeds, CATEGORIES } from '../data/mockData'
import { dossiers } from '../data/dossiers'
import { riskMatrix, riskCategories, RISK_SEVERITY } from '../data/riskMatrix'
import { strategicPrograms, PROGRAM_FORCES, PROGRAM_STATUS } from '../data/strategicPrograms'
import { narratives } from '../data/narratives'
import { sourceReliability, reliabilityTier } from '../data/sourceReliability'
import { calendarEvents, CAL_TYPES } from '../data/strategicCalendar'
import { legislativeItems, LEG_STAGE } from '../data/legislative'
import { glossary } from '../data/learnData'
import { blueAmazonThreats } from '../data/blueAmazon'
import { borderSegments } from '../data/borderData'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// BUSCA GLOBAL
//
// Num produto de inteligência, a pergunta raramente chega organizada por
// módulo: alguém busca "Essequibo" e o que interessa é o dossiê, o risco, a
// narrativa e o evento de agenda — juntos, ordenados por relevância.
//
// Cada resultado declara a CAPACIDADE necessária para abri-lo. A busca não
// esconde o que existe: mostra o item e sinaliza que está bloqueado, para que
// a pessoa saiba que a informação existe e qual é o caminho até ela.
//
//   GET /search  ?q&types&limit
// -----------------------------------------------------------------------------

/** Tipos indexados, na ordem em que aparecem nos resultados. */
export const SEARCH_TYPES = [
  { id: 'noticia', label: 'Notícias', icon: 'Newspaper', to: '/clipping', capability: 'news.read' },
  { id: 'dossie', label: 'Dossiês', icon: 'Layers', to: '/dossies', capability: 'analysis.preview' },
  { id: 'risco', label: 'Riscos', icon: 'ShieldAlert', to: '/riscos', capability: 'risk.access' },
  { id: 'programa', label: 'Programas', icon: 'Target', to: '/programas', capability: 'programs.read' },
  { id: 'narrativa', label: 'Narrativas', icon: 'Radio', to: '/narrativas', capability: 'narratives.access' },
  { id: 'fonte', label: 'Fontes', icon: 'BadgeCheck', to: '/fontes', capability: 'sources.reliability' },
  { id: 'evento', label: 'Agenda', icon: 'CalendarDays', to: '/calendario', capability: 'calendar.read' },
  { id: 'proposicao', label: 'Legislativo', icon: 'Landmark', to: '/legislativo', capability: 'legislative.access' },
  { id: 'clipping', label: 'Arquivo', icon: 'Archive', to: '/arquivo', capability: 'news.read' },
  { id: 'termo', label: 'Glossário', icon: 'BookOpen', to: '/aprender', capability: null },
  { id: 'modulo', label: 'Módulos', icon: 'Compass', to: '/painel', capability: null },
]

const typeMeta = (id) => SEARCH_TYPES.find((t) => t.id === id)

// Módulos da plataforma, para que a busca também sirva de navegação.
const MODULES = [
  { id: 'mod-painel', title: 'Painel de situação', to: '/painel', text: 'visão geral alerta tensão indicadores', capability: 'dashboard.basic' },
  { id: 'mod-clipping', title: 'Clipping Diário', to: '/clipping', text: 'notícias resumo IA urgência do dia', capability: 'news.read' },
  { id: 'mod-analise', title: 'Análise Semanal', to: '/analise', text: 'cenários base otimista adverso recomendações', capability: 'analysis.preview' },
  { id: 'mod-riscos', title: 'Matriz de Riscos', to: '/riscos', text: 'probabilidade impacto severidade mitigação', capability: 'risk.access' },
  { id: 'mod-narrativas', title: 'Monitor de Narrativas', to: '/narrativas', text: 'FIMI desinformação sentimento coordenação', capability: 'narratives.access' },
  { id: 'mod-dossies', title: 'Dossiês "Em Foco"', to: '/dossies', text: 'análise aprofundada contexto impacto', capability: 'analysis.preview' },
  { id: 'mod-programas', title: 'Programas Estratégicos', to: '/programas', text: 'PROSUB FX-2 Tamandaré Guarani SGDC aquisição', capability: 'programs.read' },
  { id: 'mod-azul', title: 'Amazônia Azul', to: '/amazonia-azul', text: 'ZEE mar pré-sal SisGAAz patrulha naval', capability: 'programs.read' },
  { id: 'mod-fronteiras', title: 'Fronteiras & Amazônia', to: '/fronteiras', text: 'SISFRON faixa de fronteira Ágata garimpo narcotráfico', capability: 'programs.read' },
  { id: 'mod-balanca', title: 'Balança Militar', to: '/balanca-militar', text: 'comparativo regional efetivo orçamento capacidades', capability: 'programs.read' },
  { id: 'mod-bid', title: 'Base Industrial de Defesa', to: '/industria', text: 'Embraer Avibras exportação nacionalização BID', capability: 'programs.read' },
  { id: 'mod-mesa', title: 'Mesa de trabalho do Analista', to: '/mesa', text: 'fila produção RFI plano de coleta PIR EEI', capability: 'workbench.access' },
  { id: 'mod-relatorios', title: 'Central de Relatórios', to: '/relatorios', text: 'briefing exportar PDF CSV emissão', capability: 'reports.export' },
  { id: 'mod-fontes', title: 'Confiabilidade das Fontes', to: '/fontes', text: 'OSINT avaliação credibilidade veículos', capability: 'sources.reliability' },
  { id: 'mod-agenda', title: 'Calendário Estratégico', to: '/calendario', text: 'exercícios feiras marcos diplomacia', capability: 'calendar.read' },
  { id: 'mod-economia', title: 'Economia & Defesa', to: '/economia', text: 'câmbio orçamento PIB indicadores macro', capability: 'indicators.basic' },
  { id: 'mod-aprender', title: 'Centro Educacional', to: '/aprender', text: 'trilhas glossário quiz vídeo-aulas biblioteca', capability: 'education.access' },
  { id: 'mod-admin', title: 'Console de Governança', to: '/admin', text: 'contas papéis auditoria integrações saúde', capability: 'admin.access' },
]

/**
 * Normaliza cada domínio para um registro de busca uniforme.
 * A busca não precisa conhecer o formato de cada módulo — só este contrato.
 */
function buildIndex() {
  const records = []

  todayNews.forEach((n) => records.push({
    id: `noticia-${n.id}`, type: 'noticia', title: n.title,
    subtitle: `${n.source} · ${n.category}`, snippet: n.summary,
    to: '/clipping', badge: n.urgency,
    fields: [
      { text: n.title, weight: 5 },
      { text: n.category, weight: 3 },
      { text: n.summary, weight: 2 },
      { text: (n.actors || []).join(' '), weight: 2 },
      { text: n.region || '', weight: 2 },
    ],
  }))

  dossiers.forEach((d) => records.push({
    id: `dossie-${d.id}`, type: 'dossie', title: d.title,
    subtitle: `${d.region} · risco ${d.risk}`, snippet: d.summary,
    to: '/dossies', badge: d.risk,
    fields: [
      { text: d.title, weight: 5 },
      { text: d.kicker, weight: 3 },
      { text: d.region, weight: 3 },
      { text: d.summary, weight: 2 },
      { text: d.context, weight: 1 },
      { text: (d.keyPoints || []).join(' '), weight: 1 },
    ],
  }))

  riskMatrix.forEach((r) => records.push({
    id: `risco-${r.id}`, type: 'risco', title: r.title,
    subtitle: `${riskCategories.find((c) => c.id === r.category)?.label || r.category} · ${RISK_SEVERITY[r.severity]?.label}`,
    snippet: r.description, to: '/riscos', badge: RISK_SEVERITY[r.severity]?.label,
    fields: [
      { text: r.title, weight: 5 },
      { text: r.description, weight: 2 },
      { text: (r.drivers || []).join(' '), weight: 1 },
      { text: (r.indicators || []).join(' '), weight: 1 },
      { text: r.impactBR, weight: 2 },
      { text: r.owner, weight: 2 },
    ],
  }))

  strategicPrograms.forEach((p) => records.push({
    id: `programa-${p.id}`, type: 'programa', title: `${p.name} — ${p.full}`,
    subtitle: `${PROGRAM_FORCES[p.force]?.label || p.force} · ${PROGRAM_STATUS[p.status]?.label || p.status} · ${p.progress}%`,
    snippet: p.objective, to: '/programas', badge: `${p.progress}%`,
    fields: [
      { text: p.name, weight: 5 },
      { text: p.full, weight: 4 },
      { text: p.objective, weight: 2 },
      { text: p.partner || '', weight: 2 },
      { text: p.impact || '', weight: 1 },
    ],
  }))

  narratives.forEach((n) => records.push({
    id: `narrativa-${n.id}`, type: 'narrativa', title: n.topic,
    subtitle: `${n.sentiment} · alcance ${n.reach}`, snippet: n.desc,
    to: '/narrativas', badge: n.classification.includes('FIMI') ? 'FIMI' : null,
    fields: [
      { text: n.topic, weight: 5 },
      { text: n.desc, weight: 2 },
      { text: n.classification, weight: 3 },
    ],
  }))

  sourceReliability.forEach((s) => records.push({
    id: `fonte-${s.id}`, type: 'fonte', title: s.name,
    subtitle: `${s.type} · ${reliabilityTier(s.score).label} (${s.score}/100)`,
    snippet: s.note, to: '/fontes', badge: String(s.score),
    fields: [
      { text: s.name, weight: 5 },
      { text: s.type, weight: 3 },
      { text: s.note, weight: 1 },
      { text: s.bias || '', weight: 1 },
    ],
  }))

  calendarEvents.forEach((e) => records.push({
    id: `evento-${e.id}`, type: 'evento', title: e.title,
    subtitle: `${formatDateBR(e.date)} · ${e.scope}`, snippet: e.desc,
    to: '/calendario', badge: CAL_TYPES[e.type]?.label,
    fields: [
      { text: e.title, weight: 5 },
      { text: e.desc, weight: 2 },
      { text: e.scope, weight: 3 },
      { text: CAL_TYPES[e.type]?.label || '', weight: 2 },
    ],
  }))

  legislativeItems.forEach((l) => records.push({
    id: `proposicao-${l.id}`, type: 'proposicao', title: `${l.code} — ${l.title}`,
    subtitle: `${l.house} · ${LEG_STAGE[l.stage]?.label || l.stage}`, snippet: l.summary,
    to: '/legislativo', badge: l.relevance,
    fields: [
      { text: l.code, weight: 5 },
      { text: l.title, weight: 5 },
      { text: l.summary, weight: 2 },
      { text: l.theme, weight: 3 },
      { text: l.impactBR || '', weight: 1 },
    ],
  }))

  archiveSeeds.forEach((c) => records.push({
    id: `clipping-${c.id}`, type: 'clipping', title: c.title,
    subtitle: `${formatDateBR(c.date)} · ${c.newsCount} notícias`, snippet: c.preview,
    to: `/arquivo?q=${encodeURIComponent(c.title)}`, badge: c.alert_level,
    fields: [
      { text: c.title, weight: 4 },
      { text: (c.categories || []).join(' '), weight: 3 },
      { text: c.preview, weight: 2 },
    ],
  }))

  glossary.forEach((g) => records.push({
    id: `termo-${g.term}`, type: 'termo', title: g.term,
    subtitle: g.category, snippet: g.definition,
    to: `/aprender?termo=${encodeURIComponent(g.term)}`, badge: null,
    fields: [
      { text: g.term, weight: 5 },
      { text: g.definition, weight: 2 },
      { text: g.category, weight: 2 },
    ],
  }))

  // Ameaças e segmentos: entram para que buscas temáticas ("pesca ilegal",
  // "tríplice fronteira") encontrem o módulo certo, não apenas o nome dele.
  blueAmazonThreats.forEach((t) => records.push({
    id: `azul-${t.id}`, type: 'modulo', title: `${t.name} — Amazônia Azul`,
    subtitle: `Ameaça monitorada · nível ${t.level}`, snippet: t.desc,
    to: '/amazonia-azul', badge: t.level,
    fields: [{ text: t.name, weight: 5 }, { text: t.desc, weight: 2 }],
  }))

  borderSegments.forEach((sgm) => records.push({
    id: `borda-${sgm.id}`, type: 'modulo', title: `${sgm.name} — Fronteiras`,
    subtitle: `Pressão ${sgm.pressure} · ${sgm.countries}`,
    snippet: `Ameaças predominantes: ${(sgm.threats || []).join(', ')}.`,
    to: '/fronteiras', badge: sgm.pressure,
    fields: [
      { text: sgm.name, weight: 5 },
      { text: sgm.countries, weight: 3 },
      { text: (sgm.threats || []).join(' '), weight: 2 },
    ],
  }))

  MODULES.forEach((m) => records.push({
    id: m.id, type: 'modulo', title: m.title,
    subtitle: 'Módulo da plataforma', snippet: m.text,
    to: m.to, badge: null, capability: m.capability,
    fields: [{ text: m.title, weight: 5 }, { text: m.text, weight: 2 }],
  }))

  return records
}

// O índice é construído uma vez: os repositórios locais são estáticos.
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
    // A capacidade do registro tem prioridade sobre a do tipo (módulos variam).
    capability: item.capability !== undefined ? item.capability : typeMeta(item.type)?.capability,
    score,
  }))

  // Contagem por tipo, preservando a ordem canônica — alimenta os filtros.
  const groups = SEARCH_TYPES
    .map((t) => ({ ...t, count: items.filter((i) => i.type === t.id).length }))
    .filter((g) => g.count > 0)

  return { items, total: items.length, groups, query, indexed: getIndex().length }
})

registerMock('GET /search/suggestions', () => ({
  // Consultas que demonstram o alcance do índice em um clique.
  items: [
    'Essequibo', 'PROSUB', 'Amazônia Azul', 'garimpo ilegal', 'FIMI',
    'ciberataque', 'Gripen', 'tríplice fronteira', 'pesca ilegal', 'orçamento de defesa',
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
