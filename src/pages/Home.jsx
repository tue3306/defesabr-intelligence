import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Clock, ArrowRight, Activity, Target, Newspaper, Globe2,
  CalendarDays, TrendingUp, TrendingDown, Bell, Waves, Lightbulb, BarChart3,
  Landmark, ChevronRight,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import ExchangeWidget from '../components/ui/ExchangeWidget'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { TensionBoard } from '../components/tension/TensionPanel'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useTensionStore, tensionBand } from '../store/tensionStore'
import {
  newsVolume14d, newsCategoriesKeys, militarySpendingBR, mockWeeklyAnalysis,
} from '../data/mockData'
import { strategicPrograms, programsSummary, PROGRAM_FORCES, PROGRAM_STATUS } from '../data/strategicPrograms'
import { calendarEvents, CAL_TYPES } from '../data/strategicCalendar'
import { brazilIndicators } from '../data/economyData'
import { geocorrenteBulletins } from '../data/geocorrenteData'
import { alertMeta } from '../utils/textUtils'
import { formatTime, timeAgo, formatDateBR } from '../utils/dateUtils'

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

// Acento do MetricCard a partir do nível de alerta / faixa de tensão.
const ALERT_ACCENT = { NORMAL: 'green', ATENCAO: 'amber', ALERTA: 'amber', CRITICO: 'red' }
const bandAccent = (level) => {
  const l = tensionBand(level).label
  return l === 'BAIXO' ? 'green' : l === 'CRÍTICO' || l === 'CRITICO' ? 'red' : 'amber'
}

// Programas estratégicos em destaque (curadoria das plataformas mais reconhecíveis).
const FEATURED_PROGRAM_IDS = ['prosub', 'fx2', 'tamandare', 'sgdc']

