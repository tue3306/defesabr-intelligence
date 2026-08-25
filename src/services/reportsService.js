import { request, registerMock } from './client'
import {
  reportTemplates, reportHistory, reportSchedules, REPORT_FORMATS, REPORT_PERIODS,
} from '../data/reports'
import { riskMatrix, RISK_METHODOLOGY, riskSummary } from '../data/riskMatrix'
import { strategicPrograms, PROGRAM_FORCES, PROGRAM_STATUS } from '../data/strategicPrograms'
import { borderSegments, borderThreats, borderOperations, borderResults } from '../data/borderData'
import { narratives, fimiSignals } from '../data/narratives'
import { blueAmazonPillars, blueAmazonThreats, navalAssets } from '../data/blueAmazon'
import { mockDailyClipping } from '../data/mockData'

// -----------------------------------------------------------------------------
// SERVIÇO DE RELATÓRIOS
//
//   GET  /reports/templates
//   GET  /reports/history       ?template&format
//   GET  /reports/schedules
//   POST /reports/compose       { template, sections, period }
//
// `compose` devolve o DOCUMENTO MONTADO (título, metadados e seções resolvidas).
// A renderização em PDF/CSV/JSON acontece em src/utils/exportUtils.js — o
// serviço entrega apenas o conteúdo, sem conhecer o formato de saída.
// -----------------------------------------------------------------------------

registerMock('GET /reports/templates', () => ({
  items: reportTemplates,
  formats: REPORT_FORMATS,
  periods: REPORT_PERIODS,
}))

registerMock('GET /reports/history', ({ template, format } = {}) => {
  let items = [...reportHistory]
  if (template) items = items.filter((r) => r.template === template)
  if (format) items = items.filter((r) => r.format === format)
  return { items, total: items.length }
})

registerMock('GET /reports/schedules', () => ({ items: reportSchedules }))

