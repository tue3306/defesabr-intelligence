import { useState, useMemo } from 'react'
import {
  Landmark, Building, FileText, Filter, X, Download, ChevronRight,
  Gavel, TrendingUp, CircleDot, CheckCircle2, Archive as ArchiveIcon, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { LEG_STAGE } from '../data/legislative'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR, timeAgo } from '../utils/dateUtils'

const HOUSES = ['Todas', 'Câmara', 'Senado']

const RELEVANCE_CLR = {
  Alta: 'bg-military-red/20 text-red-700 dark:text-red-300',
  Média: 'bg-military-amber/20 text-amber-800 dark:text-amber-300',
  Baixa: 'bg-military-green/20 text-emerald-800 dark:text-emerald-300',
}

// A tramitação real tem muitas etapas; aqui usamos as quatro que importam para
// quem acompanha impacto: comissão → plenário → sanção → aprovado.
const FLOW = ['comissao', 'plenario', 'sancao', 'aprovado']

const STAGE_ICON = {
  comissao: CircleDot,
  plenario: Gavel,
  sancao: FileText,
  aprovado: CheckCircle2,
  arquivado: ArchiveIcon,
}

const SORTS = [
  { id: 'stage', label: 'Estágio mais avançado' },
  { id: 'recent', label: 'Atualização mais recente' },
  { id: 'relevance', label: 'Maior relevância' },
]

const RELEVANCE_WEIGHT = { Alta: 3, 'Média': 2, Baixa: 1 }

// -----------------------------------------------------------------------------
// RADAR LEGISLATIVO
//
// Uma proposição só interessa a este produto quando muda a capacidade, o
// orçamento ou as regras de emprego das Forças. Por isso cada item carrega o
// IMPACTO declarado, e não apenas o número e a ementa.
// -----------------------------------------------------------------------------
export default function Legislative() {
  const { data, loading, error, refetch, meta } = useResource(() => intelligenceService.legislative(), [])

  const [query, setQuery] = useState('')
  const [house, setHouse] = useState('Todas')
  const [stage, setStage] = useState('')
  const [sort, setSort] = useState('stage')
  const [open, setOpen] = useState(null)

  const items = data?.items || []

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = items.filter((i) => {
      if (house !== 'Todas' && i.house !== house) return false
      if (stage && i.stage !== stage) return false
      if (needle && !`${i.code} ${i.title} ${i.summary} ${i.theme}`.toLowerCase().includes(needle)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return (b.updated || '').localeCompare(a.updated || '')
      if (sort === 'relevance') {
        return (RELEVANCE_WEIGHT[b.relevance] || 0) - (RELEVANCE_WEIGHT[a.relevance] || 0)
      }
      return (LEG_STAGE[b.stage]?.pct || 0) - (LEG_STAGE[a.stage]?.pct || 0)
    })
    return list
  }, [items, query, house, stage, sort])

  const stats = useMemo(() => ({
    total: items.length,
    advanced: items.filter((i) => ['plenario', 'sancao', 'aprovado'].includes(i.stage)).length,
    highRelevance: items.filter((i) => i.relevance === 'Alta').length,
    approved: items.filter((i) => i.stage === 'aprovado').length,
  }), [items])

  const hasFilters = !!(query || house !== 'Todas' || stage)
  const clearFilters = () => { setQuery(''); setHouse('Todas'); setStage('') }

  const exportItems = () => {
    exportCSV(
      filtered.map((i) => ({
        Identificador: i.code,
        Título: i.title,
        Casa: i.house,
        Tema: i.theme,
        Estágio: LEG_STAGE[i.stage]?.label || i.stage,
        Relevância: i.relevance,
        Relator: i.rapporteur,
        Atualizado: formatDateBR(i.updated),
        Ementa: i.summary,
        'Impacto para a defesa': i.impactBR,
      })),
      `radar-legislativo-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} proposição(ões) exportada(s) em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Radar Legislativo"
        description="Proposições em tramitação no Congresso Nacional que alteram capacidade, orçamento ou regras de emprego das Forças Armadas."
        help="As proposições vêm da API de Dados Abertos da Câmara dos Deputados, buscadas por 13 palavras-chave de defesa. O estágio de tramitação é derivado do texto oficial de situação. A RELEVÂNCIA para a defesa não é preenchida: classificá-la exige ler a proposição e decidir o que ela significa, e o servidor não faz esse juízo."
        breadcrumb={[{ label: 'Brasil Estratégico' }, { label: 'Radar Legislativo' }]}
        badges={<Badge type={meta?.source === 'live' ? 'live' : 'demo'} />}
        actions={
          <Can do="reports.export">
            <button onClick={exportItems} className="btn-ghost text-sm" disabled={!filtered.length}>
              <Download size={15} /> Exportar CSV
            </button>
          </Can>
        }
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={FileText} label="Proposições acompanhadas" value={String(stats.total || '—')} hint="com impacto sobre defesa" accent="brand" />
        <MetricCard icon={TrendingUp} label="Em tramitação avançada" value={String(stats.advanced)} hint="plenário, sanção ou aprovadas" accent="amber" />
        <MetricCard icon={Gavel} label="Alta relevância" value={String(stats.highRelevance)} hint="prioridade de acompanhamento" accent="red" />
        <MetricCard icon={CheckCircle2} label="Já aprovadas" value={String(stats.approved)} hint="convertidas em norma" accent="green" />
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SearchBar placeholder="Buscar por número, título ou tema…" defaultValue={query} onChange={setQuery} />
          <select value={house} onChange={(e) => setHouse(e.target.value)} className="input" aria-label="Filtrar por casa legislativa">
            {HOUSES.map((h) => <option key={h} value={h}>{h === 'Todas' ? 'Todas as casas' : h}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenação">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
            <Filter size={13} /> Estágio de tramitação
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LEG_STAGE).map(([id, meta]) => {
              const Icon = STAGE_ICON[id] || CircleDot
              return (
                <button
                  key={id}
                  onClick={() => setStage(stage === id ? '' : id)}
                  aria-pressed={stage === id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${meta.classes} ${
                    stage === id ? 'ring-2 ring-gold-500/60' : ''
                  }`}
                >
                  <Icon size={12} /> {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <p className="text-sm muted">{filtered.length} de {items.length} proposição(ões)</p>
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
        skeletonCount={3}
        emptyProps={{
          icon: Landmark,
          tone: 'filter',
          title: hasFilters ? 'Nenhuma proposição corresponde aos filtros' : 'Nenhuma proposição acompanhada',
          hint: hasFilters ? 'Ajuste a busca, a casa ou o estágio de tramitação.' : 'O radar legislativo ainda não foi alimentado.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div className="space-y-3">
          {filtered.map((item) => (
            <ProposalCard key={item.id} item={item} onOpen={() => setOpen(item)} />
          ))}
        </div>
      </DataState>

      <p className="text-center text-xs muted">
        Conteúdo demonstrativo — proposições ilustrativas, sem valor oficial.
      </p>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.code} maxWidth="max-w-2xl">
        {open && <ProposalDetail item={open} />}
      </Modal>
    </div>
  )
}

// ── Cartão de proposição ─────────────────────────────────────────────────────
function ProposalCard({ item, onOpen }) {
  const stage = LEG_STAGE[item.stage] || {}
  const Icon = STAGE_ICON[item.stage] || CircleDot

  return (
    <button onClick={onOpen} className="card w-full p-5 text-left transition-colors hover:border-gold-500/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-gold-600 dark:text-gold-400">{item.code}</span>
        <span className="inline-flex items-center gap-1 text-[11px] muted">
          <Building size={11} /> {item.house}
        </span>
        <span className="chip">{item.theme}</span>
        {/* A relevância vem do acervo local; a API não a produz, porque
            classificar o impacto de uma proposição sobre defesa exige lê-la.
            Sem valor, o rótulo some — um "Relevância" seguido de nada parece
            defeito e ensina a desconfiar do resto do cartão. */}
        {item.relevance && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RELEVANCE_CLR[item.relevance] || ''}`}>
            Relevância {item.relevance}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] muted">
          <Clock size={11} /> {timeAgo(item.updated)}
        </span>
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">{item.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed muted">{item.summary}</p>

      {/* Barra de tramitação */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.classes || ''}`}>
            <Icon size={11} /> {stage.label}
          </span>
          <span className="font-mono text-xs font-bold tabular-nums muted">{stage.pct}%</span>
        </div>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
          <span
            className="block h-full rounded-full bg-gold-500 transition-all"
            style={{ width: `${stage.pct || 0}%` }}
          />
        </span>
      </div>

      <p className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-500 dark:text-brand-400">
        Ver tramitação e impacto <ChevronRight size={13} />
      </p>
    </button>
  )
}

