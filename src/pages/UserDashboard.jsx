import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Clock, ArrowRight, ChevronRight, Activity, Target, Newspaper,
  Globe2, CalendarDays, TrendingUp, TrendingDown, Bell, Waves, Lightbulb,
  BarChart3, Landmark, Bookmark, Star, Sparkles, Compass, GraduationCap,
  BookOpen, Map, Scale, Factory, Bot, FileText, Radar, Tv, DollarSign, Database,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import InfoTooltip from '../components/ui/InfoTooltip'
import ExchangeWidget from '../components/ui/ExchangeWidget'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import Can from '../auth/Can'
import { useCan, useProfileMeta } from '../auth/useCan'
import { PLAN_LABELS } from '../auth/permissions'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useGastoMilitar } from '../hooks/useDadosReais'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { useSettingsStore } from '../store/settingsStore'
import {
} from '../data/mockData'
import { brazilIndicators } from '../data/economyData'
import { glossary } from '../data/learnData'
import { alertMeta, categoryColor } from '../utils/textUtils'
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

// Acento do MetricCard a partir do nível de alerta.
//
// Havia aqui um `bandAccent` que chamava `tensionBand`, removido junto com o
// módulo de nível de tensão. A função ficou chamando um nome inexistente — o
// build não reclama, e a tela quebrava ao montar.
const ALERT_ACCENT = { NORMAL: 'green', ATENCAO: 'amber', ALERTA: 'amber', CRITICO: 'red' }

// Programas em destaque: curadoria fixa das plataformas mais reconhecíveis.

// Trilho de descoberta do plano Explorar — módulos abertos a todo assinante.
const DISCOVERY_MODULES = [
  { to: '/clipping', icon: Newspaper, label: 'Clipping diário', hint: 'O que foi coletado e aprovado pelo filtro' },
  { to: '/legislativo', icon: Landmark, label: 'Radar legislativo', hint: 'Proposições da Câmara sobre defesa' },
  { to: '/industria', icon: Factory, label: 'Indústria & Exportações', hint: 'Comex Stat: o que o Brasil exportou' },
  { to: '/economia', icon: DollarSign, label: 'Economia & Defesa', hint: 'Banco Central e World Bank' },
  { to: '/dados', icon: BarChart3, label: 'Dados & Gráficos', hint: 'Séries do acervo e comparativos' },
  { to: '/fontes', icon: Database, label: 'Confiabilidade das fontes', hint: 'Disponibilidade medida de cada fonte' },
]

// O que o plano Profissional acrescenta — upsell honesto, sem exagero.
const PRO_FEATURES = [
  { icon: Activity, text: 'Quadro de tensão por região e análise semanal completa' },
  { icon: Radar, text: 'Matriz de riscos, cenários e monitor de narrativas (FIMI)' },
  { icon: Sparkles, text: 'Assistente de IA, relatórios e exportação (PDF/CSV)' },
]

