import { useState, useMemo } from 'react'
import {
  Radio, TrendingUp, TrendingDown, Minus, ShieldAlert, AlertOctagon, Filter,
  X, Tag, ScanSearch, PenTool, Check, Megaphone, ChevronRight,
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
import { useCan } from '../auth/useCan'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { SENTIMENT_CLR } from '../data/narratives'

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus }
const TREND_LABEL = { up: 'Alcance em alta', down: 'Alcance em queda', flat: 'Alcance estável' }
const TREND_CLR = {
  up: 'text-red-800 dark:text-red-400',
  down: 'text-emerald-800 dark:text-emerald-400',
  flat: 'text-gray-500 dark:text-gray-400',
}

const SENTIMENTS = ['Positivo', 'Misto', 'Negativo']

// Classificações de origem que o Analista pode atribuir — da mais benigna à
// mais grave. A escala existe para separar debate legítimo de manipulação.
const CLASSIFICATIONS = [
  { id: 'Orgânica', hint: 'Circulação espontânea, sem sinais de coordenação.' },
  { id: 'Amplificada', hint: 'Impulso acima do orgânico, sem prova de coordenação.' },
  { id: 'Coordenada (suspeita FIMI)', hint: 'Padrões compatíveis com operação de influência.' },
  { id: 'Coordenada confirmada', hint: 'Evidência consolidada de campanha coordenada.' },
]

// Como se lê um sinal — o método, exposto para que o julgamento seja auditável.
const READING_METHOD = [
  { step: 'Observar', text: 'Registrar volume, janela temporal e plataformas em que o tema circula.' },
  { step: 'Comparar', text: 'Contrastar o padrão com a linha de base histórica daquele tema.' },
  { step: 'Atribuir', text: 'Verificar origem declarada, reuso de mídia e comportamento das contas.' },
  { step: 'Classificar', text: 'Só então rotular — e sempre com a justificativa registrada.' },
]

/**
 * Série determinística de amplificação (7 dias) derivada do id da narrativa.
 * Sem `Math.random`: o gráfico precisa ser estável entre renders.
 */
function amplificationSeries(id = '', trend = 'flat') {
  const seed = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return Array.from({ length: 7 }, (_, i) => {
    const wave = Math.sin((seed % 17) + i * 0.9) * 18
    const drift = trend === 'up' ? i * 7 : trend === 'down' ? (6 - i) * 7 : 0
    return Math.max(8, Math.min(100, Math.round(42 + wave + drift + ((seed + i * 13) % 11))))
  })
}

