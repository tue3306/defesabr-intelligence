import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Newspaper, Globe2, BarChart3, LineChart, GraduationCap, ShieldCheck,
  ArrowRight, Sparkles, BookOpen, Brain, RotateCcw, Check, Linkedin, Twitter, Youtube, Instagram,
} from 'lucide-react'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import Paywall from '../components/ui/Paywall'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import GaugeChart from '../components/charts/GaugeChart'
import { useNews } from '../hooks/useNews'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { LANDING_FEATURES, PLANS } from '../data/plansData'
import { glossary } from '../data/learnData'
import { mockWeeklyAnalysis, militarySpendingBR, newsVolume14d, newsCategoriesKeys, alertIndex } from '../data/mockData'

const FEATURE_ICONS = { Newspaper, Globe2, BarChart3, LineChart, GraduationCap, ShieldCheck }
const SOCIALS = [
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com' },
  { icon: Twitter, label: 'X', href: 'https://x.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com' },
]

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

export default function Landing() {
  const { news, loading } = useNews()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const isPaid = useSubscriptionStore((s) => s.isPaid)()

  const feed = news.slice(0, 3)
  const analysis = mockWeeklyAnalysis.empresarial

  return (
    <div className="space-y-10">
      {/* HERO */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/50 p-8 sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <ShieldCheck size={14} /> Inteligência em Defesa & Segurança
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {isAuthenticated ? (
              <>Bem-vindo de volta, {user?.name?.split(' ')[0]}.</>
            ) : (
              <>O cenário de defesa do Brasil, <span className="text-brand-400">decifrado por IA</span>.</>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-300 sm:text-lg">
            Clipping diário, análise de cenários, mapas de risco e dados ao vivo — para empresas,
            instituições, pesquisadores e estudantes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Link to="/painel" className="btn-primary">Ir para o painel <ArrowRight size={16} /></Link>
            ) : (
              <Link to="/planos" className="btn-primary"><Sparkles size={16} /> Ver planos</Link>
            )}
            <Link to="/painel" className="btn-ghost border-white/30 text-white hover:bg-white/10">
              Explorar painel
            </Link>
            <Link to="/aprender" className="btn-ghost border-white/30 text-white hover:bg-white/10">
              Centro educacional
            </Link>
          </div>
          <div className="mt-7 flex items-center gap-4">
            <span className="text-xs uppercase tracking-wide text-gray-400">Siga</span>
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="text-gray-300 hover:text-white">
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* POR QUE USAR */}
      <Section>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-400">Conceitos-chave</p>
        <h2 className="mt-1 text-center text-2xl font-bold tracking-tight">Por que usar esta plataforma?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          Tudo o que você precisa para acompanhar Segurança e Defesa em um só lugar.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.icon] || ShieldCheck
            return (
              <div key={f.title} className="card p-5">
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <Icon size={22} />
                </span>
                <h3 className="font-bold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{f.text}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* MAPA GLOBAL */}
      <Section className="card p-5 sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Panorama global de risco</h2>
          <Badge type="demo" />
        </div>
        <p className="mb-4 text-sm muted">Intensidade de eventos de segurança por país. Passe o cursor para ver os detalhes.</p>
        <GlobalHeatmap height={420} />
      </Section>

      {/* PLATAFORMA EM AÇÃO (showcase de dados/gráficos) */}
      <Section>
        <h2 className="text-center text-2xl font-bold tracking-tight">A plataforma em ação</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          Dados e indicadores que você acompanha por dentro — gastos de defesa, volume de notícias e índice de alerta.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-1 text-base font-bold tracking-tight">Gastos militares — Brasil</h3>
            <p className="mb-3 text-xs muted">Série histórica (R$ bi) e % do PIB.</p>
            <MilitarySpendingChart data={militarySpendingBR} mode="dual" height={260} />
          </div>
          <div className="card flex flex-col p-5">
            <h3 className="mb-1 text-base font-bold tracking-tight">Índice de alerta</h3>
            <p className="mb-2 text-xs muted">Resume a tensão de segurança do momento (0–100).</p>
            <div className="flex flex-1 items-center">
              <GaugeChart value={alertIndex} height={200} />
            </div>
            {/* Legenda das faixas — ajuda a interpretar o número */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] muted">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#4a7c59' }} /> Normal</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#d4b41a' }} /> Atenção</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#d4841a' }} /> Alerta</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#c0392b' }} /> Crítico</span>
            </div>
          </div>
          <div className="card p-5 lg:col-span-3">
            <h3 className="mb-1 text-base font-bold tracking-tight">Volume de notícias — 14 dias</h3>
            <p className="mb-3 text-xs muted">Distribuição por categoria de Segurança &amp; Defesa.</p>
            <NewsVolumeChart data={newsVolume14d} keys={newsCategoriesKeys} height={240} />
          </div>
        </div>
      </Section>

      {/* NOTÍCIAS (ABERTAS) */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Notícias recentes</h2>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Acesso livre</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
        </div>
        <Link to="/painel" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
          Ver mais notícias <ArrowRight size={15} />
        </Link>
      </Section>

      {/* ANÁLISES (PAYWALL) */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Análises & briefings estratégicos</h2>
          {!isPaid && <span className="rounded-full bg-forca-defesa/15 px-2.5 py-0.5 text-xs font-semibold text-forca-defesa">Premium</span>}
        </div>
        <Paywall
          active={!isPaid}
          title="Análises completas são exclusivas para assinantes"
          desc="Cenários, probabilidades e recomendações por perfil. Assine para desbloquear."
        >
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <Badge type="plain" value={analysis.week} />
              <span className="text-xs muted">Perspectiva empresarial</span>
            </div>
            <h3 className="mt-3 text-lg font-bold tracking-tight">{analysis.scenarios[0].title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{analysis.scenarios[0].description}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {analysis.scenarios.map((sc) => (
                <div key={sc.type} className="rounded-lg border border-gray-700/40 bg-white/5 p-3">
                  <p className="text-xs font-bold uppercase muted">{sc.type}</p>
                  <p className="mt-1 text-2xl font-bold text-brand-400">{sc.probability}%</p>
                  <p className="mt-1 text-xs text-gray-300">{sc.title}</p>
                </div>
              ))}
            </div>
          </div>
        </Paywall>
      </Section>

      {/* MINI GLOSSÁRIO + CONCEITO DO DIA */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Mini glossário */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <BookOpen size={20} className="text-brand-400" /> Glossário essencial
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {glossary.slice(0, 6).map((g) => (
                <div key={g.term} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold tracking-tight">{g.term}</h3>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{g.category}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-gray-300">{g.definition}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm muted">
              Glossário completo no <Link to="/planos" className="font-semibold text-brand-400 hover:text-brand-300">plano Simples ou Completo</Link>{' '}
              · ou explore o <Link to="/aprender" className="font-semibold text-brand-400 hover:text-brand-300">Centro Educacional</Link>.
            </p>
          </div>

          {/* Conceito do dia (mini-interação) */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <Brain size={20} className="text-brand-400" /> Conceito do dia
            </h2>
            <ConceptOfDay />
          </div>
        </div>
      </Section>

      {/* PLANOS (PREVIEW) */}
      <Section>
        <h2 className="text-center text-2xl font-bold tracking-tight">Planos para cada necessidade</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm muted">Comece grátis. Faça upgrade quando quiser.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`card flex flex-col p-6 ${p.highlight ? 'border-brand-500/60 ring-1 ring-brand-500/40' : ''}`}>
              <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-2xl font-extrabold">{p.price}</span>
                <span className="mb-1 text-xs muted">{p.period}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/planos" className={`mt-5 ${p.highlight ? 'btn-primary' : 'btn-ghost'} w-full justify-center`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="card overflow-hidden">
        <div className="on-dark flex flex-col items-center gap-4 bg-gradient-to-br from-brand-900/40 via-military-card to-military-darker p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pronto para começar?</h2>
          <p className="max-w-xl text-gray-300">Crie sua conta gratuita e tenha o panorama de Defesa do Brasil na palma da mão.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/planos" className="btn-primary"><Sparkles size={16} /> Ver planos</Link>
            <Link to="/painel" className="btn-ghost border-white/30 text-white hover:bg-white/10">Explorar painel</Link>
          </div>
        </div>
      </Section>
    </div>
  )
}

function ConceptOfDay() {
  const concept = glossary[new Date().getDate() % glossary.length]
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="card flex h-full min-h-[200px] flex-col p-5">
      <span className="self-start rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-300">
        {concept.category}
      </span>
      <h3 className="mt-3 text-xl font-bold tracking-tight">{concept.term}</h3>
      {revealed ? (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-300">{concept.definition}</p>
      ) : (
        <p className="mt-2 flex-1 text-sm italic muted">Você sabe o que significa? Clique para revelar.</p>
      )}
      <button onClick={() => setRevealed((r) => !r)} className="btn-ghost mt-3 self-start text-xs">
        {revealed ? (<><RotateCcw size={14} /> Ocultar</>) : 'Revelar definição'}
      </button>
    </div>
  )
}
