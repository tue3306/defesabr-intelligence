import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Clock, ArrowRight, ChevronRight, Activity, Bot, BarChart3,
  ClipboardList, FileText, Radio, BadgeCheck, AlertTriangle, Bell, Target,
  Layers, CalendarDays, Gauge, Inbox, PenTool, ShieldAlert,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { SkeletonCard } from '../components/ui/Skeleton'
import { TensionBoard } from '../components/tension/TensionPanel'
import { useResource } from '../hooks/useResource'
import { taskingService } from '../services'
import { REFERENCE_DATE } from '../services/config'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useTensionStore, tensionBand } from '../store/tensionStore'
import { PRODUCTION_STAGES, PRIORITY, RFI_STATUS } from '../data/tasking'
import { riskMatrix, RISK_SEVERITY } from '../data/riskMatrix'
import { alertMeta } from '../utils/textUtils'
import { formatTime, formatDateBR, timeAgo } from '../utils/dateUtils'

const Section = ({ children, className = '' }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.4 }}
    className={className}
  >
    {children}
  </motion.section>
)

// A data de referência do conjunto demonstrativo vive em services/config:
// os prazos da fila só fazem sentido em relação a ela.
const TODAY = REFERENCE_DATE

const ALERT_ACCENT = { NORMAL: 'green', ATENCAO: 'amber', ALERTA: 'amber', CRITICO: 'red' }

// Ações de produção — o que o Analista efetivamente FAZ na plataforma.
const PRODUCTION_ACTIONS = [
  { to: '/clipping', icon: Bot, label: 'Gerar clipping', hint: 'Consolidar as últimas 24h com IA' },
  { to: '/analise', icon: BarChart3, label: 'Análise semanal', hint: 'Cenários e recomendações' },
  { to: '/narrativas', icon: Radio, label: 'Classificar narrativas', hint: 'Origem e sinais de coordenação' },
  { to: '/fontes', icon: BadgeCheck, label: 'Avaliar fontes', hint: 'Confiabilidade e critérios' },
  { to: '/riscos', icon: ShieldAlert, label: 'Revisar riscos', hint: 'Probabilidade × impacto' },
  { to: '/relatorios', icon: FileText, label: 'Emitir relatório', hint: 'Briefing, riscos e boletins' },
]

