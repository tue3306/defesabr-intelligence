import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

import Badge from '../components/ui/Badge'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Can from '../auth/Can'
import { newsService } from '../services/newsService'
import { useFontesReais } from '../hooks/useFontesReais'
import EventosConsolidados from '../components/clipping/EventosConsolidados'
import { useNewsStore } from '../store/newsStore'
import { useSettingsStore } from '../store/settingsStore'
import { URGENCY_LEVELS } from '../data/mockData'
import { alertMeta, categoryColor, clipboard, urgencyMeta } from '../utils/textUtils'
import { formatDateTimeBR, formatFullDate } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'

// Quem assina a edição publicada. O produto é demonstrativo: creditamos a mesa
// editorial, não uma pessoa real, para não apresentar dado inventado como oficial.
const EDITORIAL_DESK = 'Mesa de Análise · DefesaBR Intelligence'

export default function DailyClipping() {
  const addClipping = useNewsStore((s) => s.addClipping)
  const latest = useNewsStore((s) => s.latestClipping)
  const clippings = useNewsStore((s) => s.clippings)
  // Contava as fontes "habilitadas" da lista escrita a mao. O numero da
  // edicao vem do servidor (`result.active_sources`); este era so o fallback,
  // e um fallback que inventa numero e pior que nenhum.
  const fontesReais = useFontesReais()

  const [result, setResult] = useState(latest)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [loadingEdition, setLoadingEdition] = useState(true)

  // EDIÇÃO REAL, do backend.
  //
  // Antes, esta tela abria sempre com o documento demonstrativo guardado no
  // navegador — o que fazia o clipping parecer congelado numa data de 2026.
  // Agora ela pede a edição ao servidor, que a monta do que foi realmente
  // coletado no período.
  //
  // A edição local continua sendo o estado inicial: se a API estiver fora, a
  // tela abre com ela em vez de vazia, e o selo diz de onde veio o dado.
  useEffect(() => {
    let vivo = true
    newsService.latestClipping()
      .then(({ data, meta }) => {
        // Só substitui se veio da API E tem conteúdo. Uma edição real vazia
        // (nenhuma notícia relevante no período) ainda é a resposta certa e
        // deve aparecer — mas não deve apagar a demonstração por acidente.
        if (!vivo || meta?.source !== 'live' || !data) return
        setResult({ ...data, source: 'live' })
      })
      .catch(() => { /* mantém a edição local */ })
      .finally(() => { if (vivo) setLoadingEdition(false) })
    return () => { vivo = false }
  }, [])

  // Filtros da edição em tela
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [urgency, setUrgency] = useState('')

  const allNews = result?.news || []
  const hasFilters = Boolean(query.trim() || cats.length || urgency)

  // As categorias disponíveis vêm da própria edição: nada de chip que não filtra nada.
  const availableCats = useMemo(
    () => [...new Set(allNews.map((n) => n.category).filter(Boolean))],
    [allNews]
  )

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
    toast.success('Clipping salvo no arquivo')
  }

  // A geração do PDF é assíncrona (a biblioteca é carregada sob demanda):
  // o aviso de sucesso só pode vir depois que o arquivo existe de fato.
  const handlePDF = async () => {
    if (!result) return
    try {
      await exportClippingToPDF(result)
      toast.success('PDF do clipping gerado')
    } catch {
      toast.error('Não foi possível gerar o PDF deste clipping.')
    }
  }

  const handleDateChange = (e) => {
    const iso = e.target.value
    if (!iso) return
    const found = clippings.find((c) => c.date === iso)
    if (found) {
      setResult(found.data)
      clearFilters()
      toast.success(`Edição de ${found.date} carregada`)
    } else {
      toast('Sem clipping arquivado nesta data', { icon: '📭' })
    }
  }

  const alert = alertMeta[result?.alert_level] || alertMeta.NORMAL
  const publishedAt = result?.generatedAt || result?.date

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Newspaper}
        title="Clipping Diário"
        description="O que a coleta trouxe em segurança e defesa no período, filtrado por relevância, classificado por categoria e urgência, com o nível de alerta do dia."
        help="O nível de alerta resume a intensidade dos eventos do dia: NORMAL, ATENÇÃO, ALERTA ou CRÍTICO."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Clipping Diário' }]}
        badges={
          <>
            <Badge type="alert" value={result?.alert_level} />
            {/* O selo segue a ORIGEM da edição em tela. Uma edição montada
                pelo servidor a partir de coleta real é dado ao vivo, mesmo sem
                resumo executivo — que é análise, não coleta. */}
            <Badge type={result?.source === 'live' ? 'live' : 'demo'} />
          </>
        }
        meta={[
          { label: 'Edição', value: result?.date || formatFullDate() },
          { label: 'Notícias', value: String(allNews.length) },
          // Duas coleções de fontes convivem aqui, e o contador precisa mostrar
          // a que produziu ESTA edição: quantas responderam na última execução
          // da coleta. O fallback também vem do servidor — antes era a
          // contagem de uma lista escrita à mão no navegador.
          { label: 'Fontes ativas', value: String(result?.active_sources ?? fontesReais.total ?? '—') },
        ]}
        actions={
          <>
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/10">
              <CalendarDays size={16} className="text-gold-500" />
              <span className="sr-only">Carregar clipping arquivado por data</span>
              <input
                type="date"
                onChange={handleDateChange}
                className="bg-transparent text-sm focus:outline-none"
                aria-label="Carregar clipping arquivado por data"
              />
            </label>

            {/* Aqui havia um botão "Gerar clipping com IA". Ele não gerava
                nada: sem chave de modelo, o clique animava quatro etapas
                falsas por 1,4 s e devolvia um documento escrito à mão. Uma
                interface que encena trabalho que não acontece é pior que a
                ausência do recurso, porque quem assiste acredita.

                A edição desta tela é montada pelo SERVIDOR, a partir do que os
                coletores trouxeram e o filtro aprovou. Não há passo de IA no
                caminho, e a nota abaixo diz exatamente isso. */}
            <PublishedNote at={publishedAt} />
          </>
        }
      >
        {/* Barra de ações do documento */}
        <div className="flex flex-wrap items-center gap-2">
          <Can
            do="reports.export"
            fallback={
              <Link to="/planos" className="btn-ghost" title="Exportar PDF faz parte do plano Profissional">
                <Lock size={14} /> Exportar PDF
              </Link>
            }
          >
            <button onClick={handlePDF} disabled={!result} className="btn-ghost">
              <FileDown size={16} /> Exportar PDF
            </button>
          </Can>
          <button onClick={handleSaveToArchive} disabled={!result} className="btn-ghost">
            <Save size={16} /> Salvar no arquivo
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} /> Imprimir
          </button>
          {/* A edição em tela e a geração por IA são coisas diferentes, e
              confundi-las é o que fazia esta nota dizer "demonstrativa" sobre
              uma edição montada de coleta real. */}
          {result?.source === 'live' && (
            <span className="text-xs muted">
              Edição montada pelo servidor a partir de {result.total_collected ?? 0} item(ns)
              coletados · {result.relevant_total ?? 0} aprovados pelo filtro de relevância.
            </span>
          )}
          {/* Declaração permanente, não condicional: não existe modelo de
              linguagem ligado a esta plataforma. O campo fica vazio em vez de
              preenchido com texto plausível. */}
          <span className="text-xs muted">
            Sem síntese por IA: nenhum texto desta edição foi escrito por máquina.
          </span>
        </div>
      </PageHeader>

      {/* Aqui ficava o indicador de progresso da "geração por IA": quatro
          etapas com temporizador fixo, que rodavam mesmo quando não havia
          modelo nenhum atrás. Saiu junto com o botão. O carregamento real
          desta tela é o da edição vinda do servidor, e é curto. */}

      {!result && !loadingEdition && (
        <EmptyState
          icon={Newspaper}
          title="Nenhuma edição publicada ainda"
          hint="Assim que a mesa de análise publicar o clipping do dia, ele aparece aqui com resumo executivo e nível de alerta."
          action={{ label: 'Ver edições arquivadas', to: '/arquivo', icon: CalendarDays }}
        />
      )}

      {/* Os eventos vem ANTES da edicao: e a leitura de inteligencia, e a
          edicao do dia e o documento. Quem abre o clipping quer saber o que
          aconteceu, e "tres veiculos cobriram isto" responde melhor que uma
          lista de manchetes parecidas. */}
      <EventosConsolidados />

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Resumo executivo */}
          <section
            className={`card border-l-4 p-5 sm:p-6 ${alert.classes.split(' ').find((c) => c.startsWith('border')) || ''}`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight">Resumo executivo</h2>
              <Badge type="alert" value={result.alert_level} />
            </div>
            {result.summary_executive
              ? result.summary_executive.split('\n').filter(Boolean).map((p, i) => (
                <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p}</p>
              ))
              : (
                // Cabeçalho sem texto embaixo deixa o leitor supondo que algo
                // falhou ao carregar. A nota do servidor diz a verdade: não é
                // falha, é recurso que esta versão não tem.
                <p className="text-sm italic leading-relaxed muted">
                  {result.summary_note
                    || 'Resumo executivo automático não é gerado nesta versão — exigiria um modelo de linguagem.'}
                </p>
              )}
            {result.editor_note && (
              <blockquote className="editorial-quote mt-4">
                <span className="font-semibold not-italic text-gold-600 dark:text-gold-400">Nota do analista: </span>
                {result.editor_note}
              </blockquote>
            )}
          </section>

          {/* Filtros da edição */}
          <section className="card space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SearchBar
                placeholder="Buscar nesta edição (ex.: submarino, cibersegurança)…"
                defaultValue={query}
                onChange={setQuery}
              />
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="input"
                aria-label="Filtrar por urgência"
              >
                <option value="">Todas as urgências</option>
                {URGENCY_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{urgencyMeta[lv]?.label || lv}</option>
                ))}
              </select>
            </div>
            {availableCats.length > 1 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
                  <Filter size={13} /> Categorias
                </p>
                <TagFilter
                  options={availableCats}
                  selected={cats}
                  getColor={categoryColor}
                  onToggle={(c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3 text-sm dark:border-white/[0.07]">
              <span className="muted" aria-live="polite">
                <strong className="text-gray-700 dark:text-gray-200">{filteredNews.length}</strong> de {allNews.length} notícias
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">
                  Limpar filtros
                </button>
              )}
            </div>
          </section>

          {/* Notícias */}
          {filteredNews.length === 0 ? (
            <EmptyState
              icon={Filter}
              tone="filter"
              title="Nenhuma notícia corresponde aos filtros"
              hint="Ajuste a busca, a urgência ou as categorias para ver as demais notícias desta edição."
              action={{ label: 'Limpar filtros', onClick: clearFilters, icon: SlidersHorizontal }}
            />
          ) : (
            <section className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight">Notícias selecionadas</h2>
              {filteredNews.map((n, i) => (
                <ClippingNewsItem key={n.id ?? i} news={n} defaultOpen={i === 0} />
              ))}
            </section>
          )}

          {allNews.length > 0 && <ThemeCounter news={allNews} />}

          {result.trends?.length > 0 && (
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide muted">Tendências do dia</h3>
              <div className="flex flex-wrap gap-2">
                {result.trends.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      )}

      <SourcesPanel open={sourcesOpen} onToggle={() => setSourcesOpen((o) => !o)} />

      <p className="text-xs muted">
        Seleção automática por relevância sobre o que foi coletado das fontes. Não há curadoria humana
        nem resumo executivo: a edição é o resultado do filtro, não uma análise.
      </p>
    </div>
  )
}

