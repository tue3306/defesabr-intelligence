import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Eye, FileDown, Trash2, Filter, Archive as ArchiveIcon, Star,
  Newspaper, Calendar, X, CheckSquare, Square, Layers, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import NewsCard from '../components/ui/NewsCard'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import InfoTooltip from '../components/ui/InfoTooltip'
import Can from '../auth/Can'
import { useNewsStore } from '../store/newsStore'
import { CATEGORIES, ALERT_LEVELS } from '../data/mockData'
import { categoryColor, alertMeta, plural } from '../utils/textUtils'
import { formatDateBR } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'
import { rankItems } from '../utils/semanticSearch'

const PER_PAGE = 8

// -----------------------------------------------------------------------------
// ARQUIVO & MINHA PASTA — dois acervos:
//   • Clippings arquivados: edições salvas pela pessoa, neste navegador.
//   • Minha pasta: notícias marcadas com "Salvar", guardadas na conta.
// A pasta vem primeiro; `?aba=clippings` abre direto no arquivo.
// -----------------------------------------------------------------------------
export default function Archive() {
  const clippings = useNewsStore((s) => s.clippings)
  const favorites = useNewsStore((s) => s.favorites)
  const deleteClipping = useNewsStore((s) => s.deleteClipping)
  const removeFavorite = useNewsStore((s) => s.removeFavorite)
  const [params] = useSearchParams()

  // Abre na pasta, salvo pedido na URL ou quando só o arquivo tem conteúdo.
  const [tab, setTab] = useState(() =>
    params.get('aba') === 'clippings' || (!favorites.length && clippings.length) ? 'clippings' : 'pasta',
  ) // 'clippings' | 'pasta'
  const [query, setQuery] = useState(params.get('q') || '')
  const [cats, setCats] = useState([])
  const [alert, setAlert] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [openItem, setOpenItem] = useState(null)
  const [selected, setSelected] = useState([])
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    const q = params.get('q')
    if (q) setQuery(q)
  }, [params])

  // Reinicia a paginação e a seleção ao trocar filtros/aba.
  useEffect(() => { setPage(1); setSelected([]) }, [query, cats, alert, sort, tab, range])

  const filtered = useMemo(() => {
    let list = [...clippings]
    if (cats.length) list = list.filter((c) => c.categories?.some((cat) => cats.includes(cat)))
    if (alert) list = list.filter((c) => c.alert_level === alert)
    if (range.from) list = list.filter((c) => c.date >= range.from)
    if (range.to) list = list.filter((c) => c.date <= range.to)

    if (query.trim()) {
      const ranked = rankItems(query, list, (c) => [
        { text: c.title, weight: 5 },
        { text: (c.categories || []).join(' '), weight: 3 },
        { text: c.preview, weight: 2 },
      ])
      return ranked.map((r) => r.item)
    }

    list.sort((a, b) =>
      sort === 'recent' ? b.date.localeCompare(a.date)
        : sort === 'old' ? a.date.localeCompare(b.date)
          : b.newsCount - a.newsCount
    )
    return list
  }, [clippings, query, cats, alert, sort, range])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  // Limitada ao total: excluir os últimos itens da última página a deixava
  // vazia, com clippings ainda nas anteriores.
  const current = Math.min(page, pages)
  const pageItems = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const hasFilters = !!(query || cats.length || alert || range.from || range.to)
  const filtrosExtras = cats.length + (range.from ? 1 : 0) + (range.to ? 1 : 0)
  const clearFilters = () => { setQuery(''); setCats([]); setAlert(''); setRange({ from: '', to: '' }) }

  const allPageSelected = pageItems.length > 0 && pageItems.every((c) => selected.includes(c.id))
  const toggleAll = () => {
    setSelected(allPageSelected ? [] : pageItems.map((c) => c.id))
  }
  const toggleOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const removeOne = (clipping) => {
    deleteClipping(clipping.id)
    setSelected((prev) => prev.filter((id) => id !== clipping.id))
    toast.success('Clipping removido do arquivo')
  }

  const removeSelected = () => {
    selected.forEach((id) => deleteClipping(id))
    toast.success(selected.length === 1 ? '1 clipping removido' : `${selected.length} clippings removidos`)
    setSelected([])
  }

  // Um PDF de cada vez: a biblioteca é compartilhada e gerar em paralelo
  // embaralharia os documentos. O aviso só vem quando todos existem.
  const exportSelected = async () => {
    const items = clippings.filter((c) => selected.includes(c.id))
    try {
      for (const c of items) {
        await exportClippingToPDF(c.data)
      }
      toast.success(items.length === 1 ? '1 PDF gerado' : `${items.length} PDFs gerados`)
    } catch {
      toast.error('Falha ao gerar um dos PDFs. Tente novamente.')
    }
  }

  // Exportação individual, com aviso de erro em vez de falha silenciosa.
  const exportOne = async (clipping) => {
    try {
      await exportClippingToPDF(clipping)
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArchiveIcon}
        title="Arquivo & Minha Pasta"
        description="Tudo o que você guardou: as notícias salvas na sua pasta e as edições do clipping que você arquivou."
        breadcrumb={[{ label: 'Notícias e ligações' }, { label: 'Arquivo & Pasta' }]}
      >
        <div className="flex gap-2 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-white/10" role="tablist" aria-label="O que mostrar">
          <TabBtn active={tab === 'pasta'} onClick={() => setTab('pasta')} icon={Star} label="Minha pasta" count={favorites.length} />
          <TabBtn active={tab === 'clippings'} onClick={() => setTab('clippings')} icon={Newspaper} label={<>Clippings<span className="hidden sm:inline"> arquivados</span></>} count={clippings.length} />
        </div>
      </PageHeader>

      {/* ───────────── CLIPPINGS ───────────── */}
      {tab === 'clippings' && (
        <>
          {/* FILTROS — só aparecem quando há o que filtrar */}
          {clippings.length > 0 && (
          <section className="card space-y-3 p-4 sm:p-5" aria-label="Filtros do arquivo">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SearchBar placeholder="Buscar no arquivo (ex.: submarino)…" defaultValue={query} onChange={setQuery} />
              <select value={alert} onChange={(e) => setAlert(e.target.value)} className="input" aria-label="Nível de alerta">
                <option value="">Todos os níveis de alerta</option>
                {ALERT_LEVELS.map((a) => <option key={a} value={a}>{alertMeta[a]?.label || a}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenar por">
                <option value="recent">Mais recentes primeiro</option>
                <option value="old">Mais antigos primeiro</option>
                <option value="relevant">Com mais notícias primeiro</option>
              </select>
            </div>

            {/* Período e assuntos ficam recolhidos; abrem sozinhos se estiverem em uso. */}
            <details className="group" open={filtrosExtras > 0 || undefined}>
              <summary className="inline-flex min-h-[36px] cursor-pointer list-none items-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-wide muted hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-gray-200">
                <Filter size={13} aria-hidden="true" /> Período e assuntos
                {filtrosExtras > 0 && <span className="rounded-full bg-gold-500/20 px-1.5 text-[10px] tabular-nums text-gold-600 dark:text-gold-400">{filtrosExtras}</span>}
                <ChevronRight size={13} className="transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="periodo-de" className="mb-1 block text-xs font-semibold muted">De</label>
                    <input
                      id="periodo-de"
                      type="date"
                      value={range.from}
                      onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label htmlFor="periodo-ate" className="mb-1 block text-xs font-semibold muted">Até</label>
                    <input
                      id="periodo-ate"
                      type="date"
                      value={range.to}
                      onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold muted">Assuntos</p>
                  <TagFilter
                    options={CATEGORIES}
                    selected={cats}
                    getColor={categoryColor}
                    onToggle={(c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                  />
                </div>
              </div>
            </details>
          </section>
          )}

          {/* BARRA DE RESULTADO E AÇÕES EM LOTE */}
          {clippings.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm muted" role="status">
              {filtered.length === 1 ? '1 clipping encontrado' : `${filtered.length} clippings encontrados`}
              {query.trim() && <span className="text-gold-600 dark:text-gold-400"> · do mais parecido para o menos</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {pageItems.length > 0 && (
                <button type="button" onClick={toggleAll} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold muted hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-gray-200">
                  {allPageSelected ? <CheckSquare size={14} aria-hidden="true" /> : <Square size={14} aria-hidden="true" />}
                  {allPageSelected ? 'Desmarcar página' : 'Selecionar página'}
                </button>
              )}
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
                  <X size={13} aria-hidden="true" /> Limpar filtros
                </button>
              )}
            </div>
          </div>
          )}

          {selected.length > 0 && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-gold-500/40 bg-gold-500/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Layers size={15} className="text-gold-600 dark:text-gold-400" aria-hidden="true" />
                {selected.length === 1 ? '1 selecionado' : `${selected.length} selecionados`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Can do="reports.export">
                  <button type="button" onClick={exportSelected} className="btn-ghost px-2.5 py-1 text-xs">
                    <FileDown size={13} aria-hidden="true" /> Baixar PDFs
                  </button>
                </Can>
                <button
                  type="button"
                  onClick={() => setConfirm({ bulk: true })}
                  className="btn-ghost px-2.5 py-1 text-xs text-red-800 dark:text-red-400"
                >
                  <Trash2 size={13} aria-hidden="true" /> Excluir selecionados
                </button>
                <button type="button" onClick={() => setSelected([])} className="btn-ghost px-2.5 py-1 text-xs">Cancelar seleção</button>
              </div>
            </div>
          )}

          {/* LISTA */}
          {pageItems.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              tone={hasFilters ? 'filter' : 'neutral'}
              title={hasFilters ? 'Nenhum clipping corresponde aos filtros' : 'Ainda não há clippings arquivados'}
              hint={hasFilters
                ? 'Tente limpar a busca, o período, os assuntos ou o nível.'
                : 'Em Notícias do dia, use “Salvar no arquivo” para guardar a edição do dia aqui. O arquivo fica neste navegador.'}
              action={hasFilters
                ? { label: 'Limpar filtros', onClick: clearFilters, icon: X }
                : { label: 'Ir a Notícias do dia', to: '/clipping' }}
            />
          ) : (
            <div className="space-y-3">
              {pageItems.map((c) => {
                const isSelected = selected.includes(c.id)
                return (
                  <article
                    key={c.id}
                    className={`card flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? 'border-gold-500/60 bg-gold-500/5' : 'hover:border-gold-500/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleOne(c.id)}
                        className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={isSelected ? `Desmarcar ${c.title}` : `Selecionar ${c.title}`}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? <CheckSquare size={16} className="text-gold-500" aria-hidden="true" /> : <Square size={16} aria-hidden="true" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-gold-600 dark:text-gold-400">
                            <Calendar size={12} aria-hidden="true" /> {formatDateBR(c.date)}
                          </span>
                          <Badge type="alert" value={c.alert_level} />
                          <span className="text-xs tabular-nums muted">{plural(c.newsCount, 'notícia')}</span>
                        </div>
                        <h3 className="mt-1 break-words font-semibold">{c.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-sm muted">{c.preview}</p>
                        {c.categories?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.categories.slice(0, 4).map((cat) => <Badge key={cat} type="category" value={cat} />)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => setOpenItem(c)} className="btn-primary px-3 py-1.5 text-xs"><Eye size={14} aria-hidden="true" /> Ler</button>
                      <Can do="reports.export">
                        <button type="button" onClick={() => exportOne(c.data)} className="btn-ghost px-2.5 py-1.5 text-xs">
                          <FileDown size={14} aria-hidden="true" /> Baixar PDF
                        </button>
                      </Can>
                      <button
                        type="button"
                        onClick={() => setConfirm(c)}
                        className="btn-ghost px-2.5 py-1.5 text-xs text-red-800 dark:text-red-400"
                        aria-label={`Remover ${c.title} do arquivo`}
                        title="Remover do arquivo"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                )
              })}

              <Pagination page={current} pages={pages} onChange={setPage} total={filtered.length} label="clippings" />
            </div>
          )}
        </>
      )}

      {/* ───────────── MINHA PASTA ───────────── */}
      {tab === 'pasta' && (
        <div className="space-y-4">
          {favorites.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm muted">
              {plural(favorites.length, 'notícia salva', 'notícias salvas')}. A pasta fica na sua conta e aparece em qualquer navegador.
              <InfoTooltip text="Para salvar, use “Salvar” em qualquer notícia. Para tirar daqui, use o × no canto da notícia." />
            </p>
          )}

          {favorites.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Sua pasta está vazia"
              hint="Ao ler as notícias, use “Salvar” para guardar uma notícia aqui e ler depois."
              action={{ label: 'Ir a Notícias do dia', to: '/clipping' }}
            />
          ) : (
            <div className="space-y-4">
              {favorites.map((n) => (
                <div key={n.id} className="relative">
                  <NewsCard news={n} variant="full" />
                  <button
                    type="button"
                    onClick={() => { removeFavorite(n.id); toast.success('Notícia removida da pasta') }}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-gray-500 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-600/50 dark:bg-military-darker/80 dark:text-gray-400"
                    aria-label={`Remover ${n.title} da pasta`}
                    title="Remover da pasta"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALHE */}
      <Modal open={!!openItem} onClose={() => setOpenItem(null)} title={openItem?.title} maxWidth="max-w-3xl">
        {openItem && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge type="alert" value={openItem.data.alert_level} />
              <span className="text-xs muted">{formatDateBR(openItem.date)}</span>
              <Can do="reports.export">
                <button type="button" onClick={() => exportOne(openItem.data)} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
                  <FileDown size={13} aria-hidden="true" /> Baixar PDF
                </button>
              </Can>
            </div>
            {openItem.data.news?.map((n, i) => <NewsCard key={i} news={n} variant="full" />)}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm?.bulk ? removeSelected() : removeOne(confirm))}
        title={confirm?.bulk ? 'Excluir clippings selecionados' : 'Remover clipping do arquivo'}
        description={confirm?.bulk
          ? `${selected.length === 1 ? '1 clipping será removido' : `${selected.length} clippings serão removidos`} do seu arquivo. Esta ação não pode ser desfeita.`
          : confirm ? `“${confirm.title}” será removido do arquivo. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
      />
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`-mb-px flex min-h-[44px] shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
        active
          ? 'border-gold-500 text-gray-900 dark:text-white'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={16} aria-hidden="true" /> {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
        active ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'bg-white/10 muted'
      }`}>
        {count}
      </span>
    </button>
  )
}
