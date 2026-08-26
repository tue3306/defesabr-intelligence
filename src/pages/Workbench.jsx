import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList, Plus, FileText, ArrowRight, Clock, AlertTriangle, Layers,
  MessageSquare, Target, ListChecks, Compass, CheckCircle2, Send, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import MetricCard from '../components/ui/MetricCard'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import InfoTooltip from '../components/ui/InfoTooltip'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import { SkeletonMetric } from '../components/ui/Skeleton'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { taskingService } from '../services'
import { REFERENCE_DATE } from '../services/config'
import { PRODUCTION_STAGES, PRIORITY, RFI_STATUS } from '../data/tasking'
import { useAuthStore } from '../store/authStore'
import { timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// MESA DE TRABALHO DO ANALISTA (/mesa) — onde a inteligência é PRODUZIDA.
//
// Três momentos do ciclo, em três abas:
//   1. Fila de produção  — o que está sendo escrito, revisado e publicado.
//   2. Requisitos (RFI)  — as perguntas formais que chegam à equipe.
//   3. Plano de coleta   — os PIR permanentes, sua cobertura e suas lacunas.
//
// As ações de escrita (avançar estágio, responder RFI, abrir rascunho) operam
// em ESTADO LOCAL: a camada de serviços ainda é somente leitura. Quando houver
// backend, cada handler vira um PATCH/POST no taskingService.
// -----------------------------------------------------------------------------

/** Data de referência do produto — usada para destacar prazos vencidos. */

/** Estágios na ordem do fluxo editorial (rascunho → publicado). */
const STAGE_ORDER = Object.values(PRODUCTION_STAGES).sort((a, b) => a.order - b.order)

/** Progresso mínimo assumido ao entrar em cada estágio — determinístico. */
const STAGE_PROGRESS = { rascunho: 10, revisao: 60, aprovado: 90, publicado: 100 }

/** Módulos que um produto de inteligência pode alimentar. */
const MODULES = [
  { value: '/dossies', label: 'Dossiês' },
  { value: '/narrativas', label: 'Monitor de Narrativas' },
  { value: '/programas', label: 'Programas Estratégicos' },
  { value: '/amazonia-azul', label: 'Amazônia Azul' },
  { value: '/fronteiras', label: 'Fronteiras' },
  { value: '/industria', label: 'Base Industrial de Defesa' },
  { value: '/economia', label: 'Economia da Defesa' },
  { value: '/dados', label: 'Dados & Indicadores' },
  { value: '/clipping', label: 'Clipping Diário' },
]
const MODULE_LABEL = Object.fromEntries(MODULES.map((m) => [m.value, m.label]))

const PRODUCT_TYPES = ['Dossiê', 'Briefing', 'Nota', 'Alerta', 'Clipping']

const CONFIDENCE = { alta: 'alta', media: 'média', baixa: 'baixa' }

/** Datas do domínio chegam como 'AAAA-MM-DD'; converter direto evita desvio de fuso. */
const formatIsoDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')

const nextStageOf = (stage) => STAGE_ORDER.find((s) => s.order === PRODUCTION_STAGES[stage].order + 1)

/** Próximo identificador sequencial da fila — sem aleatoriedade em render. */
function nextQueueId(items) {
  const max = items.reduce((acc, item) => {
    const n = Number(item.id.split('-').pop())
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `prod-2026-${String(max + 1).padStart(3, '0')}`
}

export default function Workbench() {
  const analyst = useAuthStore((s) => s.user?.name) || 'Analista responsável'
  const [tab, setTab] = useState('fila')
  const [newItemOpen, setNewItemOpen] = useState(false)

  // Consultas à camada de serviços (hoje resolvidas localmente, amanhã via API).
  const queueRes = useResource(() => taskingService.queue(), [])
  const rfiRes = useResource(() => taskingService.requests(), [])
  const collectionRes = useResource(() => taskingService.collection(), [])
  const summaryRes = useResource(() => taskingService.summary(), [])

  // Espelho local do que veio do serviço — é sobre ele que o analista age.
  const [queue, setQueue] = useState([])
  const [rfis, setRfis] = useState([])
  useEffect(() => { if (queueRes.data?.items) setQueue(queueRes.data.items) }, [queueRes.data])
  useEffect(() => { if (rfiRes.data?.items) setRfis(rfiRes.data.items) }, [rfiRes.data])

  const collection = collectionRes.data?.items || []
  const summary = summaryRes.data

  const openRfis = rfis.filter((r) => r.status !== 'respondido' && r.status !== 'cancelado')
  const kpisLoading = queueRes.loading || rfiRes.loading || summaryRes.loading

  const advanceStage = (item) => {
    const next = nextStageOf(item.stage)
    if (!next) return
    setQueue((prev) => prev.map((p) => (
      p.id === item.id
        ? { ...p, stage: next.id, progress: Math.max(p.progress, STAGE_PROGRESS[next.id]) }
        : p
    )))
    toast.success(`“${item.title}” avançou para ${next.label}.`)
  }

  const answerRfi = (rfi) => {
    setRfis((prev) => prev.map((r) => (
      r.id === rfi.id ? { ...r, status: 'respondido', answers: r.answers + 1 } : r
    )))
  }

  const addDraft = (draft) => {
    setQueue((prev) => [
      {
        ...draft,
        id: nextQueueId(prev),
        stage: 'rascunho',
        progress: STAGE_PROGRESS.rascunho,
        assignee: analyst,
        reviewer: null,
        sources: 0,
        updatedAt: `${REFERENCE_DATE}T09:00:00`,
      },
      ...prev,
    ])
    toast.success('Rascunho aberto na fila de produção.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Mesa de trabalho"
        description="Onde a inteligência é produzida: fila editorial, requisitos de informação e plano de coleta, do rascunho à difusão."
        help="Área do perfil Analista. Reúne o que está em produção, as perguntas formais recebidas (RFI) e as prioridades permanentes de coleta (PIR)."
        breadcrumb={[{ label: 'Analista' }, { label: 'Mesa de trabalho' }]}
        badges={<Badge type={queueRes.source === 'live' ? 'live' : 'demo'} />}
        meta={[
          { label: 'Referência', value: formatIsoDate(REFERENCE_DATE) },
          { label: 'Responsável', value: analyst },
        ]}
        actions={
          <>
            <Can do="tasking.manage">
              <button onClick={() => setNewItemOpen(true)} className="btn-primary">
                <Plus size={15} /> Novo item
              </button>
            </Can>
            <Link to="/relatorios" className="btn-ghost">
              <FileText size={15} /> Relatórios
            </Link>
          </>
        }
      >
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10">
          <TabBtn active={tab === 'fila'} onClick={() => setTab('fila')} icon={Layers}
            label="Fila de produção" count={queue.length} />
          <TabBtn active={tab === 'rfi'} onClick={() => setTab('rfi')} icon={MessageSquare}
            label="Requisitos (RFI)" count={rfis.length} />
          <TabBtn active={tab === 'coleta'} onClick={() => setTab('coleta')} icon={Target}
            label="Plano de coleta" count={collection.length} />
        </div>
      </PageHeader>

      {/* INDICADORES DO CICLO */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonMetric key={i} />)
        ) : (
          <>
            <MetricCard
              icon={Layers}
              label="Em produção"
              value={queue.filter((p) => p.stage !== 'publicado').length}
              hint={`${queue.filter((p) => p.stage === 'publicado').length} já publicados`}
            />
            <MetricCard
              icon={Clock}
              label="Em revisão"
              value={queue.filter((p) => p.stage === 'revisao').length}
              hint="aguardando par ou editoria"
              accent="amber"
            />
            <MetricCard
              icon={MessageSquare}
              label="RFI abertos"
              value={openRfis.length}
              hint={`${openRfis.filter((r) => r.priority === 'urgente').length} urgente(s)`}
              accent={openRfis.some((r) => r.priority === 'urgente') ? 'red' : 'brand'}
            />
            <MetricCard
              icon={Target}
              label="Cobertura do plano"
              value={`${summary?.avgCoverage ?? 0}%`}
              hint={`${summary?.totalGaps ?? 0} lacunas mapeadas`}
              accent="green"
            />
          </>
        )}
      </div>

      {tab === 'fila' && (
        <QueueTab
          items={queue}
          loading={queueRes.loading}
          error={queueRes.error}
          onRetry={queueRes.refetch}
          onAdvance={advanceStage}
        />
      )}

      {tab === 'rfi' && (
        <RfiTab
          items={rfis}
          collection={collection}
          loading={rfiRes.loading}
          error={rfiRes.error}
          onRetry={rfiRes.refetch}
          onAnswer={answerRfi}
        />
      )}

      {tab === 'coleta' && (
        <CollectionTab
          items={collection}
          loading={collectionRes.loading}
          error={collectionRes.error}
          onRetry={collectionRes.refetch}
        />
      )}

      <NewItemModal open={newItemOpen} onClose={() => setNewItemOpen(false)} onCreate={addDraft} />

      <p className="text-center text-xs muted">
        Dados ilustrativos. As ações desta mesa alteram apenas esta sessão do navegador —
        a persistência será feita pelo backend.
      </p>
    </div>
  )
}

// ── ABA 1 · FILA DE PRODUÇÃO ─────────────────────────────────────────────────
function QueueTab({ items, loading, error, onRetry, onAdvance }) {
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')

  const types = useMemo(() => [...new Set(items.map((i) => i.type))].sort(), [items])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (priority && item.priority !== priority) return false
      if (type && item.type !== type) return false
      if (needle && !`${item.title} ${item.summary} ${item.type}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [items, query, priority, type])

  const hasFilters = Boolean(query || priority || type)
  const clearFilters = () => { setQuery(''); setPriority(''); setType('') }

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
    >
      <CycleProgress items={items} />

      <div className="card grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
        <SearchBar
          placeholder="Buscar por título, tipo ou resumo…"
          defaultValue={query}
          onChange={setQuery}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="input"
          aria-label="Filtrar por prioridade"
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="input"
          aria-label="Filtrar por tipo de produto"
        >
          <option value="">Todos os tipos</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={!filtered.length}
        emptyProps={{
          icon: Filter,
          tone: hasFilters ? 'filter' : 'neutral',
          title: hasFilters ? 'Nenhum item corresponde aos filtros' : 'A fila de produção está vazia',
          hint: hasFilters
            ? 'Ajuste a busca, a prioridade ou o tipo de produto.'
            : 'Abra um rascunho em “Novo item” para começar um produto de inteligência.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters } : undefined,
        }}
      >
        {/* Em telas estreitas o quadro rola horizontalmente; a partir de lg vira grade. */}
        <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {STAGE_ORDER.map((stage) => {
            const column = filtered.filter((i) => i.stage === stage.id)
            return (
              <div key={stage.id} className="w-72 shrink-0 rounded-xl bg-white/5 p-3 lg:w-auto">
                <div className="mb-3 px-1">
                  <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                    <span className={`h-2 w-2 rounded-full ${stage.dot}`} aria-hidden="true" />
                    {stage.label}
                    <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums muted">
                      {column.length}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs leading-snug muted">{stage.description}</p>
                </div>

                <div className="space-y-3">
                  {column.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs muted dark:border-white/10">
                      Nenhum item neste estágio.
                    </p>
                  ) : (
                    column.map((item) => (
                      <QueueCard key={item.id} item={item} onAdvance={onAdvance} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DataState>
    </motion.section>
  )
}

/** Barra do ciclo: quanto do lote já caminhou e como está distribuído. */
function CycleProgress({ items }) {
  const total = items.length
  const average = total
    ? Math.round(items.reduce((a, i) => a + i.progress, 0) / total)
    : 0

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
          Progresso do ciclo
          <InfoTooltip text="Média de conclusão dos produtos em carteira e a distribuição deles pelos quatro estágios do fluxo editorial." />
        </h2>
        <span className="text-2xl font-bold tabular-nums">{average}%</span>
      </div>

      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        {STAGE_ORDER.map((stage) => {
          const share = total ? (items.filter((i) => i.stage === stage.id).length / total) * 100 : 0
          if (!share) return null
          return (
            <span
              key={stage.id}
              className={stage.dot}
              style={{ width: `${share}%` }}
              title={`${stage.label}: ${Math.round(share)}%`}
            />
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {STAGE_ORDER.map((stage) => (
          <span key={stage.id} className="flex items-center gap-1.5 muted">
            <span className={`h-2 w-2 rounded-full ${stage.dot}`} aria-hidden="true" />
            {stage.label}
            <strong className="tabular-nums text-gray-700 dark:text-gray-300">
              {items.filter((i) => i.stage === stage.id).length}
            </strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function QueueCard({ item, onAdvance }) {
  const stage = PRODUCTION_STAGES[item.stage]
  const priority = PRIORITY[item.priority]
  const next = nextStageOf(item.stage)
  const overdue = item.stage !== 'publicado' && item.due < REFERENCE_DATE

  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip">{item.type}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priority.classes}`}>
          {priority.label}
        </span>
      </div>

      <h4 className="mt-2 text-sm font-bold leading-snug tracking-tight">{item.title}</h4>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed muted">{item.summary}</p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] muted">
          <span>Progresso</span>
          <span className="font-semibold tabular-nums">{item.progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Progresso de ${item.title}`}
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div className={`h-full rounded-full ${stage.dot}`} style={{ width: `${item.progress}%` }} />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1">
          <dt className="muted">Prazo:</dt>
          <dd className={overdue ? 'font-semibold text-red-500 dark:text-red-400' : 'font-medium'}>
            {overdue && <AlertTriangle size={11} className="mr-0.5 inline align-[-1px]" aria-hidden="true" />}
            {formatIsoDate(item.due)}
            {overdue && <span className="sr-only"> (prazo vencido)</span>}
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="muted">Fontes:</dt>
          <dd className="font-medium tabular-nums">{item.sources}</dd>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <dt className="muted">Responsável:</dt>
          <dd className="truncate font-medium">{item.assignee}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-white/10">
        <Link
          to={item.module}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:underline"
        >
          {MODULE_LABEL[item.module] || item.module} <ArrowRight size={12} />
        </Link>
        <span className="ml-auto text-[11px] muted">{timeAgo(item.updatedAt)}</span>
      </div>

      {next && (
        <Can do="tasking.manage">
          <button
            onClick={() => onAdvance(item)}
            className="btn-ghost mt-3 w-full justify-center px-2 py-1.5 text-xs"
          >
            <ArrowRight size={13} /> Avançar para {next.label}
          </button>
        </Can>
      )}
    </article>
  )
}

// ── ABA 2 · REQUISITOS DE INFORMAÇÃO (RFI) ───────────────────────────────────
function RfiTab({ items, collection, loading, error, onRetry, onAnswer }) {
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [order, setOrder] = useState('asc')
  const [active, setActive] = useState(null)

  const pirLabel = useMemo(
    () => Object.fromEntries(collection.map((c) => [c.id, c.pir])),
    [collection]
  )

  const filtered = useMemo(() => {
    const list = items.filter((r) => {
      if (status && r.status !== status) return false
      if (priority && r.priority !== priority) return false
      return true
    })
    return list.sort((a, b) => (order === 'asc' ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due)))
  }, [items, status, priority, order])

  const hasFilters = Boolean(status || priority)
  const clearFilters = () => { setStatus(''); setPriority('') }

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
    >
      <div className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          Requisitos de informação
          <InfoTooltip text="RFI (Request for Information) é o pedido formal de resposta a uma pergunta específica. Chega de um cliente interno, entra na fila do analista e só se encerra quando há resposta com fontes e nível de confiança declarados." />
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" aria-label="Filtrar por status do requisito">
            <option value="">Todos os status</option>
            {Object.entries(RFI_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input" aria-label="Filtrar por prioridade do requisito">
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value)} className="input" aria-label="Ordenar por prazo">
            <option value="asc">Prazo mais próximo primeiro</option>
            <option value="desc">Prazo mais distante primeiro</option>
          </select>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={!filtered.length}
        emptyProps={{
          icon: MessageSquare,
          tone: hasFilters ? 'filter' : 'neutral',
          title: hasFilters ? 'Nenhum requisito com esses filtros' : 'Nenhum requisito registrado',
          hint: hasFilters
            ? 'Combine outro status ou outra prioridade para ver os requisitos existentes.'
            : 'Requisitos abertos por clientes internos aparecem aqui assim que registrados.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters } : undefined,
        }}
      >
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-sm">
            <caption className="sr-only">Requisitos de informação recebidos pela mesa do analista</caption>
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th scope="col" className="px-4 py-3 font-semibold">Identificador</th>
                <th scope="col" className="px-4 py-3 font-semibold">Pergunta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Solicitante</th>
                <th scope="col" className="px-4 py-3 font-semibold">Prioridade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Prazo</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Respostas</th>
                <th scope="col" className="px-4 py-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rfi) => {
                const overdue = rfi.status !== 'respondido' && rfi.due < REFERENCE_DATE
                const answered = rfi.status === 'respondido'
                return (
                  <tr key={rfi.id} className="border-b border-gray-100 align-top dark:border-white/[0.06]">
                    <td className="px-4 py-3 font-mono text-xs text-brand-400">{rfi.id}</td>
                    <td className="max-w-md px-4 py-3">
                      <p className="font-medium leading-snug">{rfi.question}</p>
                      {pirLabel[rfi.pir] && (
                        <p className="mt-1 text-xs muted">PIR: {pirLabel[rfi.pir]}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{rfi.requester}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY[rfi.priority].classes}`}>
                        {PRIORITY[rfi.priority].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RFI_STATUS[rfi.status].classes}`}>
                        {RFI_STATUS[rfi.status].label}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 font-mono text-xs ${overdue ? 'font-bold text-red-500 dark:text-red-400' : 'muted'}`}>
                      {formatIsoDate(rfi.due)}
                      {overdue && <span className="sr-only"> (prazo vencido)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{rfi.answers}</td>
                    <td className="px-4 py-3">
                      {answered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} /> Respondido
                        </span>
                      ) : (
                        <Can do="tasking.manage" fallback={<span className="text-xs muted">Somente leitura</span>}>
                          <button onClick={() => setActive(rfi)} className="btn-ghost px-2.5 py-1 text-xs">
                            <Send size={13} /> Responder
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      <AnswerModal
        rfi={active}
        onClose={() => setActive(null)}
        onSubmit={(payload) => {
          onAnswer(active)
          toast.success(`Resposta registrada no ${active.id} com confiança ${CONFIDENCE[payload.confidence]}.`)
          setActive(null)
        }}
      />
    </motion.section>
  )
}

function AnswerModal({ rfi, onClose, onSubmit }) {
  const [answer, setAnswer] = useState('')
  const [confidence, setConfidence] = useState('media')
  const [sources, setSources] = useState('')

  // Limpa o formulário a cada requisito aberto — nunca reaproveita texto anterior.
  useEffect(() => {
    if (rfi) { setAnswer(''); setConfidence('media'); setSources('') }
  }, [rfi])

  const submit = (e) => {
    e.preventDefault()
    if (!answer.trim()) {
      toast.error('Escreva a resposta antes de enviar.')
      return
    }
    onSubmit({ answer: answer.trim(), confidence, sources: sources.trim() })
  }

  return (
    <Modal open={!!rfi} onClose={onClose} title="Responder requisito" maxWidth="max-w-2xl">
      {rfi && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="font-mono text-xs text-brand-400">{rfi.id} · {rfi.requester}</p>
            <p className="mt-1 text-sm leading-relaxed">{rfi.question}</p>
            <p className="mt-2 text-xs muted">Prazo: {formatIsoDate(rfi.due)}</p>
          </div>

          <div>
            <label htmlFor="rfi-answer" className="mb-1 block text-sm font-semibold">Resposta do analista</label>
            <textarea
              id="rfi-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              className="input resize-y"
              placeholder="Síntese da avaliação, com o raciocínio que sustenta a conclusão."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rfi-confidence" className="mb-1 block text-sm font-semibold">Nível de confiança</label>
              <select id="rfi-confidence" value={confidence} onChange={(e) => setConfidence(e.target.value)} className="input">
                <option value="alta">Alta — evidência múltipla e convergente</option>
                <option value="media">Média — evidência parcial</option>
                <option value="baixa">Baixa — indícios isolados</option>
              </select>
            </div>
            <div>
              <label htmlFor="rfi-sources" className="mb-1 block text-sm font-semibold">Fontes citadas</label>
              <input
                id="rfi-sources"
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                className="input"
                placeholder="Ex.: SIAFI, Marinha do Brasil, IBGE"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-ghost justify-center">Cancelar</button>
            <button type="submit" className="btn-primary justify-center">
              <Send size={15} /> Enviar resposta
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ── ABA 3 · PLANO DE COLETA ──────────────────────────────────────────────────
function CollectionTab({ items, loading, error, onRetry }) {
  const stats = useMemo(() => {
    if (!items.length) return null
    const avg = Math.round(items.reduce((a, c) => a + c.coverage, 0) / items.length)
    const gaps = items.reduce((a, c) => a + c.gaps.length, 0)
    const weakest = items.reduce((min, c) => (c.coverage < min.coverage ? c : min), items[0])
    return { avg, gaps, weakest }
  }, [items])

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
    >
      <DataState
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={!items.length}
        emptyProps={{
          icon: Target,
          title: 'Nenhum requisito prioritário definido',
          hint: 'O plano de coleta reúne os PIR permanentes da organização e as lacunas de informação de cada um.',
        }}
      >
        <div className="space-y-4">
          {stats && (
            <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider muted">Cobertura média</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{stats.avg}%</p>
                <p className="text-xs muted">{items.length} requisitos prioritários</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider muted">Lacunas mapeadas</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{stats.gaps}</p>
                <p className="text-xs muted">informação que nenhuma fonte cobre</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider muted">Menor cobertura</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-red-500 dark:text-red-400">{stats.weakest.coverage}%</p>
                <p className="line-clamp-2 text-xs muted">{stats.weakest.pir}</p>
              </div>
            </div>
          )}

          {items.map((pir) => <PirCard key={pir.id} pir={pir} />)}

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Compass size={18} className="text-brand-400" /> Como ler este plano
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="font-semibold">PIR — Priority Intelligence Requirement</dt>
                <dd className="muted">Pergunta permanente que orienta a coleta. Define o que a organização precisa saber o tempo todo, não apenas hoje.</dd>
              </div>
              <div>
                <dt className="font-semibold">EEI — Essential Element of Information</dt>
                <dd className="muted">O dado concreto que, uma vez obtido, responde a parte do PIR. É o que se pede às fontes.</dd>
              </div>
              <div>
                <dt className="font-semibold">Lacuna de coleta</dt>
                <dd className="muted">EEI que nenhuma fonte disponível cobre. Declarar a lacuna é mais honesto do que preencher com estimativa.</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-brand-400">Ciclo de inteligência: </span>
              direção (PIR) → coleta (EEI) → processamento → análise → difusão → avaliação.
              A cobertura abaixo mede quanto dos EEI de cada PIR está efetivamente atendido por fontes ativas.
            </p>
          </div>
        </div>
      </DataState>
    </motion.section>
  )
}

function PirCard({ pir }) {
  const tone = pir.coverage >= 80 ? 'bg-emerald-500' : pir.coverage >= 65 ? 'bg-gold-500' : 'bg-military-red'

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug tracking-tight">{pir.pir}</h3>
          <Link
            to={pir.module}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline"
          >
            {MODULE_LABEL[pir.module] || pir.module} <ArrowRight size={12} />
          </Link>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{pir.coverage}%</p>
          <p className="text-[11px] muted">{pir.sources} fontes ativas</p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`Cobertura de coleta: ${pir.pir}`}
        aria-valuenow={pir.coverage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pir.coverage}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide muted">
            <ListChecks size={13} /> Elementos essenciais (EEI)
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {pir.eei.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <AlertTriangle size={13} /> Lacunas de coleta
          </h4>
          <ul className="mt-2 space-y-1.5">
            {pir.gaps.map((gap) => (
              <li
                key={gap}
                className="rounded-lg border border-military-amber/40 bg-military-amber/10 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-200"
              >
                {gap}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 border-t border-gray-200 pt-3 text-[11px] muted dark:border-white/10">
        Última atualização do plano: {formatIsoDate(pir.lastUpdate)}
      </p>
    </article>
  )
}

// ── NOVO ITEM ────────────────────────────────────────────────────────────────
function NewItemModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '', type: PRODUCT_TYPES[0], priority: 'media', due: '', module: MODULES[0].value, summary: '',
  })

  useEffect(() => {
    if (open) {
      setForm({ title: '', type: PRODUCT_TYPES[0], priority: 'media', due: '', module: MODULES[0].value, summary: '' })
    }
  }, [open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Dê um título ao produto antes de abrir o rascunho.')
      return
    }
    if (!form.due) {
      toast.error('Defina um prazo de entrega.')
      return
    }
    onCreate({
      ...form,
      title: form.title.trim(),
      summary: form.summary.trim() || 'Rascunho aberto na mesa de trabalho — escopo a definir.',
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir novo item de produção" maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="item-title" className="mb-1 block text-sm font-semibold">Título do produto</label>
          <input
            id="item-title"
            value={form.title}
            onChange={set('title')}
            className="input"
            placeholder="Ex.: Nota de avaliação — logística no arco norte"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="item-type" className="mb-1 block text-sm font-semibold">Tipo</label>
            <select id="item-type" value={form.type} onChange={set('type')} className="input">
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="item-priority" className="mb-1 block text-sm font-semibold">Prioridade</label>
            <select id="item-priority" value={form.priority} onChange={set('priority')} className="input">
              {Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="item-due" className="mb-1 block text-sm font-semibold">Prazo de entrega</label>
            <input id="item-due" type="date" value={form.due} onChange={set('due')} className="input" min={REFERENCE_DATE} />
          </div>
          <div>
            <label htmlFor="item-module" className="mb-1 block text-sm font-semibold">Módulo de destino</label>
            <select id="item-module" value={form.module} onChange={set('module')} className="input">
              {MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="item-summary" className="mb-1 block text-sm font-semibold">Escopo (opcional)</label>
          <textarea
            id="item-summary"
            value={form.summary}
            onChange={set('summary')}
            rows={3}
            className="input resize-y"
            placeholder="O que este produto precisa responder e para quem."
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost justify-center">Cancelar</button>
          <button type="submit" className="btn-primary justify-center">
            <Plus size={15} /> Abrir rascunho
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-gold-500 text-gold-600 dark:text-gold-400'
          : 'border-transparent muted hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      <Icon size={16} /> {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'bg-white/10 muted'}`}>
        {count}
      </span>
    </button>
  )
}