// ── Detalhe com linha do tempo das etapas ────────────────────────────────────
function ProposalDetail({ item }) {
  const stage = LEG_STAGE[item.stage] || {}
  const currentIndex = FLOW.indexOf(item.stage)
  const archived = item.stage === 'arquivado'

  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stage.classes || ''}`}>{stage.label}</span>
        {item.relevance && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${RELEVANCE_CLR[item.relevance] || ''}`}>
            Relevância {item.relevance}
          </span>
        )}
        <span className="chip">{item.house}</span>
        <span className="chip">{item.theme}</span>
      </div>

      <div>
        <h3 className="text-lg font-bold leading-snug tracking-tight">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.summary}</p>
      </div>

      {/* Linha do tempo da tramitação */}
      <section>
        <h4 className="text-sm font-bold tracking-tight">Tramitação</h4>
        {archived ? (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 p-3 text-sm muted">
            <ArchiveIcon size={15} /> Proposição arquivada — não seguiu adiante nesta legislatura.
          </p>
        ) : (
          <ol className="mt-3 space-y-0">
            {FLOW.map((step, i) => {
              const meta = LEG_STAGE[step]
              const Icon = STAGE_ICON[step] || CircleDot
              const done = i < currentIndex
              const current = i === currentIndex
              const last = i === FLOW.length - 1
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-military-green/20 text-emerald-800 dark:text-emerald-400'
                          : current ? 'bg-gold-500 text-military-darker'
                            : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      <Icon size={14} />
                    </span>
                    {!last && (
                      <span
                        className={`w-0.5 flex-1 ${done ? 'bg-military-green/40' : 'bg-gray-200 dark:bg-white/10'}`}
                        style={{ minHeight: 22 }}
                      />
                    )}
                  </div>
                  <div className={`pb-4 ${current ? '' : 'opacity-70'}`}>
                    <p className="text-sm font-semibold leading-tight">{meta.label}</p>
                    {current && (
                      <p className="mt-0.5 text-xs text-gold-600 dark:text-gold-400">
                        etapa atual · atualizado em {formatDateBR(item.updated)}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="rounded-xl border-l-4 border-gold-500 bg-white/5 p-4">
        <h4 className="text-sm font-bold tracking-tight">Impacto para a defesa</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.impactBR}</p>
      </section>

      {item.rapporteur && (
        <p className="text-xs muted">
          Relatoria: <strong className="text-gray-700 dark:text-gray-300">{item.rapporteur}</strong>
        </p>
      )}
    </div>
  )
}
