import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  GraduationCap,
  TrendingUp,
  Factory,
  Briefcase,
  Globe,
  ChevronDown,
  Activity,
  MapPin,
  FileDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/ui/Badge'
import GaugeChart from '../components/charts/GaugeChart'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useClaudeAI } from '../hooks/useClaudeAI'
import { useNews } from '../hooks/useNews'
import { useSettingsStore } from '../store/settingsStore'
import { FOCUS_AREAS, mockWeeklyAnalysis } from '../data/mockData'
import { exportWeeklyToPDF } from '../utils/exportUtils'

const ICONS = { GraduationCap, TrendingUp, Factory, Briefcase, Globe }
const PREV_WEEKS = [
  'Semana de 01 a 07 de Junho de 2026',
  'Semana de 25 a 31 de Maio de 2026',
  'Semana de 18 a 24 de Maio de 2026',
  'Semana de 11 a 17 de Maio de 2026',
  'Semana de 04 a 10 de Maio de 2026',
  'Semana de 27 de Abril a 03 de Maio de 2026',
  'Semana de 20 a 26 de Abril de 2026',
  'Semana de 13 a 19 de Abril de 2026',
]

const scenarioStyle = {
  BASE: { emoji: '📗', ring: 'border-brand-500/40', label: 'CENÁRIO BASE' },
  OTIMISTA: { emoji: '📙', ring: 'border-military-green/50', label: 'CENÁRIO OTIMISTA' },
  ADVERSO: { emoji: '📕', ring: 'border-military-red/50', label: 'CENÁRIO ADVERSO' },
}

const statusColor = {
  NORMAL: 'text-emerald-400',
  ATENCAO: 'text-yellow-400',
  ALERTA: 'text-amber-400',
  CRITICO: 'text-red-400',
}

// Rótulos acentuados para exibição (as chaves acima permanecem como enums).
const statusLabel = {
  NORMAL: 'NORMAL',
  ATENCAO: 'ATENÇÃO',
  ALERTA: 'ALERTA',
  CRITICO: 'CRÍTICO',
}