// Crédito discreto para quem só LÊ a edição (sem capacidade de gerar).
function PublishedNote({ at }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs muted">
      <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" />
      Publicado por {EDITORIAL_DESK}
      {at && <span className="font-mono">· {formatDateTimeBR(at)}</span>}
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

  const save = () => {
    const added = toggleFavorite(news)
    toast.success(added ? 'Salvo na sua pasta' : 'Removido da pasta')
  }

  return (
    <article className="card p-4 transition-colors hover:border-gold-500/25">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge type="urgency" value={news.urgency} />
        <Badge type="category" value={news.category} />
        <span className="muted">{news.source}</span>
        {news.region && <span className="muted">· {news.region}</span>}
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">{news.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{news.summary}</p>

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
      <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
        Notícias por tema
        <span className="chip normal-case">{news.length} no total</span>
      </h3>
      <div className="space-y-2.5">
        {rows.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-3">
            <span className="flex w-32 shrink-0 items-center gap-2 text-sm sm:w-40">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: categoryColor(cat) }} />
              <span className="truncate font-medium">{cat}</span>
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/30">
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
  // Listava as 15 fontes escritas a mao e contava quantas tinham
  // `status: 'online'` — um literal. O painel dizia "11 online" com o servidor
  // fora do ar. Agora sao as fontes reais, com o estado da ultima coleta.
  const fontes = useFontesReais()
  const online = fontes.ok ?? 0

  return (
    <section className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4" aria-expanded={open}>
        <span className="flex items-center gap-2 font-semibold">
          <Rss size={17} className="text-gold-500" /> Fontes monitoradas ({fontes.total ?? '—'})
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs muted">{online} responderam</span>
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
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