// -----------------------------------------------------------------------------
// PAINEL DO PERFIL USUÁRIO — quem CONSOME inteligência.
// Um único painel que se adapta ao PLANO: o núcleo de leitura (situação, mapa,
// notícias, agenda, pasta e alertas) é sempre entregue; a profundidade
// analítica aparece sob a capacidade `analysis.full`, e na sua ausência o
// espaço vira descoberta + educação + convite honesto ao plano Profissional.
// -----------------------------------------------------------------------------
export default function UserDashboard() {
  const { news, source, loading } = useNews()
  const can = useCan()
  const profileMeta = useProfileMeta()
  const plan = useSubscriptionStore((s) => s.plan)
  const user = useAuthStore((s) => s.user)
  const latest = useNewsStore((s) => s.latestClipping)
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const favorites = useNewsStore((s) => s.favorites)
  const interestAreas = useSettingsStore((s) => s.interestAreas)

  // Única leitura de capacidade fora do JSX: define a densidade do painel.
  const full = can('analysis.full')

  const feed = news.slice(0, 6)

  const alert = alertMeta[latest?.alert_level] || alertMeta.ATENCAO
  const posture = alert?.value ?? 42
  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()


  const firstName = user?.name?.split(' ')[0] || 'Analista'
  const execLine = full
    ? latest?.summary_executive?.split('\n').filter(Boolean)[0]
      || 'Sem eventos de ruptura no período. Monitoramento em curso.'
    : 'Acompanhe as ocorrências de Segurança & Defesa do Brasil, explore o mapa de risco e conheça os programas estratégicos. As análises completas ficam no plano Profissional.'


  const indicators = brazilIndicators.filter((i) => ['defesa', 'cambio', 'risco', 'selic'].includes(i.id))
  const terms = glossary.slice(0, 3)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ───────────── CABEÇALHO DE SITUAÇÃO ───────────── */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <ShieldCheck size={14} /> Painel de Situação
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ background: `${profileMeta.color}26`, color: profileMeta.color }}
                >
                  {profileMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-300">
                  Plano {PLAN_LABELS[plan] || PLAN_LABELS.explorar}
                </span>
                <Badge type={source === 'live' ? 'live' : 'demo'} />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> Atualizado às {formatTime()}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greetingByHour()}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {execLine}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/clipping" className="btn-primary">
                  Ver clipping de hoje <ArrowRight size={16} />
                </Link>
                <Can
                  do="analysis.full"
                  fallback={
                    <Link to="/aprender" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                      <GraduationCap size={16} /> Centro educacional
                    </Link>
                  }
                >
                  <Link to="/analise" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                    <BarChart3 size={16} /> Análise semanal
                  </Link>
                </Can>
                <Can do="presentation.mode">
                  <Link to="/apresentacao" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                    <Tv size={16} /> Modo apresentação
                  </Link>
                </Can>
              </div>
            </div>

            {/* Postura nacional — medidor compacto (capacidade básica de leitura) */}
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
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span>Normal</span><span>Crítico</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── KPIs ───────────── */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={ShieldCheck}
            label="Nível de alerta nacional"
            value={alert.label}
            hint={`${posture}/100 · postura do dia`}
            accent={ALERT_ACCENT[latest?.alert_level] || 'amber'}
          />

          <MetricCard
            icon={Newspaper}
            label="Notícias monitoradas"
            value={loading ? '—' : String(news.length || feed.length || '—')}
            // A dica dizia só "fontes ao vivo", encostada num número que conta
            // NOTÍCIAS: lia-se "40 fontes ao vivo", e são 21 fontes. O número
            // estava certo e a legenda o desmentia.
            hint={source === 'live' ? 'no acervo, coletadas ao vivo' : 'no acervo local'}
            accent="brand"
          />
        </div>
      </Section>

      {/* ───────────── AÇÕES RÁPIDAS + ÁREAS MONITORADAS ───────────── */}
      <Section className="card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link to="/clipping" className="btn-ghost text-sm"><Newspaper size={15} /> Clipping diário</Link>
            <Can do="risk.access">
              <Link to="/riscos" className="btn-ghost text-sm"><Radar size={15} /> Matriz de riscos</Link>
            </Can>
            <Can do="reports.export">
              <Link to="/relatorios" className="btn-ghost text-sm"><FileText size={15} /> Relatórios</Link>
            </Can>
            <Can do="ai.assistant">
              <Link to="/dossies" className="btn-ghost text-sm"><Bot size={15} /> Dossiês assistidos</Link>
            </Can>
            <Can not do="analysis.full">
              <Link to="/planos" className="btn-primary text-sm">
                <Sparkles size={15} /> Conhecer o plano Profissional
              </Link>
            </Can>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider muted">Áreas monitoradas</p>
            {interestAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {interestAreas.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: `${categoryColor(a)}22`, color: categoryColor(a) }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(a) }} /> {a}
                  </span>
                ))}
              </div>
            ) : (
              <Link to="/conta" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
                <Star size={13} /> Escolher áreas de interesse
              </Link>
            )}
          </div>
        </div>
      </Section>

      {/* ───────────── GRID PRINCIPAL: conteúdo (2/3) + trilho (1/3) ───────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Aqui ficava <TensionBoard />, sob a capacidade `analysis.full`.
              O componente não existe mais: sumiu com a loja de tensão, cujos
              níveis por região eram escritos à mão. O nome ficou, e teria
              derrubado este painel para todo assinante do plano Profissional —
              o mesmo erro que já derrubou a produção uma vez.

              O que sobra abaixo é medido: cobertura por país conta menções em
              notícia coletada, e diz isso no próprio texto. */}

          {/* Mapa de risco — sempre disponível */}
          <Section className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Globe2 size={18} className="text-brand-400 dark:text-brand-300" /> Cobertura por país
              </h2>
            </div>
            {/* Chamava-se "Mapa de risco" e não mede risco: conta menções em
                notícia coletada. O selo saiu porque o próprio mapa já declara
                a origem — ele diz quantas notícias sustentam cada país. */}
            <p className="mb-4 text-sm muted">
              Quantas notícias coletadas mencionam cada país. Clique para ver as manchetes.
            </p>
            <GlobalHeatmap height={full ? 380 : 360} />
          </Section>

          {/* Programas em foco — profundidade analítica */}

          {/* Trilho de descoberta — ocupa o espaço da análise no plano Explorar */}
          <Can not do="analysis.full">
            <Section className="card p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Compass size={18} className="text-brand-400 dark:text-brand-300" /> Explore a plataforma
                </h2>
                <Link to="/aprender" className="text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
                  Centro educacional
                </Link>
              </div>
              <p className="mb-4 text-sm muted">Seis módulos abertos ao seu plano, com dados do Brasil Estratégico.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DISCOVERY_MODULES.map(({ to, icon: Icon, label, hint }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-gold-500/30 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{label}</span>
                      <span className="block truncate text-xs muted">{hint}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          </Can>
        </div>

        {/* ───────────── TRILHO LATERAL ───────────── */}
        <div className="space-y-6">
          {/* Convite ao plano Profissional — primeiro no trilho de quem não tem análise */}
          <Can not do="analysis.full">
            <Section className="card overflow-hidden">
              <div className="bg-gradient-to-br from-gold-500/15 to-transparent p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400">
                  <Sparkles size={12} /> Plano Profissional
                </span>
                <h2 className="mt-2 text-base font-bold tracking-tight">Análise completa de inteligência</h2>
                <ul className="mt-3 space-y-2">
                  {PRO_FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2 text-sm muted">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/15 text-brand-300">
                        <Icon size={13} />
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/planos" className="btn-primary mt-4 w-full justify-center text-sm">
                  Ver planos <ArrowRight size={15} />
                </Link>
                <p className="mt-2 text-center text-[11px] muted">
                  Clipping, mapa de risco e agenda continuam no seu plano atual.
                </p>
              </div>
            </Section>
          </Can>

          {/* Câmbio e indicadores — leitura econômica do plano pago */}
          <Can do="analysis.full">
            <ExchangeWidget />
          </Can>

          <Can do="analysis.full">
            <Section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
                <Landmark size={17} className="text-brand-400 dark:text-brand-300" /> Indicadores
                <InfoTooltip text="Indicadores macro relevantes à defesa (orçamento, câmbio, risco-país). Valores demonstrativos." />
              </h2>
              <ul className="space-y-2.5">
                {indicators.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm muted">{i.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{i.value}</span>
                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${i.positive ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'}`}>
                        {i.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{i.delta}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/economia" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
                Economia &amp; Defesa <ChevronRight size={14} />
              </Link>
            </Section>
          </Can>

          {/* Alertas recentes */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bell size={17} className="text-brand-400 dark:text-brand-300" /> Alertas recentes
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
            <Link to="/notificacoes" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
              Ver todas <ChevronRight size={14} />
            </Link>
          </Section>

          {/* Minha Pasta */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bookmark size={17} className="text-brand-400 dark:text-brand-300" /> Minha Pasta
              </h2>
              <Link to="/arquivo" className="text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">Abrir</Link>
            </div>
            {favorites.length > 0 ? (
              <ul className="space-y-2.5">
                {favorites.slice(0, 4).map((f) => (
                  <li key={f.id} className="flex items-start gap-2">
                    <Star size={14} className="mt-0.5 shrink-0 text-gold-500 dark:text-gold-400" />
                    <p className="truncate text-sm">{f.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={Bookmark}
                title="Sua pasta está vazia"
                hint="Use “Salvar” em qualquer notícia para montar seu dossiê pessoal."
                action={{ label: 'Abrir clipping', to: '/clipping', icon: Newspaper }}
              />
            )}
          </Section>

          {/* Centro educacional — glossário essencial no plano Explorar */}
          <Can not do="analysis.full">
            <Section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <BookOpen size={17} className="text-brand-400 dark:text-brand-300" /> Comece por aqui
                </h2>
                <Link to="/aprender" className="text-xs font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">Centro</Link>
              </div>
              <ul className="space-y-2.5">
                {terms.map((t) => (
                  <li key={t.term} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-sm font-bold tracking-tight">{t.term}</p>
                    <p className="line-clamp-2 text-xs muted">{t.definition}</p>
                  </li>
                ))}
              </ul>
            </Section>
          </Can>
        </div>
      </div>

      {/* ───────────── NOTÍCIAS RECENTES ───────────── */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Newspaper size={18} className="text-brand-400 dark:text-brand-300" /> Notícias recentes
          </h2>
          <Badge type={source === 'live' ? 'live' : 'demo'} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
        </div>
        <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
          Ver todo o clipping <ArrowRight size={15} />
        </Link>
      </Section>



      {/* ───────────── DADOS: volume de notícias + gastos militares ───────────── */}
      <Can do="analysis.full">
        <Section>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-1 text-base font-bold tracking-tight">Volume de notícias — 14 dias</h2>
              <p className="mb-4 text-sm muted">Notícias coletadas por dia, agrupadas por categoria.</p>
              <NewsVolumeChart data={volume.data} keys={volume.keys} height={240} />
            </div>
            <div className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                Gastos militares — Brasil
                <InfoTooltip text="Série do World Bank: gasto militar em US$ correntes e como % do PIB. A linha de referência é a meta da OTAN, 2% do PIB." />
              </h2>
              <p className="mb-4 text-sm muted">World Bank Open Data — série histórica.</p>
              <MilitarySpendingChart data={gasto.data} mode={gasto.aoVivo ? 'usd' : 'dual'} height={240} />
            </div>
          </div>
        </Section>
      </Can>

      {/* ───────────── TICKER DE ALERTAS ───────────── */}
      {feed.length > 0 && (
        <div className="on-dark overflow-hidden rounded-xl border border-white/10 bg-military-darker">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap py-2 pl-6 text-sm">
            {[...feed, ...feed].map((n, i) => (
              <span key={`${n.id}-${i}`} className="inline-flex items-center gap-2 text-gray-300">
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
