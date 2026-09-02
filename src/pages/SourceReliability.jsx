import { useState, useMemo } from 'react'
import {
  BadgeCheck, Filter, X, ArrowUpDown, Scale, Gauge, ShieldCheck, AlertTriangle,
  PenTool, Check, BookOpen, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import InfoTooltip from '../components/ui/InfoTooltip'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { RELIABILITY_TIERS, reliabilityTier } from '../data/sourceReliability'
import { exportCSV } from '../utils/exportUtils'

const SOURCE_TYPES = ['Oficial', 'Imprensa', 'Especializada', 'Internacional', 'Redes']

const SORTS = [
  { id: 'score-desc', label: 'Maior confiabilidade' },
  { id: 'score-asc', label: 'Menor confiabilidade' },
  { id: 'name', label: 'Nome (A–Z)' },
  { id: 'type', label: 'Tipo de fonte' },
]

// -----------------------------------------------------------------------------
// CONFIABILIDADE DAS FONTES
//
// A pontuação não é um veredito sobre o veículo: é uma medida de QUANTA
// verificação adicional aquele conteúdo exige antes de virar análise. Por isso
// os critérios ficam expostos e a reavaliação é uma ação do Analista, não um
// número calculado em silêncio.
// -----------------------------------------------------------------------------
export default function SourceReliability() {
  const { data, loading, error, refetch } = useResource(() => intelligenceService.sources(), [])

  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('score-desc')
  const [rating, setRating] = useState(null)
  // Reavaliações desta sessão — em produção, persistidas pelo backend.
  const [overrides, setOverrides] = useState({})

  const criteria = data?.criteria || []

  const sources = useMemo(
    () => (data?.items || []).map((s) => ({ ...s, ...(overrides[s.id] || {}) })),
    [data, overrides]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = sources.filter((s) => {
      if (type && s.type !== type) return false
      if (tier && reliabilityTier(s.score).label !== tier) return false
      if (needle && !`${s.name} ${s.type} ${s.note} ${s.bias}`.toLowerCase().includes(needle)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'score-asc') return a.score - b.score
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      if (sort === 'type') return a.type.localeCompare(b.type, 'pt-BR') || b.score - a.score
      return b.score - a.score
    })
    return list
  }, [sources, query, tier, type, sort])

  const stats = useMemo(() => {
    if (!sources.length) return { avg: 0, high: 0, caution: 0 }
    const avg = Math.round(sources.reduce((a, s) => a + s.score, 0) / sources.length)
    return {
      avg,
      high: sources.filter((s) => s.score >= 85).length,
      caution: sources.filter((s) => s.score < 50).length,
    }
  }, [sources])

  const hasFilters = !!(query || tier || type)
  const clearFilters = () => { setQuery(''); setTier(''); setType('') }

  const applyRating = (source, scores, note) => {
    const values = Object.values(scores)
    const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    setOverrides((prev) => ({
      ...prev,
      [source.id]: { score, note: note || source.note, reassessed: true },
    }))
    setRating(null)
    toast.success(`${source.name}: confiabilidade reavaliada para ${score}/100`)
  }

  const exportSources = () => {
    exportCSV(
      filtered.map((s) => ({
        Fonte: s.name,
        Tipo: s.type,
        Pontuação: s.score,
        Faixa: reliabilityTier(s.score).label,
        'Viés percebido': s.bias,
        Observação: s.note,
      })),
      `confiabilidade-fontes-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} fonte(s) exportada(s) em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BadgeCheck}
        title="Confiabilidade das Fontes"
        description="Quanta verificação adicional cada fonte exige antes de virar análise — por proximidade da informação original, histórico e transparência de método."
        help="A pontuação (0–100) não julga o veículo: orienta o esforço de corroboração. Fonte de baixa pontuação não é descartada, é cruzada."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Confiabilidade das Fontes' }]}
        badges={<Badge type="demo" />}
        actions={
          <Can do="reports.export">
            <button onClick={exportSources} className="btn-ghost text-sm" disabled={!filtered.length}>
              <Download size={15} /> Exportar CSV
            </button>
          </Can>
        }
      />

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Scale} label="Fontes catalogadas" value={String(sources.length || '—')} hint="em avaliação contínua" accent="brand" />
        <MetricCard icon={Gauge} label="Pontuação média" value={sources.length ? `${stats.avg}/100` : '—'} hint="do acervo monitorado" accent={stats.avg >= 70 ? 'green' : 'amber'} />
        <MetricCard icon={ShieldCheck} label="Confiabilidade muito alta" value={String(stats.high)} hint="pontuação ≥ 85" accent="green" />
        <MetricCard icon={AlertTriangle} label="Exigem cautela" value={String(stats.caution)} hint="sempre cruzar com fonte primária" accent={stats.caution ? 'red' : 'green'} />
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <SearchBar placeholder="Buscar fonte, tipo ou observação…" defaultValue={query} onChange={setQuery} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input" aria-label="Filtrar por tipo de fonte">
            <option value="">Todos os tipos</option>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenação">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
            <Filter size={13} /> Faixa de confiabilidade
          </p>
          <div className="flex flex-wrap gap-2">
            {RELIABILITY_TIERS.map((t) => (
              <button
                key={t.label}
                onClick={() => setTier(tier === t.label ? '' : t.label)}
                aria-pressed={tier === t.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${t.classes} ${
                  tier === t.label ? 'ring-2 ring-gold-500/60' : ''
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: t.ring }} />
                {t.label}
                <span className="opacity-70">≥ {t.min}</span>
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <p className="flex items-center gap-1.5 text-sm muted">
              <ArrowUpDown size={14} /> {filtered.length} de {sources.length} fonte(s)
            </p>
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          </div>
        )}
      </section>

      {/* LISTA */}
      <DataState
        loading={loading}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={4}
        emptyProps={{
          icon: BadgeCheck,
          tone: 'filter',
          title: hasFilters ? 'Nenhuma fonte corresponde aos filtros' : 'Nenhuma fonte catalogada',
          hint: hasFilters
            ? 'Ajuste a busca, o tipo ou a faixa de confiabilidade.'
            : 'O catálogo de fontes ainda não foi preenchido.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((s) => {
            const t = reliabilityTier(s.score)
            return (
              <article key={s.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold tracking-tight">{s.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs muted">
                      <span className="chip">{s.type}</span>
                      <span>viés percebido: {s.bias}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-2xl font-extrabold leading-none tabular-nums" style={{ color: t.ring }}>
                      {s.score}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide muted">/100</p>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="block h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <span className="block h-full rounded-full transition-all" style={{ width: `${s.score}%`, background: t.ring }} />
                  </span>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.classes}`}>{t.label}</span>
                    {s.reassessed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-400">
                        <Check size={11} /> reavaliada nesta sessão
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed muted">{s.note}</p>

                <Can do="sources.rate">
                  <button onClick={() => setRating(s)} className="btn-ghost mt-3 px-2.5 py-1 text-xs">
                    <PenTool size={13} /> Reavaliar fonte
                  </button>
                </Can>
              </article>
            )
          })}
        </div>
      </DataState>

      {/* METODOLOGIA */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <BookOpen size={17} className="text-brand-400 dark:text-brand-300" /> Como calculamos
          <InfoTooltip text="A escala é qualitativa e revisável. Inspira-se na prática de OSINT de avaliar separadamente a fonte e o conteúdo, mas usa critérios próprios, declarados abaixo." />
        </h2>
        <p className="mb-4 text-sm muted">
          Cinco critérios, com peso igual. Uma pontuação baixa não invalida a fonte — indica que ela
          precisa ser corroborada antes de sustentar uma conclusão.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {criteria.map((c, i) => (
            <li key={c} className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 font-mono text-[10px] font-bold text-gold-600 dark:text-gold-400">
                {i + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{c}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
          {RELIABILITY_TIERS.map((t) => (
            <span key={t.label} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.classes}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: t.ring }} />
              {t.label} · {t.min}+
            </span>
          ))}
        </div>
      </section>

      <p className="text-center text-xs muted">
        Avaliações demonstrativas — em produção, calibradas por metodologia documentada e revisão de pares.
      </p>

      {/* REAVALIAÇÃO (Analista) */}
      <RatingModal source={rating} criteria={criteria} onClose={() => setRating(null)} onApply={applyRating} />
    </div>
  )
}