// ── Resolvedores de seção: cada um devolve { label, type, rows|text|bullets } ──
const SECTION_RESOLVERS = {
  // Briefing executivo
  postura: () => ({
    type: 'text',
    text:
      `Nível de alerta do período: ${mockDailyClipping.alert_level}. ` +
      (mockDailyClipping.summary_executive || '').split('\n').filter(Boolean)[0],
  }),
  destaques: () => ({
    type: 'table',
    columns: ['Título', 'Categoria', 'Urgência', 'Região'],
    rows: (mockDailyClipping.news || []).slice(0, 8).map((n) => ({
      Título: n.title,
      Categoria: n.category,
      Urgência: n.urgency,
      Região: n.region || '—',
    })),
  }),
  tensao: (ctx) => ({
    type: 'table',
    columns: ['Região', 'Nível', 'Justificativa'],
    rows: (ctx?.regions || []).map((r) => ({
      Região: r.region,
      Nível: `${r.level}/100`,
      Justificativa: r.justification,
    })),
  }),
  observar: () => ({
    type: 'bullets',
    bullets: mockDailyClipping.trends || [],
  }),

  // Avaliação de riscos
  matriz: () => ({
    type: 'table',
    columns: ['Risco', 'Categoria', 'Probabilidade', 'Impacto', 'Severidade', 'Tendência'],
    rows: riskMatrix.map((r) => ({
      Risco: r.title,
      Categoria: r.category,
      Probabilidade: r.probability,
      Impacto: r.impact,
      Severidade: r.severity,
      Tendência: r.trend,
    })),
  }),
  metodologia: () => ({ type: 'bullets', bullets: RISK_METHODOLOGY }),
  detalhe: () => ({
    type: 'blocks',
    blocks: riskMatrix.map((r) => ({
      title: `${r.title} — severidade ${r.severity} (${r.score})`,
      text: r.description,
      bullets: [`Horizonte: ${r.horizon}`, `Confiança: ${r.confidence}`, `Impacto para o Brasil: ${r.impactBR}`],
    })),
  }),
  mitigacao: () => ({
    type: 'table',
    columns: ['Risco', 'Medida sugerida'],
    rows: riskMatrix.flatMap((r) => r.mitigations.map((m) => ({ Risco: r.title, 'Medida sugerida': m }))),
  }),

  // Programas estratégicos
  resumo: () => ({
    type: 'table',
    columns: ['Força', 'Programas', 'Avanço médio'],
    rows: Object.entries(PROGRAM_FORCES).map(([key, meta]) => {
      const list = strategicPrograms.filter((p) => p.force === key)
      const avg = list.length ? Math.round(list.reduce((a, p) => a + p.progress, 0) / list.length) : 0
      return { Força: meta.label, Programas: list.length, 'Avanço médio': `${avg}%` }
    }),
  }),
  programas: () => ({
    type: 'table',
    columns: ['Programa', 'Força', 'Situação', 'Avanço', 'Entrega prevista'],
    rows: strategicPrograms.map((p) => ({
      Programa: `${p.name} — ${p.full}`,
      Força: PROGRAM_FORCES[p.force]?.label || p.force,
      Situação: PROGRAM_STATUS[p.status]?.label || p.status,
      Avanço: `${p.progress}%`,
      'Entrega prevista': p.deliveryYear || '—',
    })),
  }),
  orcamento: () => ({
    type: 'table',
    columns: ['Programa', 'Investimento previsto (R$ bi)', 'Início'],
    rows: strategicPrograms.map((p) => ({
      Programa: p.name,
      'Investimento previsto (R$ bi)': p.budgetBRL?.toFixed(1) ?? '—',
      'Início': p.startYear ?? '—',
    })),
  }),
  alertas: () => ({
    type: 'bullets',
    bullets: strategicPrograms
      .filter((p) => p.progress < 40)
      .map((p) => `${p.name}: avanço de ${p.progress}% — acompanhar cronograma físico.`),
  }),

  // Fronteiras
  segmentos: () => ({
    type: 'table',
    columns: ['Segmento', 'Países vizinhos', 'Pressão', 'Ameaças predominantes'],
    rows: borderSegments.map((s) => ({
      Segmento: s.name,
      'Países vizinhos': Array.isArray(s.countries) ? s.countries.join(', ') : s.countries || '—',
      Pressão: s.pressure,
      'Ameaças predominantes': (s.threats || []).join(', ') || '—',
    })),
  }),
  ameacas: (ctx) => {
    const source = ctx?.template === 'dossie-amazonia-azul' ? blueAmazonThreats : borderThreats
    return {
      type: 'table',
      columns: ['Ameaça', 'Nível', 'Descrição'],
      rows: source.map((t) => ({
        Ameaça: t.name,
        Nível: t.level || (t.trend === 'up' ? 'Em alta' : t.trend === 'down' ? 'Em queda' : 'Estável'),
        Descrição: t.desc || '—',
      })),
    }
  },
  operacoes: () => ({
    type: 'table',
    columns: ['Operação', 'Escopo', 'Periodicidade', 'Forças envolvidas'],
    rows: borderOperations.map((o) => ({
      Operação: o.name,
      Escopo: o.scope || '—',
      Periodicidade: o.frequency || '—',
      'Forças envolvidas': o.forces || '—',
    })),
  }),
  resultados: () => ({
    type: 'table',
    columns: ['Indicador', 'Valor'],
    rows: borderResults.map((r) => ({ Indicador: r.label, Valor: r.value })),
  }),

  // Narrativas
  panorama: () => ({
    type: 'table',
    columns: ['Tema', 'Sentimento', 'Alcance', 'Classificação'],
    rows: narratives.map((n) => ({
      Tema: n.topic,
      Sentimento: n.sentiment,
      Alcance: n.reach,
      Classificação: n.classification,
    })),
  }),
  fimi: () => ({
    type: 'table',
    columns: ['Sinal', 'Descrição'],
    rows: fimiSignals.map((s) => ({ Sinal: s.signal, Descrição: s.desc })),
  }),
  recomendacoes: () => ({
    type: 'bullets',
    bullets: [
      'Responder com dados verificáveis nos canais oficiais antes do pico de alcance.',
      'Registrar evidências de coordenação para eventual encaminhamento institucional.',
      'Evitar amplificar o conteúdo original ao contestá-lo.',
    ],
  }),

  // Amazônia Azul
  pilares: () => ({
    type: 'table',
    columns: ['Pilar', 'Descrição'],
    rows: blueAmazonPillars.map((p) => ({ Pilar: p.title, Descrição: p.text })),
  }),
  meios: () => ({
    type: 'table',
    columns: ['Meio', 'Quantidade', 'Observação'],
    rows: navalAssets.map((a) => ({
      Meio: a.type,
      Quantidade: a.count,
      Observação: a.note || '—',
    })),
  }),
}

registerMock('POST /reports/compose', (params = {}, { body } = {}) => {
  const payload = body || params
  const { template: templateId, sections: requested, period = '7d', context = {} } = payload
  const template = reportTemplates.find((t) => t.id === templateId)
  if (!template) throw new Error(`Modelo de relatório desconhecido: ${templateId}`)

  const chosen = requested?.length
    ? template.sections.filter((s) => requested.includes(s.id))
    : template.sections.filter((s) => s.default)

  const sections = chosen.map((s) => {
    const resolver = SECTION_RESOLVERS[s.id]
    const content = resolver ? resolver({ ...context, template: templateId }) : { type: 'text', text: '—' }
    return { id: s.id, label: s.label, ...content }
  })

  const periodLabel = REPORT_PERIODS.find((p) => p.id === period)?.label || period

  return {
    id: `rep-${Date.now()}`,
    template: template.id,
    title: template.name,
    audience: template.audience,
    period,
    periodLabel,
    generatedAt: new Date().toISOString(),
    summary: template.description,
    sections,
    disclaimer:
      'Documento demonstrativo do DefesaBR Intelligence. Dados ilustrativos — não substitui avaliação profissional.',
  }
})

export const reportsService = {
  templates: () => request('GET /reports/templates'),
  history: (params) => request('GET /reports/history', { params }),
  schedules: () => request('GET /reports/schedules'),
  /** Monta o documento (sem renderizar): { template, sections, period, context }. */
  compose: (payload) => request('POST /reports/compose', { body: payload, params: payload }),
  /** Estatísticas do painel de riscos (reaproveitadas por dashboards). */
  riskSummary: () => riskSummary,
}

export default reportsService
