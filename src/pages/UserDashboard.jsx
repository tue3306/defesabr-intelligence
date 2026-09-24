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
  Flame,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import InfoTooltip from '../components/ui/InfoTooltip'
import Atualizacao from '../components/ui/Atualizacao'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useGastoMilitar, useIndicadoresBcb, useIndiceDeAlerta } from '../hooks/useDadosReais'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { alertMeta, categoryColor , corDoNivel } from '../utils/textUtils'
import { CATEGORIES } from '../data/mockData'
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
  const notifications = useNotificationStore((s) => s.items)
  const unread = useNotificationStore((s) => s.unread)
  const favorites = useNewsStore((s) => s.favorites)
  const interestAreas = useSettingsStore((s) => s.interestAreas)
  const toggleInterestArea = useSettingsStore((s) => s.toggleInterestArea)
  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()
  const marcarLida = useNotificationStore((s) => s.marcarLida)

  // EM DESTAQUE AGORA — o que as últimas 48 horas trouxeram de mais urgente.
  // O clipping já devolve ordenado por urgência (crítico, alto, médio, baixo)
  // e depois por data; aqui ficam só os dois degraus de cima. Sem nenhum,
  // o bloco diz isso em vez de promover matéria baixa a destaque.
  const destaque = useResource(
    () => request('GET /news/clipping', { params: { days: 2, limit: 12 } }),
    [],
  )
  const emDestaque = (destaque.data?.news || [])
    .filter((n) => n.urgency === 'CRITICO' || n.urgency === 'ALTO')
    .slice(0, 4)

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
    // A SETA SEGUE O SINAL. Antes a seta vinha de "é bom ou ruim" — e o
    // dólar subindo aparecia com seta para BAIXO, em vermelho. A direção vem
    // do número; a cor só existe onde o julgamento é inequívoco (inflação
    // caindo é boa notícia), e no resto fica neutra.
    const cartao = (serie, label, formata, formataDelta, { cairEhBom = false, dica } = {}) => {
      if (!serie?.ultimo) return null
      const v = serie.ultimo.value
      const d = serie.variacao
      return {
        id: serie.id,
        label,
        dica,
        value: formata(v),
        delta: d == null ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${formataDelta(Math.abs(d))}`,
        direcao: d == null || d === 0 ? 'estavel' : d > 0 ? 'sobe' : 'desce',
        tom: !cairEhBom || d == null || d === 0 ? 'neutro' : d < 0 ? 'bom' : 'ruim',
      }
    }
    return [
      cartao(s.usd, 'Dólar', (v) => `R$ ${br(v, 3)}`, (d) => br(d, 3), { dica: 'cotação do dia útil anterior' }),
      cartao(s.eur, 'Euro', (v) => `R$ ${br(v, 3)}`, (d) => br(d, 3), { dica: 'cotação do dia útil anterior' }),
      // A META da Selic, em % ao ano — o número do noticiário. A "Selic do
      // mês" que ficava aqui era de um mês pela metade.
      cartao(s.selicMeta, 'Selic (meta, a.a.)', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`, { dica: 'última decisão do Copom' }),
      cartao(s.ipca12, 'IPCA 12 meses', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`, { cairEhBom: true, dica: 'contra o mês anterior' }),
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
                {source === 'live'
                  ? <Atualizacao ultimaColeta={meta?.lastFetchAt} escuro />
                  : <Badge type="sem-dado" />}
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

      {/* ───────────── EM DESTAQUE AGORA ───────────── */}
      <Section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 id="em-destaque" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Flame size={18} className="text-red-600 dark:text-red-400" aria-hidden="true" /> Em destaque agora
            <InfoTooltip text="As matérias de urgência crítica e alta publicadas nas últimas 48 horas, das mais urgentes para as menos. Urgência vem das palavras do título: crítico é acontecimento violento (ataque, invasão, mortos); alto é assunto sério que pede acompanhamento." />
          </h2>
          <Link to="/metodologia#niveis" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            O que significa cada nível?
          </Link>
        </div>
        <p className="mb-3 text-sm muted">O mais urgente das últimas 48 horas, pelo nível de cada matéria.</p>
        {destaque.loading && !destaque.data ? (
          <p className="text-sm muted" role="status">Procurando o que é urgente…</p>
        ) : destaque.error ? (
          <p className="text-sm muted">Não foi possível consultar o acervo agora.</p>
        ) : emDestaque.length === 0 ? (
          <p className="rounded-lg bg-gray-500/5 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
            Nenhuma matéria crítica ou alta nas últimas 48 horas. Isso quer dizer que a imprensa coletada
            não noticiou acontecimento urgente — não que nada tenha acontecido.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {emDestaque.map((n) => {
              const externo = /^https?:\/\//i.test(n.url || '')
              return (
                <li key={n.id} className={`rounded-xl border-l-4 bg-gray-500/5 p-3 dark:bg-white/5 ${n.urgency === 'CRITICO' ? 'border-l-[var(--nivel-critico)]' : 'border-l-[var(--nivel-alto)]'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge type="urgency" value={n.urgency} />
                    {n.category && <span className="text-[11px] font-semibold muted">{n.category}</span>}
                    <span className="ml-auto text-[11px] muted">{timeAgo(n.date)}</span>
                  </div>
                  {externo ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block font-semibold leading-snug hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                      {n.title} <ExternalLink size={12} className="inline align-baseline" aria-hidden="true" />
                      <span className="sr-only"> (abre o site do veículo em nova aba)</span>
                    </a>
                  ) : (
                    <p className="mt-1.5 font-semibold leading-snug">{n.title}</p>
                  )}
                  {n.source && <p className="mt-0.5 text-[11px] muted">{n.source}</p>}
                </li>
              )
            })}
          </ul>
        )}
        <Link to="/clipping" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Ver tudo no Clipping <ChevronRight size={14} />
        </Link>
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
          {/* ESCOLHER O INTERESSE ONDE ELE TEM EFEITO.
            *
            * Isto aqui era um VISOR: mostrava as áreas escolhidas e, quando não
            * havia nenhuma, um link para Configurações. Quem quisesse trocar
            * precisava sair do painel, achar a seção certa da outra tela e
            * voltar — e o efeito da escolha (as matérias dessas áreas sobem na
            * lista logo abaixo) acontece AQUI.
            *
            * Agora os botões são os próprios chips: um clique liga, outro
            * desliga, e a lista de notícias abaixo se reordena na hora. */}
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider muted">
              Suas áreas de interesse{' '}
              <span className="font-normal normal-case tracking-normal">— clique para ligar ou desligar</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const ligada = interestAreas.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleInterestArea(cat)}
                    aria-pressed={ligada}
                    title={ligada ? `Deixar de destacar ${cat}` : `Destacar ${cat} nas notícias`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                      ligada
                        ? 'border-transparent'
                        : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    style={ligada ? { background: `${categoryColor(cat)}22`, color: categoryColor(cat) } : undefined}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(cat) }} />
                    {cat}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[11px] muted">
              {interestAreas.length
                ? `${interestAreas.length} área(s) — as matérias delas sobem para o topo da lista abaixo.`
                : 'Nenhuma escolhida: as notícias aparecem por data.'}{' '}
            </p>
            <button
              type="button"
              onClick={() => useUiStore.getState().abrirInteresses()}
              className="btn-ghost mt-2 px-3 py-1.5 text-xs"
            >
              <SlidersHorizontal size={14} aria-hidden="true" /> Personalizar interesses
            </button>
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
                    <span
                      title={i.dica}
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                        i.tom === 'bom' ? 'text-emerald-800 dark:text-emerald-400'
                          : i.tom === 'ruim' ? 'text-red-800 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {i.direcao === 'sobe' ? <TrendingUp size={12} aria-hidden="true" /> : i.direcao === 'desce' ? <TrendingDown size={12} aria-hidden="true" /> : null}
                      <span className="sr-only">{i.direcao === 'sobe' ? 'subiu' : i.direcao === 'desce' ? 'caiu' : 'estável'}</span>
                      {i.delta}
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
                {/* CLICÁVEIS DE VERDADE. A lista parecia de links e não era:
                    o título não levava a lugar nenhum, e o único jeito de
                    marcar como lido era ir até a central. Agora abrir o
                    alerta leva à matéria (ou à tela do incidente) e o marca
                    como lido — o contador do sino e o do cartão acima
                    baixam juntos, porque leem o mesmo estado. */}
                {notifications.slice(0, 5).map((n) => {
                  const externo = /^https?:\/\//i.test(n.url || '')
                  const conteudo = (
                    <>
                      <span className="mt-0.5 shrink-0"><Badge type="urgency" value={n.level} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium group-hover:underline">{n.title}</span>
                        <span className="block text-xs muted">
                          {timeAgo(n.eventAt || n.createdAt)}
                          {!n.read && <span className="ml-1 font-semibold text-gold-600 dark:text-gold-400">· não lido</span>}
                        </span>
                      </span>
                    </>
                  )
                  const classe = `group flex items-start gap-2.5 rounded-md p-1 -m-1 hover:bg-gray-500/5 dark:hover:bg-white/5 ${n.read ? 'opacity-60' : ''}`
                  return (
                    <li key={n.id}>
                      {externo ? (
                        <a href={n.url} target="_blank" rel="noopener noreferrer" onClick={() => marcarLida(n.id)} className={classe}>
                          {conteudo}
                        </a>
                      ) : (
                        <Link to={n.route || '/notificacoes'} onClick={() => marcarLida(n.id)} className={classe}>
                          {conteudo}
                        </Link>
                      )}
                    </li>
                  )
                })}
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
          <Badge type={source === 'live' ? 'live' : 'sem-dado'} cadencia={source === 'live' ? 'a cada 15 min' : undefined} />
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
    NORMAL: corDoNivel('normal'),
    ATENCAO: corDoNivel('atencao'),
    ALERTA: corDoNivel('alerta'),
    CRITICO: corDoNivel('critico'),
  }[level] || corDoNivel('atencao')
}
