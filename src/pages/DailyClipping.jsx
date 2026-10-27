import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  FileDown,
  Filter,
  Lock,
  Newspaper,
  Printer,
  Rss,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Flag,
  HelpCircle,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'

import Badge, { ROTULO_URGENCIA, SENTIDO_URGENCIA } from '../components/ui/Badge'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Can from '../auth/Can'
import { newsService } from '../services/newsService'
import { useFontesReais } from '../hooks/useFontesReais'
import EventosConsolidados from '../components/clipping/EventosConsolidados'
import { useNewsStore } from '../store/newsStore'
import { useAoVivo } from '../hooks/useAoVivo'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import { URGENCY_LEVELS } from '../data/mockData'
import { alertMeta, categoryColor, clipboard, urgencyMeta, corDoNivel, plural, resumoUtil } from '../utils/textUtils'
import { formatDateBR, formatDateTimeBR, formatFullDate, timeAgo } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'

// Quem assina a edição: não há redação humana, a seleção é do filtro de relevância.
const EDITORIAL_DESK = 'coleta automática · filtro de relevância publicado'

export default function DailyClipping() {
  const addClipping = useNewsStore((s) => s.addClipping)
  const latest = useNewsStore((s) => s.latestClipping)
  const clippings = useNewsStore((s) => s.clippings)
  // Fallback do contador de fontes: também vem do servidor, nunca de lista local.
  const fontesReais = useFontesReais()

  const [result, setResult] = useState(latest)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [loadingEdition, setLoadingEdition] = useState(true)

  // A edição real vem do servidor. A guardada no navegador é só o estado
  // inicial: se a API estiver fora, a tela abre com ela e o selo diz a origem.
  const recarregarEdicao = useCallback(async () => {
    try {
      const { data, meta } = await newsService.latestClipping()
      // Só substitui se veio da API e tem conteúdo.
      if (meta?.source !== 'live' || !data) return
      setResult({ ...data, source: 'live' })
    } catch {
      /* mantém a edição em tela */
    }
  }, [])

  useAoVivo(recarregarEdicao)

  useEffect(() => {
    let vivo = true
    recarregarEdicao().finally(() => { if (vivo) setLoadingEdition(false) })
    return () => { vivo = false }
  }, [recarregarEdicao])

  // Filtros da edição em tela
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [urgency, setUrgency] = useState('')
  // As áreas de interesse escolhidas em Configurações viram um atalho de filtro.
  const interestAreas = useSettingsStore((s) => s.interestAreas)

  // Memoizado porque entra nas dependências dos `useMemo` abaixo.
  const allNews = useMemo(() => result?.news || [], [result])
  const hasFilters = Boolean(query.trim() || cats.length || urgency)

  // Categorias da edição inteira, mais as marcadas: um chip marcado continua
  // visível para ser desmarcado mesmo se a edição recarregar sem ele.
  const availableCats = useMemo(
    () => [...new Set([...allNews.map((n) => n.category).filter(Boolean), ...cats])],
    [allNews, cats]
  )

  const contagemUrgencia = useMemo(() => {
    const c = {}
    for (const n of allNews) c[n.urgency] = (c[n.urgency] || 0) + 1
    return c
  }, [allNews])

  const filteredNews = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allNews.filter((n) => {
      if (cats.length && !cats.includes(n.category)) return false
      if (urgency && n.urgency !== urgency) return false
      if (!q) return true
      return `${n.title} ${n.summary} ${n.source} ${n.impact_br || ''}`.toLowerCase().includes(q)
    })
  }, [allNews, query, cats, urgency])

  const clearFilters = () => {
    setQuery('')
    setCats([])
    setUrgency('')
  }

  const handleSaveToArchive = () => {
    if (!result) return
    addClipping(result)
    toast.success('Edição salva no Arquivo')
  }

  // O PDF é gerado de forma assíncrona: o aviso só vem depois que o arquivo existe.
  const handlePDF = async () => {
    if (!result) return
    try {
      await exportClippingToPDF(result)
      toast.success('PDF da edição gerado')
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente de novo em instantes.')
    }
  }

  const handleDateChange = (e) => {
    const iso = e.target.value
    if (!iso) return
    const found = clippings.find((c) => c.date === iso)
    if (found) {
      setResult(found.data)
      clearFilters()
      toast.success(`Edição de ${formatDateBR(found.date)} carregada`)
    } else {
      toast(`Nenhuma edição arquivada em ${formatDateBR(iso)}. Veja as datas salvas em Minha pasta e arquivo.`, { icon: '📭' })
    }
  }

  // Sem nível calculável não há default: pintar "NORMAL" seria inventar.
  const alert = alertMeta[result?.alert_level] || null
  const publishedAt = result?.generatedAt || result?.date

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Newspaper}
        title="Notícias do dia"
        description="As notícias de segurança e defesa selecionadas automaticamente na edição de hoje. Filtre por assunto ou urgência e abra a fonte original."
        help="O nível de alerta é a média ponderada da urgência de todas as notícias relevantes do período (crítico 100, alto 70, médio 40, baixo 15): NORMAL abaixo de 35, ATENÇÃO até 59, ALERTA até 79, CRÍTICO a partir de 80. Sem notícias no período, não há nível."
        breadcrumb={[{ label: 'Notícias' }, { label: 'Notícias do dia' }]}
        badges={
          <>
            <Badge type="alert" value={result?.alert_level} />
            {/* O selo segue a ORIGEM da edição em tela. */}
            <Badge type={result?.source === 'live' ? 'live' : 'sem-dado'} cadencia={result?.source === 'live' ? 'a cada 5 min' : undefined} />
          </>
        }
        meta={[
          { label: 'Edição', value: result?.date || formatFullDate() },
          { label: 'Notícias', value: String(allNews.length) },
          // Quantas fontes responderam na coleta que produziu ESTA edição.
          { label: 'Fontes ativas', value: String(result?.active_sources ?? fontesReais.total ?? '—') },
        ]}
        actions={
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-gold-500/60 dark:border-white/10">
            <CalendarDays size={16} className="text-gold-500" aria-hidden="true" />
            <span className="muted">Edição arquivada</span>
            <input
              type="date"
              onChange={handleDateChange}
              className="bg-transparent text-sm focus:outline-none"
              aria-label="Abrir edição arquivada de uma data"
            />
          </label>
        }
      >
        {/* Barra de ações do documento */}
        <div className="flex flex-wrap items-center gap-2">
          <Can
            do="reports.export"
            fallback={
              <span className="btn-ghost cursor-not-allowed opacity-60" title="A exportação não está disponível para o seu nível de acesso.">
                <Lock size={14} aria-hidden="true" /> Exportar PDF
              </span>
            }
          >
            <button onClick={handlePDF} disabled={!result} className="btn-ghost">
              <FileDown size={16} aria-hidden="true" /> Exportar PDF
            </button>
          </Can>
          <button onClick={handleSaveToArchive} disabled={!result} className="btn-ghost">
            <Save size={16} aria-hidden="true" /> Salvar no arquivo
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} aria-hidden="true" /> Imprimir
          </button>
          <PublishedNote
            at={publishedAt}
            detalhe={result?.source === 'live'
              ? `${result.relevant_total ?? 0} de ${result.total_collected ?? 0} itens coletados passaram pelo filtro de relevância`
              : undefined}
          />
        </div>
      </PageHeader>

      {!result && !loadingEdition && (
        <EmptyState
          icon={Newspaper}
          title="Nenhuma edição publicada ainda"
          hint="Assim que a coleta trouxer notícias aprovadas pelo filtro, a edição aparece aqui com o nível de alerta do período."
          action={{ label: 'Ver edições arquivadas', to: '/arquivo?aba=clippings', icon: CalendarDays }}
        />
      )}

      {/* A LISTA DA EDIÇÃO VEM PRIMEIRO: é o que o leitor abriu a tela para ver.
          Contexto (nível de alerta, temas) fica ao lado no desktop e logo
          abaixo no celular; os blocos de análise vêm depois da lista. */}
      {result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section aria-labelledby="titulo-lista" className="min-w-0 space-y-4 lg:col-span-2">
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-lista" className="text-lg font-bold tracking-tight">Notícias da edição</h2>
                <LegendaSelos />
              </div>

              <SearchBar
                placeholder="Buscar nesta edição (ex.: submarino, cibersegurança)…"
                defaultValue={query}
                onChange={setQuery}
              />

              <div>
                <p id="rotulo-urgencia" className="mb-2 text-xs font-semibold muted">Urgência</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="rotulo-urgencia">
                  <BotaoFiltro ativo={!urgency} onClick={() => setUrgency('')} contagem={allNews.length}>
                    Todas
                  </BotaoFiltro>
                  {URGENCY_LEVELS.filter((lv) => contagemUrgencia[lv] || urgency === lv).map((lv) => (
                    <BotaoFiltro
                      key={lv}
                      ativo={urgency === lv}
                      onClick={() => setUrgency(urgency === lv ? '' : lv)}
                      contagem={contagemUrgencia[lv] || 0}
                      cor={corDoNivel(lv)}
                    >
                      {ROTULO_URGENCIA[lv]}
                    </BotaoFiltro>
                  ))}
                </div>
              </div>

              {(availableCats.length > 1 || cats.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-semibold muted">Assunto (categoria)</p>
                  <TagFilter
                    options={availableCats}
                    selected={cats}
                    getColor={categoryColor}
                    onToggle={(c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {interestAreas.some((a) => availableCats.includes(a)) && (
                      <button
                        onClick={() => setCats(interestAreas.filter((a) => availableCats.includes(a)))}
                        className="py-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                      >
                        Só as minhas áreas de interesse
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => useUiStore.getState().abrirInteresses()}
                      className="py-1 text-xs font-semibold text-gray-600 hover:underline dark:text-gray-300"
                    >
                      {interestAreas.length ? 'Personalizar interesses' : 'Escolher minhas áreas de interesse'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3 text-sm dark:border-white/[0.07]">
                <span className="muted" aria-live="polite">
                  {hasFilters
                    ? <><strong className="text-gray-700 dark:text-gray-200">{filteredNews.length}</strong> de {plural(allNews.length, 'notícia')}</>
                    : <><strong className="text-gray-700 dark:text-gray-200">{allNews.length}</strong> {allNews.length === 1 ? 'notícia' : 'notícias'}</>}
                </span>
                {hasFilters && (
                  <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">
                    <X size={12} aria-hidden="true" /> Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {filteredNews.length === 0 ? (
              <EmptyState
                icon={Filter}
                tone="filter"
                title={allNews.length ? 'Nenhuma notícia corresponde aos filtros' : 'Esta edição não tem notícias'}
                hint={allNews.length
                  ? 'Ajuste a busca, a urgência ou o assunto para ver as demais notícias desta edição.'
                  : 'Nenhuma notícia coletada passou pelo filtro de relevância neste período.'}
                action={allNews.length ? { label: 'Limpar filtros', onClick: clearFilters, icon: SlidersHorizontal } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {filteredNews.map((n, i) => (
                  <ClippingNewsItem key={n.id ?? i} news={n} defaultOpen={i === 0} />
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0 space-y-6" aria-label="Resumo da edição">
            <section
              className={`card border-l-4 p-5 ${alert?.classes.split(' ').find((c) => c.startsWith('border')) || 'border-gray-300 dark:border-white/15'}`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Nível de alerta do período</h2>
                <Badge type="alert" value={result.alert_level} />
              </div>
              <NivelDeAlerta
                level={result.alert_level}
                score={result.alert_score}
                basis={result.alert_basis}
                distribuicao={result.alert_distribution}
              />
            </section>

            {allNews.length > 0 && <ThemeCounter news={allNews} />}

            {result.trends?.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-3 text-base font-bold tracking-tight">Tendências do dia</h2>
                <div className="flex flex-wrap gap-2">
                  {result.trends.map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

      {/* Leituras complementares, depois da lista principal. */}
      <RelevantesParaOBrasil />

      <EventosConsolidados />

      <SourcesPanel open={sourcesOpen} onToggle={() => setSourcesOpen((o) => !o)} />

      <p className="text-xs muted">
        Seleção automática por relevância sobre o que foi coletado das fontes. Não há curadoria humana
        nem resumo executivo: a edição é o resultado do filtro, não uma análise.
      </p>
    </div>
  )
}

function BotaoFiltro({ ativo, onClick, contagem, cor, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
        ativo
          ? 'border-gold-500 bg-gold-500 text-military-darker'
          : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10'
      }`}
    >
      {cor && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />}
      {children}
      <span className={`font-mono tabular-nums ${ativo ? 'opacity-80' : 'opacity-60'}`}>{contagem}</span>
    </button>
  )
}

// "O que significam os selos?" — a explicação fica perto da lista, recolhida.
function LegendaSelos() {
  return (
    <details className="group relative text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded py-1 font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:text-brand-300 [&::-webkit-details-marker]:hidden">
        <HelpCircle size={13} aria-hidden="true" /> O que significam os selos?
      </summary>
      <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3 sm:absolute sm:right-0 sm:z-20 sm:w-96 sm:bg-white sm:shadow-lg dark:border-white/10 sm:dark:bg-military-darker">
        <p className="font-semibold">Urgência — o quanto o fato pede atenção</p>
        <ul className="space-y-1.5">
          {URGENCY_LEVELS.map((lv) => (
            <li key={lv} className="flex items-start gap-2">
              <Badge type="urgency" value={lv} className="shrink-0" />
              <span className="leading-relaxed text-gray-700 dark:text-gray-300">{SENTIDO_URGENCIA[lv]}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-gray-200 pt-2 leading-relaxed text-gray-700 dark:border-white/10 dark:text-gray-300">
          <span className="font-semibold">Categoria</span> — o selo colorido diz o assunto da notícia
          (ex.: Forças Armadas, cibersegurança). Use os botões de assunto para filtrar.
        </p>
      </div>
    </details>
  )
}

// Crédito discreto para quem só LÊ a edição (sem capacidade de gerar).
function PublishedNote({ at, detalhe }) {
  return (
    <span title={detalhe} className="flex items-start gap-1.5 text-xs muted sm:ml-auto">
      <ShieldCheck size={14} className="mt-px shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
      <span>
        Gerado pela {EDITORIAL_DESK}
        {at && <span className="whitespace-nowrap font-mono"> · {formatDateTimeBR(at)}</span>}
      </span>
    </span>
  )
}

// Notícia do clipping com as três ações do leitor: fonte, link e pasta pessoal.
function ClippingNewsItem({ news, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const toggleFavorite = useNewsStore((s) => s.toggleFavorite)
  const saved = useNewsStore((s) => s.favorites.some((f) => f.id === news.id))

  const copyLink = () => {
    clipboard(news.url || news.title)
      .then(() => toast.success('Link copiado'))
      .catch(() => toast.error('Não foi possível copiar o link'))
  }

  // O aviso diz onde a notícia ficou e leva até lá.
  const save = () => {
    const added = toggleFavorite(news)
    if (!added) { toast.success('Removido da pasta'); return }
    toast.success((t) => (
      <span>
        Salvo na sua pasta.{' '}
        <Link to="/arquivo" onClick={() => toast.dismiss(t.id)} className="font-semibold underline">Ver pasta</Link>
      </span>
    ))
  }

  return (
    <article className="card p-4 transition-colors hover:border-gold-500/25">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge type="urgency" value={news.urgency} />
        <Badge type="category" value={news.category} />
        <span className="muted">{news.source}</span>
        {news.region && <span className="muted">· {news.region}</span>}
        {news.date && (
          <time dateTime={news.date} title={formatDateTimeBR(news.date)} className="muted">· {timeAgo(news.date)}</time>
        )}
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">
        {news.url ? (
          <a href={news.url} target="_blank" rel="noreferrer" className="hover:text-gold-600 hover:underline dark:hover:text-gold-400">
            {news.title}
          </a>
        ) : news.title}
      </h3>
      {resumoUtil(news.summary, news.title) && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{news.summary}</p>
      )}

      {(news.key_points?.length > 0 || news.impact_br) && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-400"
            aria-expanded={open}
          >
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Recolher detalhes' : 'Ver pontos-chave'}
          </button>
          {open && (
            <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 text-sm dark:border-white/[0.07]">
              {news.key_points?.length > 0 && (
                <ul className="space-y-1">
                  {news.key_points.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-gold-500">•</span>
                      <span className="text-gray-700 dark:text-gray-300">{p}</span>
                    </li>
                  ))}
                </ul>
              )}
              {news.impact_br && (
                <p className="rounded-lg bg-gold-500/10 p-3 text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gold-600 dark:text-gold-400">Impacto para o Brasil: </span>
                  {news.impact_br}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.07]">
        {news.url && (
          <a href={news.url} target="_blank" rel="noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs">
            <ExternalLink size={13} /> Abrir fonte
          </a>
        )}
        <button onClick={copyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
          <Copy size={13} /> Copiar link
        </button>
        <Can do="folder.save">
          <button
            onClick={save}
            className={`btn-ghost px-2.5 py-1.5 text-xs ${saved ? 'border-gold-500/50 text-gold-600 dark:text-gold-400' : ''}`}
            aria-pressed={saved}
          >
            {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            {saved ? 'Na sua pasta' : 'Salvar na pasta'}
          </button>
        </Can>
      </div>
    </article>
  )
}

// Distribuição da edição por tema — dá a leitura de onde o dia se concentrou.
function ThemeCounter({ news }) {
  const rows = useMemo(() => {
    const counts = news.reduce((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [news])
  const max = Math.max(...rows.map(([, c]) => c), 1)

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold tracking-tight">
        Notícias por tema
        <span className="chip text-xs font-medium">{news.length} no total</span>
      </h2>
      <div className="space-y-2.5">
        {rows.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm" title={cat}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: categoryColor(cat) }} aria-hidden="true" />
              <span className="truncate font-medium">{cat}</span>
            </span>
            <span className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-gray-200 sm:w-28 dark:bg-gray-700/30" aria-hidden="true">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(count / max) * 100}%`, background: categoryColor(cat) }}
              />
            </span>
            <span className="w-6 shrink-0 text-right font-mono text-sm font-bold">{count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// Painel informativo: quais fontes alimentam a edição. A gestão das fontes
// vive em Configurações — aqui a lista é apenas de consulta.
function SourcesPanel({ open, onToggle }) {
  // Fontes reais, com o estado da última coleta.
  const fontes = useFontesReais()
  const online = fontes.ok ?? 0

  return (
    <section className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 font-semibold">
          <Rss size={17} className="text-gold-500" aria-hidden="true" /> Fontes monitoradas ({fontes.total ?? '—'})
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs muted">{online} responderam na última coleta</span>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-gray-200 p-4 dark:border-white/[0.07]">
          {!fontes.itens.length && (
            <p className="text-sm muted">
              {fontes.carregando ? 'Consultando o servidor…' : 'A API não respondeu.'}
            </p>
          )}
          {fontes.itens.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Circle
                  size={8}
                  className={f.status === 'ok'
                    ? 'fill-emerald-400 text-emerald-700 dark:text-emerald-400'
                    : 'fill-red-400 text-red-700 dark:text-red-400'}
                />
                <span className="truncate">{f.name}</span>
              </span>
              <span className="shrink-0 font-mono text-xs muted">
                {f.status === 'ok' ? `${f.items ?? 0}` : f.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * As notícias que mais citam entidades brasileiras concretas. O índice numérico
 * fica de fora de propósito: ele ordena, mas não mede importância nem risco.
 */
const RELEVANTES_INICIAIS = 3

function RelevantesParaOBrasil() {
  const r = useResource(() => request('GET /intel/brasil', { params: { days: 30 } }), [])
  const itens = r.data?.maisBrasileiras || []
  const [todas, setTodas] = useState(false)
  const visiveis = itens.slice(0, todas ? 6 : RELEVANTES_INICIAIS)

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Flag size={18} className="text-gold-500" />
        Notícias que citam o Brasil
        <InfoTooltip text="Ordenadas por quantas entidades brasileiras concretas o texto cita — órgãos, empresas, infraestrutura crítica, unidades da federação e setores do catálogo — e por ligações diretas com o acervo. Citação não é importância nem risco." />
      </h2>
      <p className="mt-1 text-sm muted">
        Últimos 30 dias, incluindo notícia estrangeira: conta o que o texto cita, não de onde ele veio.
      </p>

      <DataState
        loading={r.loading}
        error={r.error}
        empty={!itens.length}
        onRetry={r.refetch}
        emptyProps={{ icon: Flag, title: 'Nenhuma notícia cita entidade brasileira no período', hint: 'O reconhecimento roda a cada coleta; volte mais tarde.' }}
      >
        <ul className="mt-4 space-y-2">
          {visiveis.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <Flag size={14} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug">{m.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed muted">{m.br_motivo}</span>
                <span className="mt-1 block text-[11px] muted">
                  {m.fonte || 'Fonte'}{m.published_at ? ` · ${formatDateBR(m.published_at)}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {itens.length > RELEVANTES_INICIAIS && (
          <button
            type="button"
            onClick={() => setTodas((v) => !v)}
            aria-expanded={todas}
            className="mt-3 inline-flex items-center gap-1 py-1 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-400"
          >
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${todas ? 'rotate-180' : ''}`} />
            {todas ? 'Mostrar menos' : `Mostrar mais ${Math.min(itens.length, 6) - RELEVANTES_INICIAIS}`}
          </button>
        )}
      </DataState>
    </section>
  )
}

/**
 * O nível de alerta com a conta aberta: o número é a média ponderada, a barra é
 * a distribuição sobre a qual a média foi tirada. Sem nível, não inventa "NORMAL".
 */
function NivelDeAlerta({ level, score, basis, distribuicao }) {
  const ORDEM = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']
  // A escala vem de `corDoNivel`: uma fonte só, que troca junto com o modo
  // para daltonismo.
  const COR = Object.fromEntries(ORDEM.map((k) => [k, corDoNivel(k)]))
  const total = ORDEM.reduce((soma, k) => soma + (distribuicao?.[k] || 0), 0)

  if (!level || !total) {
    return (
      <p className="text-xs leading-relaxed muted">
        Sem ocorrência relevante neste período, o nível de alerta não pode ser calculado.
        Isso indica falta de dados, não que o período esteja calmo.
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-2xl font-extrabold tabular-nums leading-none">
          {score}
          <span className="text-sm font-bold muted">/100</span>
        </span>
        <span className="text-xs muted">{basis}</span>
      </div>

      {/* Cada faixa é uma urgência; a largura é a proporção real. */}
      <div
        className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
        role="img"
        aria-label={`Distribuição por urgência: ${ORDEM.filter((k) => distribuicao[k]).map((k) => `${urgencyMeta[k].label} ${distribuicao[k]}`).join(', ')}`}
      >
        {ORDEM.filter((k) => distribuicao[k]).map((k) => (
          <span
            key={k}
            title={`${urgencyMeta[k].label}: ${distribuicao[k]} de ${total}`}
            style={{ width: `${(distribuicao[k] / total) * 100}%`, backgroundColor: COR[k] }}
          />
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {ORDEM.filter((k) => distribuicao[k]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COR[k] }} />
            <span className="font-semibold">{urgencyMeta[k].label}</span>
            <span className="font-mono tabular-nums muted">
              {distribuicao[k]} · {Math.round((distribuicao[k] / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Como o nível é calculado
        </summary>
        <p className="mt-1.5 leading-relaxed muted">
          Pesos: CRÍTICO 100, ALTO 70, MÉDIO 40, BAIXO 15. A média considera <strong>todas</strong> as
          {' '}{total} ocorrências do período, e não só as notícias listadas — a lista vem ordenada por
          urgência e cortada, por isso é sempre mais grave que o período inteiro.
        </p>
      </details>
    </div>
  )
}