// -----------------------------------------------------------------------------
// PAINEL DO PERFIL ANALISTA — quem PRODUZ inteligência.
//
// Diferente do painel de leitura: aqui a primeira coisa que aparece não é o que
// aconteceu no mundo, e sim o que ESTA PESSOA precisa entregar — fila de
// produção, requisitos pendentes e lacunas de coleta. A situação estratégica
// vem depois, como insumo do trabalho.
// -----------------------------------------------------------------------------
export default function AnalystDashboard() {
  const user = useAuthStore((s) => s.user)
  const latest = useNewsStore((s) => s.latestClipping)
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const regions = useTensionStore((s) => s.regions)

  const summary = useResource(() => taskingService.summary(), [])
  const queue = useResource(() => taskingService.queue(), [])
  const requests = useResource(() => taskingService.requests(), [])
  const collection = useResource(() => taskingService.collection(), [])

  const alert = alertMeta[latest?.alert_level] || alertMeta.ATENCAO
  const posture = alert?.value ?? 42
  const avgTension = regions.length
    ? Math.round(regions.reduce((acc, r) => acc + (r.level || 0), 0) / regions.length)
    : 0

  const firstName = user?.name?.split(' ')[0] || 'Analista'
  const s = summary.data || {}

  // Fila do dia: em produção, ordenada pelo prazo mais apertado.
  const myQueue = [...(queue.data?.items || [])]
    .filter((item) => item.stage !== 'publicado')
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4)

  const openRequests = [...(requests.data?.items || [])]
    .filter((r) => r.status !== 'respondido' && r.status !== 'cancelado')
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4)

  // Lacunas: os requisitos permanentes com menor cobertura pedem atenção antes.
  const weakestPirs = [...(collection.data?.items || [])]
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 3)

  const risingRisks = riskMatrix
    .filter((r) => r.trend === 'up' && (r.severity === 'critico' || r.severity === 'alto'))
    .slice(0, 3)

  const overdue = myQueue.filter((item) => item.due < TODAY).length

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ───────────── MESA DE SITUAÇÃO ───────────── */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold-400">
                  <PenTool size={14} /> Mesa de situação · produção
                </span>
                <Badge type="demo" />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> Atualizado às {formatTime()}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greetingByHour()}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {overdue > 0
                  ? `Você tem ${overdue} ${overdue > 1 ? 'itens' : 'item'} com prazo vencido e ${s.openRfi ?? 0} requisitos de informação em aberto.`
                  : `Fila em dia. ${s.inReview ?? 0} ${s.inReview === 1 ? 'item aguarda' : 'itens aguardam'} revisão e ${s.openRfi ?? 0} requisitos seguem em aberto.`}
              </p>
              {user?.unit && (
                <p className="mt-1 text-xs text-gray-400">{user.unit}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/mesa" className="btn-primary">
                  Abrir mesa de trabalho <ArrowRight size={16} />
                </Link>
                <Link to="/clipping" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <Bot size={16} /> Gerar clipping
                </Link>
                <Link to="/relatorios" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <FileText size={16} /> Emitir relatório
                </Link>
              </div>
            </div>

            {/* Postura nacional — o insumo que baliza toda a produção do dia */}
            <div className="w-full shrink-0 rounded-xl border border-white/10 bg-white/5 p-4 lg:w-64">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Postura nacional</span>
                <InfoTooltip text="Nível de alerta consolidado do período, atribuído na análise diária. Combina gravidade e concentração dos eventos." />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight" style={{ color: alertColor(latest?.alert_level) }}>
                  {alert.label}
                </span>
                <span className="font-mono text-sm text-gray-400">{posture}/100</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${posture}%`, background: alertColor(latest?.alert_level) }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-gray-500">
                <span>Normal</span><span>Crítico</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── KPIs DE PRODUÇÃO ───────────── */}
      <Section>
        {summary.loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              icon={ClipboardList}
              label="Itens em produção"
              value={String(s.open ?? '—')}
              hint={`${s.inReview ?? 0} aguardando revisão`}
              accent={overdue > 0 ? 'red' : 'brand'}
            />
            <MetricCard
              icon={Inbox}
              label="Requisitos abertos (RFI)"
              value={String(s.openRfi ?? '—')}
              hint={s.urgentRfi ? `${s.urgentRfi} urgente(s)` : 'nenhum urgente'}
              accent={s.urgentRfi ? 'red' : 'green'}
            />
            <MetricCard
              icon={Gauge}
              label="Cobertura do plano de coleta"
              value={s.avgCoverage != null ? `${s.avgCoverage}%` : '—'}
              hint={`${s.totalGaps ?? 0} lacuna(s) mapeada(s)`}
              accent={(s.avgCoverage ?? 0) >= 75 ? 'green' : 'amber'}
            />
            <MetricCard
              icon={ShieldCheck}
              label="Nível de alerta nacional"
              value={alert.label}
              hint={`tensão média ${avgTension}/100 · ${tensionBand(avgTension).label}`}
              accent={ALERT_ACCENT[latest?.alert_level] || 'amber'}
            />
          </div>
        )}
      </Section>

      {/* ───────────── AÇÕES DE PRODUÇÃO ───────────── */}
      <Section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <PenTool size={17} className="text-brand-400" /> Ações de produção
        </h2>
        <p className="mb-4 text-sm muted">Os fluxos que só o perfil Analista executa.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTION_ACTIONS.map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="card-interactive card flex items-start gap-3 p-3 transition-colors hover:border-gold-500/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs muted">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ───────────── GRID: fila + trilho de contexto ───────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Minha fila de hoje */}
          <Section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <ClipboardList size={18} className="text-brand-400" /> Minha fila de hoje
                <InfoTooltip text="Itens sob sua responsabilidade que ainda não foram publicados, ordenados pelo prazo mais apertado." />
              </h2>
              <Link to="/mesa" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
                Ver tudo <ChevronRight size={15} />
              </Link>
            </div>

            <DataState
              loading={queue.loading}
              error={queue.error}
              empty={myQueue.length === 0}
              onRetry={queue.refetch}
              skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
              emptyProps={{
                icon: ClipboardList,
                title: 'Fila vazia',
                hint: 'Nenhum item em produção neste momento. Comece um novo produto na mesa de trabalho.',
                action: { label: 'Abrir mesa de trabalho', to: '/mesa' },
                compact: true,
              }}
            >
              <ul className="space-y-3">
                {myQueue.map((item) => {
                  const stage = PRODUCTION_STAGES[item.stage] || {}
                  const priority = PRIORITY[item.priority] || {}
                  const late = item.due < TODAY
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.module || '/mesa'}
                        className="block rounded-lg border border-gray-200 p-3 transition-colors hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${stage.classes || ''}`}>
                            {stage.label}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priority.classes || ''}`}>
                            {priority.label}
                          </span>
                          <span className="text-[11px] muted">{item.type}</span>
                          <span
                            className={`ml-auto text-[11px] font-semibold ${
                              late ? 'text-red-600 dark:text-red-400' : 'muted'
                            }`}
                          >
                            {late ? 'Prazo vencido · ' : 'Prazo '}{formatDateBR(item.due)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold leading-snug">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs muted">{item.summary}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                            <span
                              className="block h-full rounded-full bg-gold-500"
                              style={{ width: `${item.progress}%` }}
                            />
                          </span>
                          <span className="w-9 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums">{item.progress}%</span>
                          <span className="shrink-0 text-[11px] muted">{item.sources} fontes</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </DataState>
          </Section>

          {/* Quadro de tensão — o analista é quem atribui */}
          <Section>
            <TensionBoard />
          </Section>

          {/* Lacunas de coleta */}
          <Section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Target size={18} className="text-brand-400" /> Lacunas de coleta
                <InfoTooltip text="PIR = requisito prioritário de inteligência. A cobertura mede quanto das perguntas essenciais (EEI) as fontes atuais já respondem." />
              </h2>
              <Link to="/mesa" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
                Plano de coleta <ChevronRight size={15} />
              </Link>
            </div>

            <DataState
              loading={collection.loading}
              error={collection.error}
              empty={weakestPirs.length === 0}
              onRetry={collection.refetch}
              skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
              emptyProps={{ icon: Target, title: 'Nenhum requisito cadastrado', hint: 'O plano de coleta ainda não foi definido.', compact: true }}
            >
              <ul className="space-y-3">
                {weakestPirs.map((pir) => (
                  <li key={pir.id} className="rounded-lg bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-medium leading-snug">{pir.pir}</p>
                      <span
                        className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                          pir.coverage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {pir.coverage}%
                      </span>
                    </div>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${pir.coverage}%`,
                          background: pir.coverage >= 75 ? '#2e7d46' : '#d4841a',
                        }}
                      />
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="muted">{pir.sources} fontes</span>
                      {pir.gaps.map((gap) => (
                        <span
                          key={gap}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300"
                        >
                          <AlertTriangle size={10} /> {gap}
                        </span>
                      ))}
                      <Link to={pir.module} className="ml-auto font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
                        Abrir módulo →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Section>
        </div>

        {/* Trilho lateral */}
        <div className="space-y-6">
          {/* Requisitos pendentes */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Inbox size={17} className="text-brand-400" /> Requisitos pendentes
              </h2>
              <Link to="/mesa" className="text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">RFIs</Link>
            </div>

            <DataState
              loading={requests.loading}
              error={requests.error}
              empty={openRequests.length === 0}
              onRetry={requests.refetch}
              skeleton={<div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
              emptyProps={{
                icon: Inbox,
                title: 'Nenhum requisito em aberto',
                hint: 'Todos os pedidos de informação foram respondidos.',
                compact: true,
              }}
            >
              <ul className="space-y-3">
                {openRequests.map((r) => {
                  const priority = PRIORITY[r.priority] || {}
                  const status = RFI_STATUS[r.status] || {}
                  return (
                    <li key={r.id} className="border-l-2 border-gold-500/50 pl-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] muted">{r.id}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${priority.classes || ''}`}>
                          {priority.label}
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.classes || ''}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-snug">{r.question}</p>
                      <p className="mt-0.5 text-[11px] muted">{r.requester} · prazo {formatDateBR(r.due)}</p>
                    </li>
                  )
                })}
              </ul>
            </DataState>
          </Section>

          {/* Riscos em elevação */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <ShieldAlert size={17} className="text-brand-400" /> Riscos em elevação
              </h2>
              <Link to="/riscos" className="text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">Matriz</Link>
            </div>
            {risingRisks.length > 0 ? (
              <ul className="space-y-2.5">
                {risingRisks.map((r) => {
                  const sev = RISK_SEVERITY[r.severity] || {}
                  return (
                    <li key={r.id} className="flex items-start gap-2.5">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: sev.color }} />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
                        <p className="text-[11px] muted">
                          {sev.label} · {r.horizon} · confiança {r.confidence}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="Nenhum risco em elevação"
                hint="Nenhum risco alto ou crítico teve tendência de alta no período."
                compact
              />
            )}
          </Section>

          {/* Alertas recentes */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bell size={17} className="text-brand-400" /> Alertas recentes
              </h2>
              {unread > 0 && (
                <span className="rounded-full bg-military-red/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-300">
                  {unread} {unread > 1 ? 'novos' : 'novo'}
                </span>
              )}
            </div>
            {notifications.length > 0 ? (
              <ul className="space-y-2.5">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id} className={`flex items-start gap-2.5 ${n.read ? 'opacity-60' : ''}`}>
                    <span className="mt-0.5 shrink-0"><Badge type="urgency" value={n.level} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="text-xs muted">{timeAgo(n.time)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Bell} title="Sem alertas" hint="Nenhuma ocorrência registrada no período." compact />
            )}
            <Link to="/notificacoes" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
              Ver todas <ChevronRight size={14} />
            </Link>
          </Section>

          {/* Atalhos de contexto */}
          <Section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Activity size={17} className="text-brand-400" /> Insumos de contexto
            </h2>
            <p className="mt-1 text-sm muted">Módulos que alimentam a produção do dia.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/dossies" className="btn-ghost text-xs"><Layers size={13} /> Dossiês</Link>
              <Link to="/calendario" className="btn-ghost text-xs"><CalendarDays size={13} /> Agenda</Link>
              <Link to="/arquivo" className="btn-ghost text-xs">Arquivo</Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function greetingByHour() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

// Cor sólida do nível de alerta (para a barra de postura no cabeçalho escuro).
function alertColor(level) {
  return {
    NORMAL: '#2e7d46',
    ATENCAO: '#caa733',
    ALERTA: '#d4841a',
    CRITICO: '#c0392b',
  }[level] || '#caa733'
}
