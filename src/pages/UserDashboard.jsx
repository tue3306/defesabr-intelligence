import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
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
  Flame,
  SlidersHorizontal,
  ExternalLink,
  HelpCircle,
  Compass,
  BarChart3,
} from 'lucide-react'
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
import { alertMeta, categoryColor, corDoNivel, plural } from '../utils/textUtils'
import { CATEGORIES } from '../data/mockData'
import { timeAgo } from '../utils/dateUtils'

// Número em pt-BR (`toFixed(3)` escrevia o dólar como "R$ 5.170").
const br = (v, casas) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

const Section = ({ children, className = '', ...resto }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.4 }}
    className={className}
    {...resto}
  >
    {children}
  </motion.section>
)

const linkSecao = 'inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300'

// -----------------------------------------------------------------------------
// PAINEL DO USUÁRIO — primeira tela depois do login.
// Ordem pensada para quem chega: o que é grave agora → o que saiu hoje →
// o que é seu (alertas, pasta) → contexto (indicadores, mapa, gráficos).
// Cada número vem da API; sem resposta, o bloco diz isso.
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
  // A visita guiada mora no Layout (segue para outras telas); este painel só a abre.
  const abrirVisita = useUiStore((s) => s.abrirVisita)
  const abrirInteresses = useUiStore((s) => s.abrirInteresses)

  // EM DESTAQUE: só crítico e alto das últimas 48 h (o clipping já vem
  // ordenado por urgência). Sem nenhum, o bloco diz isso.
  const destaque = useResource(
    () => request('GET /news/clipping', { params: { days: 2, limit: 12 } }),
    [],
  )
  const emDestaque = (destaque.data?.news || [])
    .filter((n) => n.urgency === 'CRITICO' || n.urgency === 'ALTO')
    .slice(0, 4)

  // As matérias das áreas de interesse sobem para o topo da lista.
  const feed = useMemo(() => {
    if (!interestAreas.length) return news.slice(0, 6)
    const doInteresse = news.filter((n) => interestAreas.includes(n.category))
    const resto = news.filter((n) => !interestAreas.includes(n.category))
    return [...doInteresse, ...resto].slice(0, 6)
  }, [news, interestAreas])

  const alert = indice.level ? alertMeta[indice.level] : null
  const firstName = user?.name?.split(' ')[0] || ''

  let execLine = 'O servidor de coleta não respondeu. Tente recarregar a página em alguns minutos.'
  if (loading) execLine = 'Consultando o acervo…'
  else if (meta?.totalRelevant != null) {
    const n = meta.totalRelevant
    execLine = `${n.toLocaleString('pt-BR')} ${n === 1 ? 'notícia de defesa aprovada' : 'notícias de defesa aprovadas'} no acervo`
      + (meta.totalCollected != null ? `, de ${meta.totalCollected.toLocaleString('pt-BR')} coletadas.` : '.')
  }

  // Câmbio, Selic e IPCA do SGS do Banco Central, coletados pelo servidor.
  // A seta segue o sinal do número; a cor só aparece onde o julgamento é
  // inequívoco (inflação caindo é boa notícia).
  const indicators = useMemo(() => {
    const s = bcb.series
    if (!s) return []
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
      cartao(s.selicMeta, 'Selic (meta ao ano)', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`, { dica: 'última decisão do Copom' }),
      cartao(s.ipca12, 'Inflação (IPCA 12 meses)', (v) => `${br(v, 2)}%`, (d) => `${br(d, 2)} p.p.`, { cairEhBom: true, dica: 'contra o mês anterior' }),
    ].filter(Boolean)
  }, [bcb.series])

  return (
    <div className="space-y-6">
      {/* ───────────── CABEÇALHO: saudação + nível de alerta ───────────── */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <ShieldCheck size={14} aria-hidden="true" /> Painel
                </span>
                {source === 'live'
                  ? <Atualizacao ultimaColeta={meta?.lastFetchAt} escuro />
                  : <Badge type="sem-dado" />}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
                {greetingByHour()}{firstName ? `, ${firstName}` : ''}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 [text-wrap:pretty] sm:text-base">
                {execLine}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/clipping" className="btn-primary">
                  Ver notícias do dia <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  data-tour="visita-botao"
                  onClick={abrirVisita}
                  className="btn-ghost btn-visita"
                >
                  <Compass size={16} aria-hidden="true" /> Visita guiada · 2 min
                </button>
              </div>
            </div>

            {/* Nível calculado no servidor. Sem ocorrência, diz que não há: ausência não é calma. */}
            <div className="w-full shrink-0 rounded-xl border border-white/10 bg-white/5 p-4 lg:w-64" data-tour="alerta">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nível de alerta · 7 dias</span>
                <InfoTooltip
                  text={`Média ponderada das urgências das notícias relevantes dos últimos 7 dias (crítico 100, alto 70, médio 40, baixo 15).${indice.basis ? ` Base: ${indice.basis}.` : ''}`}
                />
              </div>
              {alert ? (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    {/* Texto claro sobre o fundo escuro; a cor do nível fica
                        no ponto e na barra (o verde direto no texto não passava
                        de 3:1 de contraste). */}
                    <span className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-white">
                      <span className="h-3 w-3 rounded-full" style={{ background: alertColor(indice.level) }} aria-hidden="true" />
                      {alert.label}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-gray-400">{indice.value}/100</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${indice.value}%`, background: alertColor(indice.level) }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-gray-400" aria-hidden="true">
                    <span>Normal</span><span>Crítico</span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-300">
                  {indice.carregando
                    ? 'Calculando…'
                    : indice.erro
                      ? 'Índice indisponível: a API não respondeu. Isso não quer dizer que não houve ocorrência.'
                      : 'Sem ocorrências relevantes nos últimos 7 dias para calcular o nível.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── PRIMEIRA VEZ AQUI? (fechado não ocupa espaço) ───────────── */}
      <details className="card group p-0">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <HelpCircle size={16} className="shrink-0 text-brand-500 dark:text-brand-300" aria-hidden="true" />
          Primeira vez aqui? Entenda o painel em 1 minuto
          <ChevronRight size={15} className="ml-auto shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 px-5 py-4 text-sm leading-relaxed text-gray-700 dark:border-white/10 dark:text-gray-300 md:grid-cols-2">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">O que é</h2>
            <p>
              Um painel que reúne, num lugar só, o que sai sobre segurança e defesa do Brasil: mais de 60
              jornais e órgãos públicos, a Câmara dos Deputados, o Banco Central e os sites onde
              criminosos divulgam organizações atacadas. A coleta é automática, a cada 15 minutos.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Para que serve</h2>
            <p>
              Essa informação está espalhada e misturada com outros assuntos. A plataforma separa o que é
              de defesa, organiza por assunto, marca o que é urgente e mostra de onde veio.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">O que é um alerta</h2>
            <p>
              Toda notícia recebe um nível: <strong>crítico</strong> (ataque, invasão, mortos: leia agora),{' '}
              <strong>alto</strong> (guerra, crise, operação: acompanhe), <strong>médio</strong> (contratos,
              acordos) ou <strong>baixo</strong> (contexto). O nível mede o quanto o fato importa para o
              Brasil. Críticos e altos chegam ao sino; só o crítico abre um aviso na tela, uma vez por evento.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Como a análise funciona</h2>
            <p>
              Por listas de palavras escritas à mão, que qualquer pessoa pode conferir, sem inteligência
              artificial. Quando uma notícia cita algo que já está no acervo (uma empresa atacada, um grupo),
              a plataforma mostra a <strong>possível relação</strong>: uma pista, não uma conclusão.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Link to="/metodologia#niveis" className="btn-ghost px-3 py-1.5 text-xs">O que significa cada nível</Link>
            <Link to="/metodologia#correlacao" className="btn-ghost px-3 py-1.5 text-xs">Como a correlação funciona</Link>
            <Link to="/aprender" className="btn-ghost px-3 py-1.5 text-xs">Centro Educacional</Link>
            <Link to="/privacidade" className="btn-ghost px-3 py-1.5 text-xs">Seus dados e a LGPD</Link>
          </div>
        </div>
      </details>

      {/* ───────────── EM DESTAQUE AGORA ───────────── */}
      <Section className="card p-5" data-tour="destaque" aria-labelledby="em-destaque">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 id="em-destaque" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Flame size={18} className="text-red-600 dark:text-red-400" aria-hidden="true" /> Em destaque agora
          </h2>
          <Link to="/metodologia#niveis" className={linkSecao}>
            O que significa cada nível?
          </Link>
        </div>
        <p className="mb-3 text-sm muted">Notícias de nível crítico e alto das últimas 48 horas.</p>
        {destaque.loading && !destaque.data ? (
          <p className="text-sm muted" role="status">Procurando o que é urgente…</p>
        ) : destaque.error ? (
          <p className="text-sm muted">Não foi possível consultar o acervo agora. Tente recarregar a página.</p>
        ) : emDestaque.length === 0 ? (
          <p className="rounded-lg bg-gray-500/5 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
            Nenhuma notícia crítica ou alta nas últimas 48 horas. Isso quer dizer que a imprensa coletada
            não noticiou acontecimento urgente, não que nada tenha acontecido.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {emDestaque.map((n) => {
              const externo = /^https?:\/\//i.test(n.url || '')
              return (
                <li key={n.id} className={`min-w-0 rounded-xl border-l-4 bg-gray-500/5 p-3 dark:bg-white/5 ${n.urgency === 'CRITICO' ? 'border-l-[var(--nivel-critico)]' : 'border-l-[var(--nivel-alto)]'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge type="urgency" value={n.urgency} />
                    {n.category && <span className="text-[11px] font-semibold muted">{n.category}</span>}
                    <span className="ml-auto text-[11px] muted">{timeAgo(n.date)}</span>
                  </div>
                  {externo ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block break-words font-semibold leading-snug hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                      {n.title} <ExternalLink size={12} className="inline align-baseline" aria-hidden="true" />
                      <span className="sr-only"> (abre o site do veículo em nova aba)</span>
                    </a>
                  ) : (
                    <p className="mt-1.5 break-words font-semibold leading-snug">{n.title}</p>
                  )}
                  {n.source && <p className="mt-0.5 text-[11px] muted">{n.source}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* ───────────── NOTÍCIAS + TRILHO PESSOAL ───────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section className="card min-w-0 p-5 lg:col-span-2" aria-labelledby="noticias-recentes">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="noticias-recentes" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Newspaper size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Notícias recentes
            </h2>
            <Badge type={source === 'live' ? 'live' : 'sem-dado'} cadencia={source === 'live' ? 'a cada 15 min' : undefined} />
          </div>
          <p className="mb-3 text-sm muted">
            {interestAreas.length
              ? `As mais novas, com ${interestAreas.length === 1 ? 'a sua área de interesse' : 'as suas áreas de interesse'} primeiro.`
              : 'As mais novas do acervo. Escolha assuntos abaixo para vê-los primeiro.'}
          </p>

          {/* Chips de interesse: um clique liga ou desliga, e a lista se reordena na hora. */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Assuntos para ver primeiro">
            {CATEGORIES.map((cat) => {
              const ligada = interestAreas.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleInterestArea(cat)}
                  aria-pressed={ligada}
                  title={ligada ? `Deixar de destacar ${cat}` : `Ver ${cat} primeiro`}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    ligada
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  style={ligada ? { background: `${categoryColor(cat)}26`, borderColor: categoryColor(cat) } : undefined}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(cat) }} aria-hidden="true" />
                  {cat}
                </button>
              )
            })}
            <button
              type="button"
              onClick={abrirInteresses}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300"
            >
              <SlidersHorizontal size={13} aria-hidden="true" /> Personalizar
            </button>
          </div>

          {!loading && feed.length === 0 ? (
            <EmptyState compact icon={Newspaper} title="Nenhuma notícia no acervo" hint="A coleta ainda não aprovou notícias ou o servidor não respondeu. Tente de novo em alguns minutos." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : feed.map((n, i) => (
                  // No celular, 3 bastam: o resto está em "Ver todas".
                  <div key={n.id} className={`min-w-0 ${i >= 3 ? 'hidden sm:block' : ''}`}>
                    <NewsCard news={n} variant="compact" />
                  </div>
                ))}
            </div>
          )}
          <Link to="/clipping" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Ver todas as notícias do dia <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Section>

        <div className="min-w-0 space-y-6">
          <Section className="card p-5" aria-labelledby="alertas-recentes">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="alertas-recentes" className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bell size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Seus alertas
              </h2>
              {unread > 0 && (
                <span className="rounded-full bg-military-red/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-red-600 dark:text-red-300">
                  {unread} {unread > 1 ? 'não lidos' : 'não lido'}
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm muted">
                Nenhum alerta ainda. Eles chegam quando a coleta traz notícia de urgência alta ou
                ataque a organização brasileira.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {/* Abrir o alerta leva à notícia (ou ao incidente) e o marca como lido. */}
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
            <Link to="/notificacoes" className={`mt-3 ${linkSecao}`}>
              Ver todos os alertas <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </Section>

          <Section className="card p-5" aria-labelledby="minha-pasta">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="minha-pasta" className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Bookmark size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Minha pasta
              </h2>
              {favorites.length > 0 && (
                <span className="text-xs tabular-nums muted">{plural(favorites.length, 'notícia salva', 'notícias salvas')}</span>
              )}
            </div>
            {favorites.length > 0 ? (
              <>
                <ul className="space-y-2.5">
                  {favorites.slice(0, 4).map((f) => (
                    <li key={f.id} className="flex min-w-0 items-start gap-2">
                      <Star size={14} className="mt-0.5 shrink-0 text-gold-500 dark:text-gold-400" aria-hidden="true" />
                      <p className="min-w-0 truncate text-sm">{f.title}</p>
                    </li>
                  ))}
                </ul>
                <Link to="/arquivo" className={`mt-3 ${linkSecao}`}>
                  Abrir minha pasta <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <p className="text-sm muted">
                Vazia por enquanto. Toque em “Salvar” em qualquer notícia para guardá-la aqui.
              </p>
            )}
          </Section>

          <Section className="card p-5" aria-labelledby="indicadores">
            <h2 id="indicadores" className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Landmark size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Indicadores
              <InfoTooltip text="Câmbio, Selic e inflação (IPCA) do Banco Central, coletados pelo servidor. A variação compara com o ponto anterior da própria série." />
            </h2>
            {!indicators.length && (
              <p className="text-sm muted">
                {bcb.carregando ? 'Consultando o Banco Central…' : 'Sem indicadores agora: o servidor de coleta não respondeu.'}
              </p>
            )}
            <ul className="space-y-2.5">
              {indicators.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-sm muted">{i.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums">{i.value}</span>
                    <span
                      title={i.dica}
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
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
            <p className="mt-3 text-[11px] muted">Fonte: Banco Central do Brasil</p>
            <Link to="/economia" className={`mt-2 ${linkSecao}`}>
              Ver Economia &amp; Defesa <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </Section>
        </div>
      </div>

      {/* ───────────── COBERTURA POR PAÍS ───────────── */}
      <Section className="card p-5" aria-labelledby="cobertura-pais">
        <h2 id="cobertura-pais" className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Globe2 size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Cobertura por país
        </h2>
        {/* Conta menções em notícia coletada; não mede risco. */}
        <p className="mb-4 text-sm muted">
          Quantas notícias coletadas citam cada país. Para o dossiê de cada país, abra o{' '}
          <Link to="/mapa" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Mapa estratégico</Link>.
        </p>
        {/* Sem o dossiê embutido: no Painel ele dobrava o tamanho da página. */}
        <GlobalHeatmap height={380} withNews={false} />
      </Section>

      {/* ───────────── CONTEXTO: volume de notícias + gastos militares ───────────── */}
      <Section aria-labelledby="em-numeros">
        <h2 id="em-numeros" className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <BarChart3 size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Em números
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card min-w-0 p-5">
            <h3 className="mb-1 text-base font-bold tracking-tight">Notícias por dia (últimos 14 dias)</h3>
            <p className="mb-4 text-sm muted">Quantas notícias foram coletadas por dia, separadas por assunto.</p>
            <NewsVolumeChart data={volume.data} keys={volume.keys} height={240} />
          </div>
          <div className="card min-w-0 p-5">
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
              Gasto militar do Brasil
              <InfoTooltip text="Série do Banco Mundial: gasto militar em US$ correntes e como % do PIB. A linha de referência é a meta da OTAN, 2% do PIB." />
            </h3>
            <p className="mb-4 text-sm muted">Série histórica anual. Fonte: Banco Mundial (World Bank Open Data).</p>
            <MilitarySpendingChart data={gasto.data} mode={gasto.aoVivo ? 'usd' : 'dual'} height={240} />
          </div>
        </div>
      </Section>
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
