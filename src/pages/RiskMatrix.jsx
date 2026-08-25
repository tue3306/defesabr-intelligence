import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, TrendingUp, TrendingDown, Minus, Filter, X, ListFilter,
  Gauge, Flame, ArrowUpRight, BookOpen, Download, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import InfoTooltip from '../components/ui/InfoTooltip'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import {
  riskCategories, RISK_SEVERITY, severityFor, riskSummary, RISK_METHODOLOGY,
} from '../data/riskMatrix'
import { exportCSV } from '../utils/exportUtils'

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus }
const TREND_LABEL = { up: 'Em elevação', down: 'Em redução', flat: 'Estável' }
const TREND_CLR = {
  up: 'text-red-600 dark:text-red-400',
  down: 'text-emerald-600 dark:text-emerald-400',
  flat: 'text-gray-500 dark:text-gray-400',
}

const CONFIDENCE_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

const SEVERITY_ORDER = ['critico', 'alto', 'moderado', 'baixo']
const AXIS = [1, 2, 3, 4, 5]

const categoryMeta = (id) => riskCategories.find((c) => c.id === id) || { label: id, color: '#64748b' }

// -----------------------------------------------------------------------------
// MATRIZ DE RISCOS ESTRATÉGICOS
//
// Metodologia inspirada em ISO 31000: probabilidade × impacto, com horizonte,
// confiança da avaliação e tendência declarados — porque um número solto, sem
// a base que o sustenta, não é inteligência, é opinião com aparência de dado.
// -----------------------------------------------------------------------------
export default function RiskMatrix() {
  const { data, loading, error, refetch } = useResource(() => intelligenceService.risks(), [])

  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [severity, setSeverity] = useState('')
  const [trend, setTrend] = useState('')
  const [cell, setCell] = useState(null) // { probability, impact }
  const [openRisk, setOpenRisk] = useState(null)

  const risks = data?.items || []

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return risks.filter((r) => {
      if (cats.length && !cats.includes(categoryMeta(r.category).label)) return false
      if (severity && r.severity !== severity) return false
      if (trend && r.trend !== trend) return false
      if (cell && (r.probability !== cell.probability || r.impact !== cell.impact)) return false
      if (needle) {
        const hay = `${r.title} ${r.description} ${r.owner} ${(r.drivers || []).join(' ')}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [risks, query, cats, severity, trend, cell])

  // Contagem por célula da grade 5×5 — a base do mapa de calor.
  const byCell = useMemo(() => {
    const map = new Map()
    risks.forEach((r) => {
      const key = `${r.probability}-${r.impact}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return map
  }, [risks])

  const hasFilters = !!(query || cats.length || severity || trend || cell)
  const clearFilters = () => {
    setQuery(''); setCats([]); setSeverity(''); setTrend(''); setCell(null)
  }

  const criticalCount = (riskSummary.bySeverity?.critico || 0) + (riskSummary.bySeverity?.alto || 0)

  const exportRisks = () => {
    exportCSV(
      filtered.map((r) => ({
        Risco: r.title,
        Categoria: categoryMeta(r.category).label,
        Probabilidade: r.probability,
        Impacto: r.impact,
        Score: r.score,
        Severidade: RISK_SEVERITY[r.severity]?.label || r.severity,
        Tendência: TREND_LABEL[r.trend] || r.trend,
        Horizonte: r.horizon,
        Confiança: CONFIDENCE_LABEL[r.confidence] || r.confidence,
        Responsável: r.owner,
      })),
      `matriz-riscos-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} risco(s) exportado(s) em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        accent="red"
        title="Matriz de Riscos Estratégicos"
        description="Riscos que incidem sobre interesses estratégicos brasileiros, avaliados por probabilidade e impacto, com horizonte, confiança e tendência declarados."
        help="Severidade = probabilidade × impacto, em escala de 1 a 5 em cada eixo. A faixa resultante orienta a prioridade de tratamento."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Matriz de Riscos' }]}
        badges={<Badge type="demo" />}
        meta={[
          { label: 'Riscos', value: String(riskSummary.total) },
          { label: 'Severidade média', value: String(riskSummary.avgScore) },
        ]}
        actions={
          <Can do="reports.export" fallback={
            <Link to="/planos" className="btn-ghost text-sm"><Download size={15} /> Exportar (Profissional)</Link>
          }>
            <button onClick={exportRisks} className="btn-ghost text-sm" disabled={!filtered.length}>
              <Download size={15} /> Exportar CSV
            </button>
          </Can>
        }
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={ShieldAlert} label="Riscos mapeados" value={String(riskSummary.total)} hint="em monitoramento contínuo" accent="brand" />
        <MetricCard icon={Flame} label="Alto ou crítico" value={String(criticalCount)} hint="exigem tratamento prioritário" accent="red" />
        <MetricCard icon={ArrowUpRight} label="Em elevação" value={String(riskSummary.rising)} hint="tendência de alta em 90 dias" accent="amber" />
        <MetricCard icon={Gauge} label="Severidade média" value={String(riskSummary.avgScore)} hint="escala de 1 a 25" accent={riskSummary.avgScore >= 12 ? 'red' : 'amber'} />
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!risks.length}
        onRetry={refetch}
        skeletonCount={4}
        emptyProps={{ icon: ShieldAlert, title: 'Nenhum risco cadastrado', hint: 'A matriz de riscos ainda não foi preenchida.' }}
      >
        {/* MAPA DE CALOR 5×5 */}
        <section className="card p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Mapa de calor — probabilidade × impacto
              <InfoTooltip text="Cada célula combina uma probabilidade (eixo horizontal) com um impacto (eixo vertical). O número indica quantos riscos caem naquela combinação. Clique para filtrar a lista abaixo." />
            </h2>
            {cell && (
              <button onClick={() => setCell(null)} className="btn-ghost px-2.5 py-1 text-xs">
                <X size={13} /> Limpar seleção
              </button>
            )}
          </div>
          <p className="mb-4 text-sm muted">
            Clique numa célula para ver apenas os riscos daquela combinação.
          </p>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[540px]">
              <div className="flex gap-2">
                {/* Rótulo do eixo vertical */}
                <div className="flex w-6 items-center justify-center">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-gray-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                    Impacto →
                  </span>
                </div>

                <div className="flex-1">
                  {/* Linhas: impacto de 5 (topo) a 1 (base) */}
                  {[...AXIS].reverse().map((impact) => (
                    <div key={impact} className="mb-1 flex items-center gap-1">
                      <span className="w-5 shrink-0 text-right font-mono text-xs font-bold text-gray-500">{impact}</span>
                      {AXIS.map((probability) => {
                        const key = `${probability}-${impact}`
                        const items = byCell.get(key) || []
                        const sev = RISK_SEVERITY[severityFor(probability, impact)]
                        const selected = cell?.probability === probability && cell?.impact === impact
                        return (
                          <button
                            key={key}
                            onClick={() => setCell(selected ? null : { probability, impact })}
                            disabled={!items.length}
                            aria-label={`Probabilidade ${probability}, impacto ${impact}: ${items.length} risco(s)`}
                            aria-pressed={selected}
                            title={items.map((r) => r.title).join(' · ') || 'Nenhum risco nesta combinação'}
                            className={`relative flex h-16 flex-1 flex-col items-center justify-center rounded-md border transition-all ${
                              selected ? 'ring-2 ring-gold-500 ring-offset-1 ring-offset-transparent' : ''
                            } ${items.length ? 'cursor-pointer hover:brightness-110' : 'cursor-default opacity-35'}`}
                            style={{
                              background: `${sev.color}${items.length ? '2e' : '14'}`,
                              borderColor: `${sev.color}55`,
                            }}
                          >
                            <span
                              className="font-mono text-lg font-extrabold leading-none tabular-nums"
                              style={{ color: sev.color }}
                            >
                              {items.length || ''}
                            </span>
                            {items.length > 0 && (
                              <span className="mt-0.5 px-1 text-center text-[9px] font-medium leading-tight text-gray-600 dark:text-gray-300">
                                {items.length === 1 ? truncate(items[0].title, 26) : `${items.length} riscos`}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}

                  {/* Eixo horizontal */}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="w-5 shrink-0" />
                    {AXIS.map((p) => (
                      <span key={p} className="flex-1 text-center font-mono text-xs font-bold text-gray-500">{p}</span>
                    ))}
                  </div>
                  <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Probabilidade →
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legenda de faixas */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <span className="text-[11px] font-bold uppercase tracking-wide muted">Faixas</span>
            {SEVERITY_ORDER.map((key) => {
              const sev = RISK_SEVERITY[key]
              return (
                <button
                  key={key}
                  onClick={() => setSeverity(severity === key ? '' : key)}
                  aria-pressed={severity === key}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    severity === key ? 'ring-2 ring-gold-500/60' : ''
                  } ${sev.classes}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: sev.color }} />
                  {sev.label}
                  <span className="tabular-nums opacity-70">({riskSummary.bySeverity?.[key] || 0})</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* FILTROS */}
        <section className="card space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SearchBar
              placeholder="Buscar risco, direcionador ou responsável…"
              defaultValue={query}
              onChange={setQuery}
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input"
              aria-label="Filtrar por faixa de severidade"
            >
              <option value="">Todas as severidades</option>
              {SEVERITY_ORDER.map((k) => (
                <option key={k} value={k}>{RISK_SEVERITY[k].label}</option>
              ))}
            </select>
            <select
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
              className="input"
              aria-label="Filtrar por tendência"
            >
              <option value="">Todas as tendências</option>
              <option value="up">Em elevação</option>
              <option value="flat">Estável</option>
              <option value="down">Em redução</option>
            </select>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
              <Filter size={13} /> Categorias
            </p>
            <TagFilter
              options={riskCategories.map((c) => c.label)}
              selected={cats}
              getColor={(label) => riskCategories.find((c) => c.label === label)?.color || '#64748b'}
              onToggle={(c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
            />
          </div>
        </section>

        {/* RESULTADOS */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm muted">
            <ListFilter size={14} />
            {filtered.length} de {risks.length} risco(s)
            {cell && (
              <span className="text-gold-600 dark:text-gold-400">
                {' '}· probabilidade {cell.probability} × impacto {cell.impact}
              </span>
            )}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            tone="filter"
            title="Nenhum risco corresponde aos filtros"
            hint="Ajuste a busca, a categoria ou a faixa de severidade para ver resultados."
            action={{ label: 'Limpar filtros', onClick: clearFilters, icon: X }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((risk) => (
              <RiskCard key={risk.id} risk={risk} onOpen={() => setOpenRisk(risk)} />
            ))}
          </div>
        )}
      </DataState>

      {/* METODOLOGIA */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <BookOpen size={17} className="text-brand-400" /> Como esta matriz é construída
        </h2>
        <p className="mb-4 text-sm muted">
          Transparência metodológica: a avaliação é qualitativa e revisável, não um cálculo automático.
        </p>
        <ol className="space-y-2">
          {RISK_METHODOLOGY.map((line, i) => (
            <li key={line} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 font-mono text-[10px] font-bold text-brand-500 dark:text-brand-300">
                {i + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-center text-xs muted">
        Conteúdo demonstrativo — avaliações ilustrativas, sem vínculo oficial.
      </p>

      {/* DETALHE DO RISCO */}
      <Modal open={!!openRisk} onClose={() => setOpenRisk(null)} title={openRisk?.title} maxWidth="max-w-2xl">
        {openRisk && <RiskDetail risk={openRisk} />}
      </Modal>
    </div>
  )
}

// ── Cartão de risco ───────────────────────────────────────────────────────────
function RiskCard({ risk, onOpen }) {
  const sev = RISK_SEVERITY[risk.severity] || {}
  const cat = categoryMeta(risk.category)
  const TrendIcon = TREND_ICON[risk.trend] || Minus

  return (
    <button
      onClick={onOpen}
      className="card card-interactive p-5 text-left transition-colors hover:border-gold-500/40"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `${cat.color}22`, color: cat.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
          {cat.label}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sev.classes || ''}`}>
          {sev.label}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold" title={TREND_LABEL[risk.trend]}>
          <TrendIcon size={14} className={TREND_CLR[risk.trend]} />
          <span className="font-mono tabular-nums muted">{risk.score}</span>
        </span>
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">{risk.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed muted">{risk.description}</p>

      {/* Barras de probabilidade e impacto */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ScoreBar label="Probabilidade" value={risk.probability} color={sev.color} />
        <ScoreBar label="Impacto" value={risk.impact} color={sev.color} />
      </div>

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 pt-3 text-[11px] dark:border-white/[0.06]">
        <div className="flex items-center gap-1">
          <dt className="font-semibold uppercase tracking-wide muted">Horizonte</dt>
          <dd className="font-medium text-gray-700 dark:text-gray-300">{risk.horizon}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="font-semibold uppercase tracking-wide muted">Confiança</dt>
          <dd className="font-medium text-gray-700 dark:text-gray-300">{CONFIDENCE_LABEL[risk.confidence] || risk.confidence}</dd>
        </div>
        <span className="ml-auto inline-flex items-center gap-0.5 font-semibold text-brand-500 dark:text-brand-400">
          Detalhar <ChevronRight size={13} />
        </span>
      </dl>
    </button>
  )
}

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider muted">{label}</span>
        <span className="font-mono text-xs font-bold tabular-nums">{value}/5</span>
      </div>
      <div className="mt-1 flex gap-0.5" aria-hidden="true">
        {AXIS.map((step) => (
          <span
            key={step}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: step <= value ? color : 'rgba(148,163,184,0.25)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Detalhe completo do risco ─────────────────────────────────────────────────
function RiskDetail({ risk }) {
  const sev = RISK_SEVERITY[risk.severity] || {}
  const cat = categoryMeta(risk.category)
  const TrendIcon = TREND_ICON[risk.trend] || Minus

  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: `${cat.color}22`, color: cat.color }}
        >
          {cat.label}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sev.classes || ''}`}>
          Severidade {sev.label} · {risk.score}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold muted">
          <TrendIcon size={14} className={TREND_CLR[risk.trend]} /> {TREND_LABEL[risk.trend]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{risk.description}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Probabilidade" value={`${risk.probability}/5`} />
        <Fact label="Impacto" value={`${risk.impact}/5`} />
        <Fact label="Horizonte" value={risk.horizon} />
        <Fact label="Confiança" value={CONFIDENCE_LABEL[risk.confidence] || risk.confidence} />
      </div>

      <DetailList title="Direcionadores" items={risk.drivers} />
      <DetailList title="Indicadores de alerta" items={risk.indicators} hint="O que observar para saber se o risco está se materializando." />
      <DetailList title="Medidas de mitigação" items={risk.mitigations} />

      <section className="rounded-xl border-l-4 border-gold-500 bg-white/5 p-4">
        <h3 className="text-sm font-bold tracking-tight">Impacto para o Brasil</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{risk.impactBR}</p>
      </section>

      <p className="text-xs muted">
        Responsável pelo acompanhamento: <strong className="text-gray-700 dark:text-gray-300">{risk.owner}</strong>
      </p>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold tracking-tight">{value}</p>
    </div>
  )
}

function DetailList({ title, items = [], hint }) {
  if (!items.length) return null
  return (
    <section>
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-xs muted">{hint}</p>}
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
            <span className="text-gray-700 dark:text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function truncate(text = '', max = 26) {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`
}
