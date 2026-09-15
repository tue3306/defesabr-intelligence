import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  Clock,
  ArrowRight,
  ChevronRight,
  Newspaper,
  Globe2,
  TrendingUp,
  TrendingDown,
  Bell,
  Landmark,
  Bookmark,
  Star,
  FileText,
  Radar,
  Tv,
  Link2,
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
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useGastoMilitar, useIndicadoresBcb, useIndiceDeAlerta } from '../hooks/useDadosReais'
import { useSettingsStore } from '../store/settingsStore'
import { alertMeta, categoryColor } from '../utils/textUtils'
import { formatTime, timeAgo } from '../utils/dateUtils'

// Número em pt-BR. `toFixed(3)` escrevia o dólar como "R$ 5.170" — lido aqui como cinco mil.
const br = (v, casas) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

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

// -----------------------------------------------------------------------------
// PAINEL DO USUÁRIO — o que aconteceu, a partir do acervo já filtrado.
//
// Este painel mostrava "ATENÇÃO · 42/100" a quem ainda não tivesse aberto o
// clipping na sessão: o nível vinha do último clipping carregado e, na falta
// dele, caía numa constante. Também exibia "Plano Institucional", a frase
// "Sem eventos de ruptura no período. Monitoramento em curso." sem que nada a
// tivesse apurado, dois cartões repetindo o mesmo nível de alerta e blocos
// para um "plano Explorar" que nenhuma conta tinha.
// -----------------------------------------------------------------------------
export default function UserDashboard() {
  const { news, source, loading, meta } = useNews()
  const bcb = useIndicadoresBcb()
  const indice = useIndiceDeAlerta(7)
  const user = useAuthStore((s) => s.user)
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const favorites = useNewsStore((s) => s.favorites)
  const interestAreas = useSettingsStore((s) => s.interestAreas)
  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()

  // AS ÁREAS DE INTERESSE SOBEM PARA O TOPO. A preferência existia, com texto
  // prometendo "destacar o conteúdo mais relevante", e só aparecia como
  // etiqueta: nenhuma lista a lia.
  const feed = useMemo(() => {
    if (!interestAreas.length) return news.slice(0, 6)
    const doInteresse = news.filter((n) => interestAreas.includes(n.category))
    const resto = news.filter((n) => !interestAreas.includes(n.category))
    return [...doInteresse, ...resto].slice(0, 6)
  }, [news, interestAreas])

  const alert = indice.level ? alertMeta[indice.level] : null
  const firstName = user?.name?.split(' ')[0] || ''

  let execLine = 'O servidor de coleta não respondeu.'
  if (loading) execLine = 'Consultando o acervo…'
  else if (meta?.totalRelevant != null) {
    execLine = `${meta.totalRelevant} matéria(s) aprovada(s) pelo filtro de relevância no acervo`
      + (meta.lastFetchAt ? ` · última coleta ${timeAgo(meta.lastFetchAt)}.` : '.')
  }

  // Câmbio, Selic e IPCA do SGS do Banco Central, coletados pelo servidor.
  // Risco-país e orçamento de defesa não entram: não há fonte pública gratuita
  // coletada para eles, e cartão sem fonte é o que este painel deixou de ter.
  const indicators = useMemo(() => {
    const s = bcb.series
    if (!s) return []
    // `delta` tem formatação própria: a variação da Selic saía "+0,01% p.p.",
    // com a unidade duas vezes.
    const cartao = (serie, label, formata, formataDelta) => {
      if (!serie?.ultimo) return null
      const v = serie.ultimo.value
      const d = serie.variacao
      return {
        id: serie.id,
        label,
        value: formata(v),
        delta: d == null ? '—' : `${d >= 0 ? '+' : ''}${formataDelta(d)}`,
        // Para câmbio e inflação, subir é notícia ruim. A seta indica direção,
        // e o rótulo diz o quê.
        positive: d != null && d < 0,
      }
    }
    return [
      cartao(s.usd, 'Câmbio USD/BRL', (v) => `R$ ${br(v, 3)}`, (d) => br(d, 3)),
      cartao(s.eur, 'Câmbio EUR/BRL', (v) => `R$ ${br(v, 3)}`, (d) => br(d, 3)),
      cartao(s.selic, 'Selic (mês)', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`),
      cartao(s.ipca, 'IPCA (mês)', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`),
    ].filter(Boolean)
  }, [bcb.series])

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
                <Badge type={source === 'live' ? 'live' : 'sem-dado'} />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> Aberto às {formatTime()}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greetingByHour()}{firstName ? `, ${firstName}` : ''}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {execLine}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/clipping" className="btn-primary">
                  Ver clipping <ArrowRight size={16} />
                </Link>
                <Link to="/correlacoes" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <Link2 size={16} /> Correlações
                </Link>
                <Link to="/apresentacao" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <Tv size={16} /> Modo apresentação
                </Link>
              </div>
            </div>

            {/* NÍVEL DE ALERTA — calculado no servidor sobre as matérias da
              * janela. Sem ocorrência, diz que não há: ausência não é calma. */}
            <div className="w-full shrink-0 rounded-xl border border-white/10 bg-white/5 p-4 lg:w-64">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nível de alerta · 7 dias</span>
                <InfoTooltip
                  text={`Média ponderada das urgências das matérias relevantes dos últimos 7 dias (crítico 100, alto 70, médio 40, baixo 15).${indice.basis ? ` Base: ${indice.basis}.` : ''}`}
                />
              </div>
              {alert ? (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight" style={{ color: alertColor(indice.level) }}>
                      {alert.label}
                    </span>
                    <span className="font-mono text-sm text-gray-400">{indice.value}/100</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${indice.value}%`, background: alertColor(indice.level) }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-gray-400">
                    <span>Normal</span><span>Crítico</span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-300">
                  {indice.carregando ? 'Calculando…' : 'Sem ocorrências relevantes nos últimos 7 dias para calcular o nível.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── KPIs ───────────── */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Newspaper}
            label="Aprovadas no acervo"
            value={meta?.totalRelevant != null ? String(meta.totalRelevant) : '—'}
            hint={meta?.totalCollected != null ? `de ${meta.totalCollected} coletadas` : ''}
            accent="brand"
          />
          <MetricCard
            icon={Bell}
            label="Alertas não lidos"
            value={String(unread)}
            hint="na central de notificações"
            accent={unread ? 'amber' : 'green'}
          />
          <MetricCard
            icon={Bookmark}
            label="Na sua pasta"
            value={String(favorites.length)}
            hint="matérias salvas"
            accent="brand"
          />
          <MetricCard
            icon={Star}
            label="Áreas de interesse"
            value={String(interestAreas.length)}
            hint={interestAreas.length ? 'sobem nas notícias abaixo' : 'nenhuma escolhida'}
            accent="green"
          />
        </div>
      </Section>

      {/* ───────────── AÇÕES RÁPIDAS + ÁREAS DE INTERESSE ───────────── */}
      <Section className="card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link to="/clipping" className="btn-ghost text-sm"><Newspaper size={15} /> Clipping</Link>
            <Link to="/legislativo" className="btn-ghost text-sm"><FileText size={15} /> Radar legislativo</Link>
            <Link to="/dados" className="btn-ghost text-sm"><Radar size={15} /> Séries e indicadores</Link>
            <Link to="/busca" className="btn-ghost text-sm"><Newspaper size={15} /> Buscar no acervo</Link>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider muted">Suas áreas de interesse</p>
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
              <Link to="/configuracoes" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                <Star size={13} /> Escolher áreas de interesse
              </Link>
            )}
          </div>
        </div>
      </Section>

      {/* ───────────── GRID PRINCIPAL ───────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Globe2 size={18} className="text-brand-400 dark:text-brand-300" /> Cobertura por país
              </h2>
            </div>
            {/* Chamava-se "Mapa de risco" e não mede risco: conta menções em
                notícia coletada. */}
            <p className="mb-4 text-sm muted">
              Quantas notícias coletadas mencionam cada país. Clique para ver as manchetes.
            </p>
            <GlobalHeatmap height={380} />
          </Section>
        </div>

        {/* ───────────── TRILHO LATERAL ───────────── */}
        <div className="space-y-6">
          <ExchangeWidget />

          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Landmark size={17} className="text-brand-400 dark:text-brand-300" /> Indicadores
              <InfoTooltip text="Câmbio, Selic e IPCA do Sistema Gerenciador de Séries Temporais do Banco Central, coletados pelo servidor. A variação compara com o ponto anterior da própria série." />
            </h2>
            {!indicators.length && (
              <p className="text-sm italic muted">
                {bcb.carregando ? 'Consultando o Banco Central…' : 'Sem indicadores: o servidor de coleta não respondeu.'}
              </p>
            )}
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
            <Link to="/economia" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Economia &amp; Defesa <ChevronRight size={14} />
            </Link>
          </Section>

          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bell size={17} className="text-brand-400 dark:text-brand-300" /> Alertas recentes
              </h2>
              {unread > 0 && (
                <span className="rounded-full bg-military-red/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-300">
                  {unread} {unread > 1 ? 'novos' : 'novo'}
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm muted">
                Nenhum alerta ainda. Eles entram quando a coleta traz matéria de urgência alta ou
                ataque a organização brasileira.
              </p>
            ) : (
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
            )}
            <Link to="/notificacoes" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Ver todas <ChevronRight size={14} />
            </Link>
          </Section>

          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bookmark size={17} className="text-brand-400 dark:text-brand-300" /> Minha Pasta
              </h2>
              <Link to="/arquivo" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Abrir</Link>
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
                hint="Use “Salvar” em qualquer notícia para guardá-la na sua pasta."
                action={{ label: 'Abrir clipping', to: '/clipping', icon: Newspaper }}
              />
            )}
          </Section>
        </div>
      </div>

      {/* ───────────── NOTÍCIAS RECENTES ───────────── */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Newspaper size={18} className="text-brand-400 dark:text-brand-300" /> Notícias recentes
            {interestAreas.length > 0 && <span className="chip text-[10px]">suas áreas primeiro</span>}
          </h2>
          <Badge type={source === 'live' ? 'live' : 'sem-dado'} />
        </div>
        {!loading && feed.length === 0 ? (
          <EmptyState compact icon={Newspaper} title="Nenhuma notícia no acervo" hint="A coleta ainda não aprovou matérias, ou o servidor não respondeu." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
          </div>
        )}
        <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Ver todo o clipping <ArrowRight size={15} />
        </Link>
      </Section>

      {/* ───────────── DADOS: volume de notícias + gastos militares ───────────── */}
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

      {/* ───────────── TICKER ───────────── */}
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

// Cor sólida do nível de alerta (para a barra no cabeçalho escuro).
function alertColor(level) {
  return {
    NORMAL: '#2e7d46',
    ATENCAO: '#caa733',
    ALERTA: '#d4841a',
    CRITICO: '#c0392b',
  }[level] || '#caa733'
}