// ── Modal de reavaliação: cada critério vira uma nota, a média é a pontuação ──
function RatingModal({ source, criteria, onClose, onApply }) {
  const [scores, setScores] = useState({})
  const [note, setNote] = useState('')

  // Inicializa cada critério com a pontuação atual da fonte ao abrir.
  const values = useMemo(() => {
    if (!source) return {}
    const base = {}
    criteria.forEach((c, i) => { base[i] = scores[i] ?? source.score })
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, criteria, scores])

  const preview = useMemo(() => {
    const list = Object.values(values)
    if (!list.length) return source?.score ?? 0
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length)
  }, [values, source])

  const close = () => {
    onClose()
    setTimeout(() => { setScores({}); setNote('') }, 200)
  }

  const tier = reliabilityTier(preview)

  return (
    <Modal open={!!source} onClose={close} title="Reavaliar confiabilidade" maxWidth="max-w-lg">
      {source && (
        <form
          onSubmit={(e) => { e.preventDefault(); onApply(source, values, note); setScores({}); setNote('') }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight">{source.name}</p>
              <p className="text-xs muted">{source.type} · pontuação atual {source.score}/100</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-2xl font-extrabold leading-none tabular-nums" style={{ color: tier.ring }}>
                {preview}
              </p>
              <p className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.classes}`}>{tier.label}</p>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide muted">
              Nota por critério (0–100)
            </legend>
            {criteria.map((c, i) => (
              <div key={c}>
                <label htmlFor={`criterio-${i}`} className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 leading-snug">{c}</span>
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums">{values[i]}</span>
                </label>
                <input
                  id={`criterio-${i}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={values[i]}
                  onChange={(e) => setScores((prev) => ({ ...prev, [i]: Number(e.target.value) }))}
                  className="w-full accent-gold-500"
                />
              </div>
            ))}
          </fieldset>

          <div>
            <label htmlFor="observacao-fonte" className="mb-1 block text-xs font-bold uppercase tracking-wide muted">
              Observação (opcional)
            </label>
            <textarea
              id="observacao-fonte"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que motivou a reavaliação?"
              className="input resize-y"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className="btn-ghost justify-center">Cancelar</button>
            <button type="submit" className="btn-primary justify-center">
              <Check size={15} /> Salvar reavaliação
            </button>
          </div>

          <p className="text-[11px] muted">
            No modo demonstração a reavaliação vale apenas para esta sessão.
          </p>
        </form>
      )}
    </Modal>
  )
}