// -----------------------------------------------------------------------------
// MONITOR DE NARRATIVAS (FIMI)
//
// FIMI = Foreign Information Manipulation and Interference. O objetivo do
// módulo é PROTEGER o debate legítimo: sinalizar apenas padrões de manipulação
// coordenada, nunca opinião divergente. Por isso toda classificação exige
// justificativa e fica registrada com o autor.
// -----------------------------------------------------------------------------
export default function Narratives() {
  const can = useCan()
  const [query, setQuery] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [onlyFimi, setOnlyFimi] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [classifying, setClassifying] = useState(null)
  // Reclassificações feitas nesta sessão (o backend assumiria esta persistência).
  const [overrides, setOverrides] = useState({})

  const { data, loading, error, refetch } = useResource(
    () => intelligenceService.narratives({ q: query, sentiment, fimi: onlyFimi || undefined }),
    [query, sentiment, onlyFimi],
    { keepPreviousData: true }
  )

  const items = useMemo(
    () => (data?.items || []).map((n) => ({ ...n, ...(overrides[n.id] || {}) })),
    [data, overrides]
  )
  const summary = data?.summary || []
  const signals = data?.signals || []

  const hasFilters = !!(query || sentiment || onlyFimi)
  const clearFilters = () => { setQuery(''); setSentiment(''); setOnlyFimi(false) }

  const active = items.find((n) => n.id === openId)

  const applyClassification = (narrative, classification, justification) => {
    setOverrides((prev) => ({
      ...prev,
      [narrative.id]: {
        classification,
        justification,
        classifiedBy: 'Analista',
        classifiedAt: new Date().toISOString(),
      },
    }))
    setClassifying(null)
    toast.success(`“${narrative.topic}” classificada como ${classification}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radio}
        accent="gold"
        title="Monitor de Narrativas"
        description="Como o Brasil e as Forças Armadas são retratados em mídia e redes — e onde há sinais de manipulação informacional coordenada."
        help="FIMI = Foreign Information Manipulation and Interference. O módulo distingue debate legítimo de campanha coordenada; conteúdo negativo não é, por si só, desinformação."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Monitor de Narrativas' }]}
        badges={<Badge type="demo" />}
      />

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} hint={s.hint} accent={s.accent} />
        ))}
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SearchBar
            placeholder="Buscar tema, descrição ou classificação…"
            defaultValue={query}
            onChange={setQuery}
          />
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="input"
            aria-label="Filtrar por sentimento"
          >
            <option value="">Todos os sentimentos</option>
            {SENTIMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setOnlyFimi((v) => !v)}
            aria-pressed={onlyFimi}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              onlyFimi
                ? 'bg-military-red/15 text-red-700 ring-1 ring-inset ring-red-500/40 dark:text-red-300'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            <AlertOctagon size={15} /> Apenas suspeitas de FIMI
          </button>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm muted">
              <Filter size={14} /> {items.length} narrativa(s) no filtro
            </p>
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          </div>
        )}
      </section>

      {/* NARRATIVAS */}
      <section>
        <h2 className="mb-1 text-lg font-bold tracking-tight">Narrativas em circulação</h2>
        <p className="mb-4 text-sm muted">
          Temas monitorados, com sentimento, alcance e classificação de origem.
          {can('narratives.manage') && ' Como Analista, você pode reclassificar cada tema.'}
        </p>

        <DataState
          loading={loading && !data}
          error={error}
          empty={items.length === 0}
          onRetry={refetch}
          skeletonCount={3}
          emptyProps={{
            icon: Radio,
            tone: 'filter',
            title: 'Nenhuma narrativa corresponde aos filtros',
            hint: 'Ajuste a busca, o sentimento ou desligue o filtro de suspeitas de FIMI.',
            action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
          }}
        >
          <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {items.map((n) => {
              const Icon = TREND_ICON[n.trend] || Minus
              const suspect = n.classification.includes('FIMI') || n.classification.includes('Coordenada')
              return (
                <article
                  key={n.id}
                  className={`card p-5 transition-colors hover:border-gold-500/40 ${suspect ? 'border-l-4 border-l-red-500/60' : ''}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight">{n.topic}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SENTIMENT_CLR[n.sentiment]}`}>
                      {n.sentiment}
                    </span>
                    {suspect && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                        <AlertOctagon size={11} /> Suspeita FIMI
                      </span>
                    )}
                    <span
                      className="ml-auto inline-flex items-center gap-1 text-xs muted"
                      title={TREND_LABEL[n.trend]}
                    >
                      <Icon size={14} className={TREND_CLR[n.trend]} /> alcance {n.reach}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{n.desc}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 pt-3 text-xs dark:border-white/[0.06]">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag size={12} className="text-gray-400" />
                      <span className="muted">Classificação:</span>
                      <strong className="font-semibold text-gray-700 dark:text-gray-300">{n.classification}</strong>
                    </span>
                    {n.classifiedBy && (
                      <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400">
                        <Check size={12} /> reclassificada nesta sessão
                      </span>
                    )}

                    <span className="ml-auto flex flex-wrap gap-2">
                      <button onClick={() => setOpenId(n.id)} className="btn-ghost px-2.5 py-1 text-xs">
                        <ScanSearch size={13} /> Detalhar
                      </button>
                      <Can do="narratives.manage">
                        <button onClick={() => setClassifying(n)} className="btn-ghost px-2.5 py-1 text-xs">
                          <PenTool size={13} /> Classificar
                        </button>
                      </Can>
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </DataState>
      </section>

      {/* COMO LEMOS UM SINAL */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <ScanSearch size={17} className="text-brand-400 dark:text-brand-300" /> Como lemos um sinal
        </h2>
        <p className="mb-4 text-sm muted">
          Um rótulo sem método é acusação. Estas são as quatro etapas antes de classificar qualquer tema.
        </p>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {READING_METHOD.map((m, i) => (
            <li key={m.step} className="rounded-lg bg-white/5 p-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/20 font-mono text-[11px] font-bold text-gold-600 dark:text-gold-400">
                {i + 1}
              </span>
              <p className="mt-2 text-sm font-bold tracking-tight">{m.step}</p>
              <p className="mt-0.5 text-xs leading-relaxed muted">{m.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* SINAIS FIMI */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <ShieldAlert size={18} className="text-amber-500 dark:text-amber-400" /> Sinais de coordenação (FIMI)
          <InfoTooltip text="Indícios usados para distinguir debate orgânico de campanha coordenada. Nenhum sinal isolado basta: é a combinação que importa." />
        </h2>
        <p className="mb-4 text-sm muted">Como diferenciamos debate legítimo de manipulação coordenada.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {signals.map((s) => (
            <div key={s.signal} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">{s.signal}</h3>
              <p className="mt-0.5 text-sm muted">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Nota: </span>
            nem todo conteúdo negativo é desinformação. O objetivo é proteger o debate legítimo e
            sinalizar apenas padrões de manipulação coordenada.
          </p>
        </div>
      </section>

      <p className="text-center text-xs muted">Conteúdo demonstrativo para fins de visualização.</p>

      {/* DETALHE */}
      <Modal open={!!active} onClose={() => setOpenId(null)} title={active?.topic} maxWidth="max-w-xl">
        {active && <NarrativeDetail narrative={active} />}
      </Modal>

      {/* CLASSIFICAÇÃO (Analista) */}
      <ClassifyModal
        narrative={classifying}
        onClose={() => setClassifying(null)}
        onApply={applyClassification}
      />
    </div>
  )
}

// ── Detalhe da narrativa ──────────────────────────────────────────────────────
function NarrativeDetail({ narrative: n }) {
  const series = amplificationSeries(n.id, n.trend)
  const Icon = TREND_ICON[n.trend] || Minus
  const max = Math.max(...series)

  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${SENTIMENT_CLR[n.sentiment]}`}>
          {n.sentiment}
        </span>
        <span className="chip">{n.classification}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold muted">
          <Icon size={14} className={TREND_CLR[n.trend]} /> {TREND_LABEL[n.trend]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{n.desc}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Alcance estimado</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight">{n.reach}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Origem</p>
          <p className="mt-0.5 text-sm font-bold tracking-tight">{n.classification}</p>
        </div>
      </div>

      {/* Amplificação nos últimos 7 dias */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <Megaphone size={15} className="text-brand-400 dark:text-brand-300" /> Amplificação — últimos 7 dias
        </h3>
        <p className="mt-0.5 text-xs muted">Intensidade relativa de circulação do tema (escala 0–100, demonstrativa).</p>
        <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label="Gráfico de amplificação dos últimos 7 dias">
          {series.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: v > 70 ? '#c0392b' : v > 45 ? '#caa733' : '#5c616a',
                }}
                title={`Dia ${i + 1}: ${v}`}
              />
              <span className="text-[9px] muted">D-{6 - i}</span>
            </div>
          ))}
        </div>
      </section>

      {n.justification && (
        <section className="rounded-lg border-l-4 border-gold-500 bg-white/5 p-3">
          <h3 className="text-sm font-bold tracking-tight">Justificativa da classificação</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{n.justification}</p>
          <p className="mt-1.5 text-[11px] muted">Registrada por {n.classifiedBy} nesta sessão.</p>
        </section>
      )}
    </div>
  )
}

// ── Modal de classificação (perfil Analista) ─────────────────────────────────
function ClassifyModal({ narrative, onClose, onApply }) {
  const [choice, setChoice] = useState('')
  const [justification, setJustification] = useState('')
  const [touched, setTouched] = useState(false)

  const current = narrative?.classification
  const selected = choice || current
  const invalid = touched && justification.trim().length < 12

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (justification.trim().length < 12) return
    onApply(narrative, selected, justification.trim())
    setChoice(''); setJustification(''); setTouched(false)
  }

  const close = () => {
    onClose()
    setTimeout(() => { setChoice(''); setJustification(''); setTouched(false) }, 200)
  }

  return (
    <Modal open={!!narrative} onClose={close} title="Classificar narrativa" maxWidth="max-w-lg">
      {narrative && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm muted">
            Tema: <strong className="text-gray-800 dark:text-gray-200">{narrative.topic}</strong>
          </p>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide muted">
              Classificação de origem
            </legend>
            <div className="space-y-2">
              {CLASSIFICATIONS.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                    selected === c.id
                      ? 'border-gold-500 bg-gold-500/5'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="radio"
                    name="classificacao"
                    value={c.id}
                    checked={selected === c.id}
                    onChange={() => setChoice(c.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{c.id}</span>
                    <span className="block text-xs leading-relaxed muted">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="justificativa" className="mb-1 block text-xs font-bold uppercase tracking-wide muted">
              Justificativa (obrigatória)
            </label>
            <textarea
              id="justificativa"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Que evidências sustentam esta classificação? Cite sinais observados e fontes."
              className="input resize-y"
            />
            {invalid && (
              <p role="alert" className="mt-1 text-xs text-red-800 dark:text-red-400">
                Descreva a evidência com ao menos 12 caracteres — a classificação fica registrada com seu nome.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className="btn-ghost justify-center">Cancelar</button>
            <button type="submit" className="btn-primary justify-center">
              <Check size={15} /> Registrar classificação
            </button>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] muted">
            <ChevronRight size={12} className="mt-0.5 shrink-0" />
            No modo demonstração a classificação vale apenas para esta sessão. Em produção,
            entraria na trilha de auditoria com autor e horário.
          </p>
        </form>
      )}
    </Modal>
  )
}