export default function WeeklyAnalysis() {
  const { news } = useNews(false)
  const { loading, generateWeekly, source } = useClaudeAI()
  const focusArea = useSettingsStore((s) => s.focusArea)
  const setFocusArea = useSettingsStore((s) => s.setFocusArea)

  const [result, setResult] = useState(mockWeeklyAnalysis[focusArea] || mockWeeklyAnalysis.empresarial)
  const [week, setWeek] = useState(PREV_WEEKS[0])

  const selectFocus = (id) => {
    setFocusArea(id)
    setResult(mockWeeklyAnalysis[id])
  }

  const handleGenerate = async () => {
    const r = await generateWeekly(news, focusArea)
    setResult(r)
  }

  const handlePDF = () => {
    if (!result) return
    const focusLabel = FOCUS_AREAS.find((f) => f.id === focusArea)?.label || 'Geral'
    exportWeeklyToPDF(result, { week, focusLabel })
    toast.success('Relatório PDF gerado')
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">Análise Semanal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Perspectivas e Cenários</h1>
            <p className="mt-1 text-sm muted">{week}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="input max-w-xs"
              aria-label="Selecionar semana"
            >
              {PREV_WEEKS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <button onClick={handlePDF} className="btn-ghost" title="Exportar a análise em PDF">
              <FileDown size={16} /> PDF
            </button>
            <button onClick={handleGenerate} disabled={loading} className="btn-primary">
              <Bot size={18} /> {loading ? 'Gerando…' : 'Gerar Análise Semanal'}
            </button>
          </div>
        </div>

        {/* Tabs de perspectiva */}
        <div className="mt-5 flex flex-wrap gap-2">
          {FOCUS_AREAS.map((f) => {
            const Icon = ICONS[f.icon] || Activity
            const active = focusArea === f.id
            return (
              <button
                key={f.id}
                onClick={() => selectFocus(f.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                    : 'border-gray-600/50 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={15} /> {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
          {/* Bloco A — Contexto */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm font-semibold uppercase tracking-wide muted">Eventos monitorados</p>
              <p className="mt-2 text-4xl font-bold">{result.context?.events_monitored}</p>
              <div className="mt-3 flex items-center gap-2"><Badge type={source === 'ai' ? 'live' : 'demo'} /></div>
            </div>
            <div className="card p-5">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide muted">Regiões mais ativas</p>
              <div className="flex flex-wrap gap-2">
                {result.context?.active_regions?.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs">
                    <MapPin size={12} className="text-brand-400" /> {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold uppercase tracking-wide muted">
                Nível de tensão
                <InfoTooltip text="Índice de 0 a 100 que resume a intensidade dos eventos de segurança no período. Quanto maior, mais crítico o momento." />
              </p>
              <GaugeChart value={result.context?.tension_level ?? 40} height={170} />
            </div>
          </div>

          {/* Bloco B — Cenários */}
          <div>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Análise de cenários</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {result.scenarios?.map((sc) => {
                const st = scenarioStyle[sc.type] || scenarioStyle.BASE
                return (
                  <div key={sc.type} className={`card border-t-4 p-5 ${st.ring}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold uppercase tracking-wide">
                        {st.emoji} {st.label}
                      </span>
                      <span className="text-2xl font-bold text-brand-400">{sc.probability}%</span>
                    </div>
                    <h3 className="mt-2 font-semibold">{sc.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{sc.description}</p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase muted">Fatores</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {sc.factors?.map((f, i) => (
                          <li key={i} className="flex gap-2"><span className="text-brand-400">•</span>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase muted">Monitorar</p>
                      <ul className="mt-1 space-y-1 text-sm text-gray-400">
                        {sc.monitor?.map((m, i) => <li key={i}>– {m}</li>)}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bloco C — Oportunidades x Riscos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ListCard title="Oportunidades" items={result.opportunities} accent="green" />
            <ListCard title="Riscos" items={result.risks} accent="red" />
          </div>

          {/* Bloco D — Recomendações */}
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Recomendações por perfil</h2>
            <div className="space-y-2">
              {Object.entries(result.recommendations || {}).map(([profile, text]) => (
                <Accordion key={profile} title={profile} text={text} />
              ))}
            </div>
          </div>

          {/* Bloco E — Indicadores */}
          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Indicadores a monitorar</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
                    <th className="py-2 pr-4">Indicador</th>
                    <th className="py-2 pr-4">Atual</th>
                    <th className="py-2 pr-4">Meta</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.indicators?.map((ind, i) => (
                    <tr key={i} className="border-b border-gray-700/30">
                      <td className="py-2.5 pr-4 font-medium">{ind.name}</td>
                      <td className="py-2.5 pr-4 font-mono">{ind.value}</td>
                      <td className="py-2.5 pr-4 muted">{ind.target}</td>
                      <td className={`py-2.5 font-semibold ${statusColor[ind.status] || 'text-gray-300'}`}>
                        ● {statusLabel[ind.status] || ind.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloco F — Timeline */}
          <div className="card p-5">
            <h2 className="mb-4 text-lg font-bold tracking-tight">Linha do tempo da semana</h2>
            <ol className="relative ml-3 border-l border-gray-700/50">
              {result.timeline?.map((ev, i) => (
                <li key={i} className="mb-5 ml-5">
                  <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-brand-400">{ev.date}</span>
                    <Badge type="urgency" value={ev.impact} />
                    <Badge type="category" value={ev.category} />
                  </div>
                  <p className="mt-1 text-sm text-gray-200">{ev.title}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Bloco G — Word cloud */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight">Tópicos do período</h2>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {result.topics?.map((t, i) => (
                <span
                  key={i}
                  className="font-bold leading-none"
                  style={{
                    fontSize: `${0.8 + t.weight * 0.16}rem`,
                    color: `hsl(${200 - t.weight * 6}, 70%, ${55 + t.weight}%)`,
                    opacity: 0.6 + t.weight * 0.04,
                  }}
                >
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function ListCard({ title, items = [], accent }) {
  const ring = accent === 'green' ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="card p-5">
      <h3 className={`mb-3 text-sm font-bold uppercase tracking-wide ${ring}`}>{title}</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
            <p className="font-medium">{it.title}</p>
            <p className="mt-0.5 text-xs muted">
              Probabilidade: <span className="font-semibold">{it.probability}</span> · Impacto:{' '}
              <span className="font-semibold">{it.impact}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Accordion({ title, text }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-gray-700/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
        aria-expanded={open}
      >
        {title}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="border-t border-gray-700/40 px-4 py-3 text-sm leading-relaxed text-gray-300">{text}</p>}
    </div>
  )
}
