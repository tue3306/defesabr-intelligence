import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, ArrowRight, Newspaper, Globe2, GraduationCap, Sparkles,
  Activity, Target, CalendarDays, ChevronRight, Compass, Lock, BookOpen,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useTensionStore } from '../store/tensionStore'
import { programsSummary } from '../data/strategicPrograms'
import { calendarEvents, CAL_TYPES } from '../data/strategicCalendar'
import { glossary } from '../data/learnData'
import { alertMeta } from '../utils/textUtils'
import { formatDateBR } from '../utils/dateUtils'

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

// Recursos analíticos disponíveis no plano Profissional (upsell honesto).
const PRO_FEATURES = [
  { icon: Activity, text: 'Situação estratégica e mapa de tensão por região' },
  { icon: Target, text: 'Cenários (base/otimista/adverso) e análise de riscos' },
  { icon: Sparkles, text: 'Assistente de IA, relatórios e exportação (PDF/CSV)' },
]

// Dashboard do perfil GRATUITO (Explorar) — leitura e descoberta:
// notícias, visão geral, indicadores básicos, educação e um upsell elegante.
export default function FreeDashboard() {
  const { news, source, loading } = useNews()
  const user = useAuthStore((s) => s.user)
  const latest = useNewsStore((s) => s.latestClipping)
  const regions = useTensionStore((s) => s.regions)

  const feed = news.slice(0, 6)
  const alert = alertMeta[latest?.alert_level] || alertMeta.ATENCAO
  const posture = alert?.value ?? 42
  const avgTension = regions.length
    ? Math.round(regions.reduce((acc, r) => acc + (r.level || 0), 0) / regions.length)
    : 0

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  })()
  const firstName = user?.name?.split(' ')[0] || 'Visitante'

  const upcoming = (() => {
    const today = new Date().toISOString().slice(0, 10)
    const sorted = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))
    const future = sorted.filter((e) => e.date >= today)
    return (future.length ? future : sorted).slice(0, 4)
  })()

  const terms = glossary.slice(0, 3)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* CABEÇALHO — descoberta */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <Compass size={14} /> Visão geral
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-300">
                  Conta gratuita
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greeting}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                Acompanhe as notícias de Segurança &amp; Defesa do Brasil, explore o mapa de risco
                e aprenda os conceitos-chave. As análises completas ficam no plano Profissional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/clipping" className="btn-primary">
                  Ver notícias de hoje <ArrowRight size={16} />
                </Link>
                <Link to="/aprender" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <GraduationCap size={16} /> Centro educacional
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* INDICADORES BÁSICOS (somente leitura) */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard
            icon={ShieldCheck}
            label="Nível de alerta nacional"
            value={alert.label}
            hint={`${posture}/100 · postura do dia`}
            accent="amber"
          />
          <MetricCard
            icon={Activity}
            label="Tensão média regional"
            value={`${avgTension}/100`}
            hint="Panorama do período"
            accent="brand"
          />
          <MetricCard
            icon={Target}
            label="Programas acompanhados"
            value={String(programsSummary.total)}
            hint={`${programsSummary.emExecucao} em execução`}
            accent="green"
          />
        </div>
      </Section>

      {/* GRID: mapa/notícias + trilho de descoberta */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Mapa de risco */}
          <Section className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Globe2 size={18} className="text-brand-400" /> Mapa de risco — foco Américas
              </h2>
              <Badge type="demo" />
            </div>
            <p className="mb-4 text-sm muted">Passe o cursor ou clique em um país para ver suas notícias.</p>
            <GlobalHeatmap height={360} />
          </Section>

          {/* Notícias recentes (sempre gratuitas) */}
          <Section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Newspaper size={18} className="text-brand-400" /> Notícias recentes
              </h2>
              <Badge type={source === 'live' ? 'live' : 'demo'} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : feed.slice(0, 4).map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
            </div>
            <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
              Ver todo o clipping <ArrowRight size={15} />
            </Link>
          </Section>
        </div>

        {/* Trilho lateral */}
        <div className="space-y-6">
          {/* UPSELL — plano Profissional (paywall elegante, não agressivo) */}
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
              <p className="mt-2 text-center text-[11px] muted">Notícias e mapa de risco permanecem gratuitos.</p>
            </div>
          </Section>

          {/* Próximos eventos (descoberta) */}
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

          {/* Centro educacional — glossário essencial */}
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <BookOpen size={17} className="text-brand-400" /> Comece por aqui
              </h2>
              <Link to="/aprender" className="text-xs font-semibold text-brand-400 hover:text-brand-300">Centro</Link>
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
        </div>
      </div>
    </div>
  )
}