export default function Home() {
  const { news, source, loading } = useNews()
  const latest = useNewsStore((s) => s.latestClipping)
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const user = useAuthStore((s) => s.user)
  const regions = useTensionStore((s) => s.regions)

  const feed = news.slice(0, 6)
  const weekly = mockWeeklyAnalysis.empresarial

  // ---- Indicadores computados a partir de dados reais do projeto ----
  const alert = alertMeta[latest?.alert_level] || alertMeta.ATENCAO
  const posture = alert?.value ?? 42
  const avgTension = regions.length
    ? Math.round(regions.reduce((acc, r) => acc + (r.level || 0), 0) / regions.length)
    : 0
  const criticalRegions = regions.filter((r) => (r.level || 0) >= 50)

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  })()
  const firstName = user?.name?.split(' ')[0] || 'Analista'
  const execLine =
    latest?.summary_executive?.split('\n').filter(Boolean)[0] ||
    weekly?.scenarios?.[0]?.description ||
    'Sem eventos de ruptura no período. Monitoramento em curso.'

  const featuredPrograms = FEATURED_PROGRAM_IDS
    .map((id) => strategicPrograms.find((p) => p.id === id))
    .filter(Boolean)

  const upcoming = (() => {
    const today = new Date().toISOString().slice(0, 10)
    const sorted = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))
    const future = sorted.filter((e) => e.date >= today)
    return (future.length ? future : sorted).slice(0, 5)
  })()

  const indicators = brazilIndicators.filter((i) => ['defesa', 'cambio', 'risco', 'selic'].includes(i.id))
  const geo = geocorrenteBulletins?.[0]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ───────────── COMANDO / CABEÇALHO DE SITUAÇÃO ───────────── */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <ShieldCheck size={14} /> Painel de Situação
                </span>
                <Badge type="live" />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> Atualizado às {formatTime()}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greeting}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {execLine}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/clipping" className="btn-primary">
                  Ver clipping de hoje <ArrowRight size={16} />
                </Link>
                <Link to="/analise" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  Análise semanal
                </Link>
                <Link to="/apresentacao" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  Modo apresentação
                </Link>
              </div>
            </div>

            {/* Postura nacional (medidor compacto) */}
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

      {/* ───────────── KPIs (computados de dados reais) ───────────── */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={ShieldCheck}
            label="Nível de alerta nacional"
            value={alert.label}
            hint={`${posture}/100 · postura operacional`}
            accent={ALERT_ACCENT[latest?.alert_level] || 'amber'}
          />
          <MetricCard
            icon={Activity}
            label="Tensão média regional"
            value={`${avgTension}/100`}
            hint={`${criticalRegions.length} região(ões) ≥ 50`}
            accent={bandAccent(avgTension)}
          />
          <MetricCard
            icon={Target}
            label="Programas em execução"
            value={`${programsSummary.emExecucao}/${programsSummary.total}`}
            hint={`${programsSummary.progressoMedio}% de avanço médio`}
            accent="green"
          />
          <MetricCard
            icon={Newspaper}
            label="Notícias monitoradas"
            value={loading ? '—' : String(news.length || feed.length || '—')}
            hint={source === 'live' ? 'fontes ao vivo' : 'fontes (demo)'}
            accent="brand"
          />
        </div>
      </Section>

      {/* ───────────── GRID PRINCIPAL: análise (2/3) + trilho (1/3) ───────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna primária */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quadro de situação — Nível de tensão por região (dado real do projeto) */}
          <Section>
            <TensionBoard />
          </Section>

          {/* Mapa de risco */}
          <Section className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Globe2 size={18} className="text-brand-400" /> Mapa de risco — foco Américas
              </h2>
              <Badge type="demo" />
            </div>
            <p className="mb-4 text-sm muted">Passe o cursor ou clique em um país para ver suas notícias de segurança e defesa.</p>
            <GlobalHeatmap height={380} />
          </Section>

          {/* Programas estratégicos em foco (dado real) */}
          <Section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Target size={18} className="text-brand-400" /> Programas estratégicos em foco
              </h2>
              <Link to="/programas" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
                Todos <ChevronRight size={15} />
              </Link>
            </div>
            <div className="space-y-3">
              {featuredPrograms.map((p) => {
                const force = PROGRAM_FORCES[p.force] || {}
                const status = PROGRAM_STATUS[p.status] || {}
                return (
                  <Link
                    key={p.id}
                    to="/programas"
                    className="block rounded-lg border border-gray-200 p-3 transition-colors hover:border-gold-500/30 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: force.color }} />
                        <span className="truncate text-sm font-bold">{p.name}</span>
                        <span className="hidden truncate text-xs muted sm:inline">· {force.label}</span>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.classes || ''}`}>{status.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        <span className="block h-full rounded-full" style={{ width: `${p.progress}%`, background: force.color }} />
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold">{p.progress}%</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Section>
        </div>

        {/* Trilho lateral de inteligência */}
        <div className="space-y-6">
          {/* Próximos eventos (calendário estratégico — dado real) */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <CalendarDays size={17} className="text-brand-400" /> Próximos eventos
              </h2>
              <Link to="/calendario" className="text-xs font-semibold text-brand-400 hover:text-brand-300">Agenda</Link>
            </div>
            <ul className="space-y-3">
              {upcoming.map((e) => {
                const meta = CAL_TYPES[e.type] || {}
                return (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{e.title}</p>
                      <p className="text-xs muted">{formatDateBR(e.date)} · {e.scope}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Section>

          {/* Câmbio ao vivo (API real com fallback) */}
          <ExchangeWidget />

          {/* Indicadores econômicos (dado real) */}
          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Landmark size={17} className="text-brand-400" /> Indicadores
              <InfoTooltip text="Indicadores macro relevantes à defesa (orçamento, câmbio, risco-país). Valores demonstrativos." />
            </h2>
            <ul className="space-y-2.5">
              {indicators.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm muted">{i.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{i.value}</span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${i.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {i.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{i.delta}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/economia" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300">
              Economia & Defesa <ChevronRight size={14} />
            </Link>
          </Section>

          {/* Alertas / notificações recentes (store real) */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bell size={17} className="text-brand-400" /> Alertas recentes
              </h2>
              {unread > 0 && (
                <span className="rounded-full bg-military-red/15 px-2 py-0.5 text-[10px] font-bold text-red-500 dark:text-red-300">
                  {unread} {unread > 1 ? 'novos' : 'novo'}
                </span>
              )}
            </div>
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
            <Link to="/notificacoes" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300">
              Ver todas <ChevronRight size={14} />
            </Link>
          </Section>
        </div>
      </div>

      {/* ───────────── NOTÍCIAS RECENTES (API real com fallback) ───────────── */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Newspaper size={18} className="text-brand-400" /> Notícias recentes
          </h2>
          <Badge type={source === 'live' ? 'live' : 'demo'} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
        </div>
        <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
          Ver todo o clipping <ArrowRight size={15} />
        </Link>
      </Section>

      {/* ───────────── SÍNTESE: análise semanal + boletim geocorrente ───────────── */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Análise semanal (prévia) */}
          <div className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <BarChart3 size={18} className="text-brand-400" /> Análise semanal
              </h2>
              <Badge type="plain" value={weekly?.week} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {latest?.summary_executive?.split('\n').filter(Boolean)[0] || weekly?.scenarios?.[0]?.description}
            </p>
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-300">
                <Lightbulb size={15} /> Principais sinais
              </p>
              <ul className="space-y-1.5 text-sm">
                {(latest?.trends || weekly?.opportunities?.map((o) => o.title) || []).slice(0, 3).map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-400">•</span>
                    <span className="text-gray-300">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/analise" className="btn-ghost mt-5 self-start">
              Ver análise completa <ArrowRight size={15} />
            </Link>
          </div>

          {/* Boletim Geocorrente (EGN) — dado real do projeto */}
          {geo && (
            <div className="card flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Waves size={18} className="text-brand-400" /> Boletim Geocorrente
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${geo.relevance === 'Alta' ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'}`}>
                  Relevância {geo.relevance}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs muted">
                <span className="font-mono text-brand-400">{geo.edition}</span>
                <span>· {geo.region}</span>
                <span>· {geo.theme}</span>
              </div>
              <h3 className="mt-3 font-bold tracking-tight">{geo.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-300">{geo.summary}</p>
              <Link to="/amazonia-azul" className="btn-ghost mt-5 self-start">
                Amazônia Azul <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </Section>

      {/* ───────────── DADOS: volume de notícias + gastos militares ───────────── */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-1 text-base font-bold tracking-tight">Volume de notícias — 14 dias</h2>
            <p className="mb-4 text-sm muted">Distribuição por categoria de Segurança &amp; Defesa.</p>
            <NewsVolumeChart data={newsVolume14d} keys={newsCategoriesKeys} height={240} />
          </div>
          <div className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
              Gastos militares — Brasil
              <InfoTooltip text="Série histórica (R$ bi) e % do PIB. Linha de referência: meta da OTAN de 2% do PIB. Valores demonstrativos." />
            </h2>
            <p className="mb-4 text-sm muted">Série histórica e participação no PIB.</p>
            <MilitarySpendingChart data={militarySpendingBR} mode="dual" height={240} />
          </div>
        </div>
      </Section>

      {/* ───────────── TICKER DE ALERTAS ───────────── */}
      {feed.length > 0 && (
        <div className="on-dark overflow-hidden rounded-xl border border-white/10 bg-military-darker">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap py-2 pl-6 text-sm">
            {[...feed, ...feed].map((n, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-gray-300">
                <Badge type="urgency" value={n.urgency} />
                {n.title}
                <span className="text-gray-600">•</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
