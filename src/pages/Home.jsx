import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Newspaper,
  AlertTriangle,
  Globe2,
  Clock,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import ExchangeWidget from '../components/ui/ExchangeWidget'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { newsVolume14d, newsCategoriesKeys, militarySpendingBR, mockWeeklyAnalysis } from '../data/mockData'
import { formatTime } from '../utils/dateUtils'

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

export default function Home() {
  const { news, source, loading } = useNews()
  const latest = useNewsStore((s) => s.latestClipping)
  const weekly = mockWeeklyAnalysis.empresarial
  const feed = news.slice(0, 6)

  return (
    <div className="space-y-8">
      {/* HERO */}
      <Section className="card overflow-hidden">
        <div className="relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-8 sm:p-10">
          <Badge type="live" className="mb-4" />
          <span className="ml-2 text-xs muted">Atualizado às {formatTime()}</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            DefesaBR Intelligence
          </h1>
          <p className="mt-2 max-w-xl text-gray-300">
            Monitoramento inteligente de Segurança e Defesa — clipping, análise de cenários e dados ao
            vivo, potencializados por IA.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/clipping" className="btn-primary">
              Ver Clipping de Hoje <ArrowRight size={16} />
            </Link>
            <Link to="/dados" className="btn-ghost">
              Explorar dados
            </Link>
          </div>
        </div>
      </Section>

      {/* MÉTRICAS */}
      <Section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Newspaper} label="Notícias Hoje" value="47" delta="+8%" deltaPositive hint="vs. ontem" />
          <MetricCard icon={AlertTriangle} label="Alertas Ativos" value="3" delta="+1" accent="amber" hint="vs. ontem" />
          <MetricCard icon={Globe2} label="Países Monitorados" value="12" accent="green" hint="cobertura global" />
          <MetricCard icon={Clock} label="Última Análise" value="Há 2h" accent="brand" hint="clipping diário" />
        </div>
      </Section>

      {/* FEED + CÂMBIO */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Notícias recentes</h2>
              <Badge type={source === 'live' ? 'live' : 'demo'} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
            </div>
            <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
              Ver todo o clipping <ArrowRight size={15} />
            </Link>
          </div>

          <div className="space-y-6">
            <ExchangeWidget />
          </div>
        </div>
      </Section>

      {/* VOLUME DE NOTÍCIAS */}
      <Section className="card p-5">
        <h2 className="mb-1 text-lg font-bold tracking-tight">Volume de notícias — últimos 14 dias</h2>
        <p className="mb-4 text-sm muted">Distribuição por categoria de Segurança &amp; Defesa.</p>
        <NewsVolumeChart data={newsVolume14d} keys={newsCategoriesKeys} />
      </Section>

      {/* PREVIEW ANÁLISE SEMANAL */}
      <Section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Análise semanal</h2>
          <Badge type="plain" value={weekly.week} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          {latest?.summary_executive?.split('\n')[0] || weekly.scenarios[0].description}
        </p>
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-300">
            <Lightbulb size={15} /> Principais insights
          </p>
          <ul className="space-y-1.5 text-sm">
            {(latest?.trends || weekly.opportunities.map((o) => o.title)).slice(0, 3).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-400">•</span>
                <span className="text-gray-300">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/analise" className="btn-ghost mt-5">
          Ver análise completa <ArrowRight size={15} />
        </Link>
      </Section>

      {/* GASTOS MILITARES BRASIL */}
      <Section className="card p-5">
        <h2 className="mb-1 text-lg font-bold tracking-tight">Gastos militares — Brasil</h2>
        <p className="mb-4 text-sm muted">Série histórica (R$ bi) e % do PIB. Referência: meta da OTAN de 2% do PIB.</p>
        <MilitarySpendingChart data={militarySpendingBR} mode="dual" />
      </Section>

      {/* TICKER DE ALERTAS */}
      <Section className="overflow-hidden rounded-xl border border-gray-700/50 bg-military-darker">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap py-2 pl-6 text-sm">
          {[...feed, ...feed].map((n, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-gray-300">
              <Badge type="urgency" value={n.urgency} />
              {n.title}
              <span className="text-gray-600">•</span>
            </span>
          ))}
        </div>
      </Section>
    </div>
  )
}
