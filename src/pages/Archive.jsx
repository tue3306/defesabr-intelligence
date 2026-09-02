import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Eye, FileDown, Trash2, Filter, Archive as ArchiveIcon, Star, FolderOpen,
  Newspaper, Calendar, X, FileText, Lock, CheckSquare, Square, Layers,
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
import { reportHistory } from '../data/reports'
import { reportTemplates } from '../data/reports'
import { categoryColor, alertMeta } from '../utils/textUtils'
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'
import { rankItems } from '../utils/semanticSearch'

const PER_PAGE = 8

// -----------------------------------------------------------------------------
// ARQUIVO & MINHA PASTA
//
// Três acervos com propósitos distintos:
//   • Clippings arquivados — o que a plataforma publicou, dia a dia.
//   • Minha Pasta — o que ESTA pessoa marcou como relevante.
//   • Meus relatórios — o que foi emitido a partir desse material.
// -----------------------------------------------------------------------------
export default function Archive() {
  const clippings = useNewsStore((s) => s.clippings)
  const favorites = useNewsStore((s) => s.favorites)
  const deleteClipping = useNewsStore((s) => s.deleteClipping)
  const removeFavorite = useNewsStore((s) => s.removeFavorite)
  const [params] = useSearchParams()

  const [tab, setTab] = useState('clippings') // 'clippings' | 'pasta' | 'relatorios'
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
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const hasFilters = !!(query || cats.length || alert || range.from || range.to)
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
    toast.success(`${selected.length} clipping(s) removido(s)`)
    setSelected([])
  }

  // Um PDF de cada vez: a biblioteca é compartilhada e gerar em paralelo
  // embaralharia os documentos. O aviso só vem quando todos existem.
  const exportSelected = async () => {
    const items = clippings.filter((c) => selected.includes(c.id))
    try {
      for (const c of items) {
        // eslint-disable-next-line no-await-in-loop
        await exportClippingToPDF(c.data)
      }
      toast.success(`${items.length} PDF(s) gerado(s)`)
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
        description="Reveja clippings publicados, consulte o que você salvou e acompanhe os relatórios emitidos."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Arquivo & Pasta' }]}
        meta={[
          { label: 'Clippings', value: String(clippings.length) },
          { label: 'Na pasta', value: String(favorites.length) },
        ]}
      >
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-white/10" role="tablist">
          <TabBtn active={tab === 'clippings'} onClick={() => setTab('clippings')} icon={Newspaper} label="Clippings arquivados" count={clippings.length} />
          <TabBtn active={tab === 'pasta'} onClick={() => setTab('pasta')} icon={Star} label="Minha Pasta" count={favorites.length} />
          <TabBtn active={tab === 'relatorios'} onClick={() => setTab('relatorios')} icon={FileText} label="Meus relatórios" count={reportHistory.length} />
        </div>
      </PageHeader>

      {/* ───────────── CLIPPINGS ───────────── */}
      {tab === 'clippings' && (
        <>
          <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs muted">
            <span className="flex items-center gap-1.5"><Eye size={13} className="text-brand-400 dark:text-brand-300" /> <strong className="text-gray-700 dark:text-gray-300">Abrir</strong> lê o clipping completo</span>
            <span className="flex items-center gap-1.5"><FileDown size={13} className="text-brand-400 dark:text-brand-300" /> <strong className="text-gray-700 dark:text-gray-300">PDF</strong> baixa o relatório</span>
            <span className="flex items-center gap-1.5"><Trash2 size={13} className="text-red-500" /> <strong className="text-gray-700 dark:text-gray-300">Lixeira</strong> remove do arquivo</span>
          </div>

          {/* FILTROS */}
          <section className="card space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SearchBar placeholder="Busca inteligente (ex.: submarino, ciberataque)…" defaultValue={query} onChange={setQuery} />
              <select value={alert} onChange={(e) => setAlert(e.target.value)} className="input" aria-label="Nível de alerta">
                <option value="">Todos os níveis de alerta</option>
                {ALERT_LEVELS.map((a) => <option key={a} value={a}>{alertMeta[a]?.label || a}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenação">
                <option value="recent">Mais recente</option>
                <option value="old">Mais antigo</option>
                <option value="relevant">Mais notícias</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="periodo-de" className="mb-1 block text-xs font-semibold uppercase muted">De</label>
                <input
                  id="periodo-de"
                  type="date"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  className="input"
                  aria-label="Data inicial do período"
                />
              </div>
              <div>
                <label htmlFor="periodo-ate" className="mb-1 block text-xs font-semibold uppercase muted">Até</label>
                <input
                  id="periodo-ate"
                  type="date"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  className="input"
                  aria-label="Data final do período"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
                <Filter size={13} /> Categorias
              </p>
              <TagFilter
                options={CATEGORIES}
                selected={cats}
                getColor={categoryColor}
                onToggle={(c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
              />
            </div>
          </section>

          {/* BARRA DE RESULTADO E AÇÕES EM LOTE */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm muted">
              {filtered.length} clipping(s) encontrado(s)
              {query.trim() && <span className="text-gold-600 dark:text-gold-400"> · ordenado por relevância</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {pageItems.length > 0 && (
                <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-xs font-semibold muted hover:text-gray-800 dark:hover:text-gray-200">
                  {allPageSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  {allPageSelected ? 'Desmarcar página' : 'Selecionar página'}
                </button>
              )}
              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
                  <X size={13} /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-gold-500/40 bg-gold-500/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Layers size={15} className="text-gold-600 dark:text-gold-400" />
                {selected.length} selecionado(s)
              </p>
              <div className="flex flex-wrap gap-2">
                <Can do="reports.export">
                  <button onClick={exportSelected} className="btn-ghost px-2.5 py-1 text-xs">
                    <FileDown size={13} /> Exportar PDFs
                  </button>
                </Can>
                <button
                  onClick={() => setConfirm({ bulk: true })}
                  className="btn-ghost px-2.5 py-1 text-xs text-red-800 dark:text-red-400"
                >
                  <Trash2 size={13} /> Excluir selecionados
                </button>
                <button onClick={() => setSelected([])} className="btn-ghost px-2.5 py-1 text-xs">Cancelar</button>
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
                ? 'Tente limpar a busca, o período ou os filtros de categoria e nível.'
                : 'Gere um clipping no Clipping Diário e clique em “Salvar no arquivo”.'}
              action={hasFilters
                ? { label: 'Limpar filtros', onClick: clearFilters, icon: X }
                : { label: 'Ir ao Clipping Diário', to: '/clipping' }}
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
                        onClick={() => toggleOne(c.id)}
                        className="mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-gold-500"
                        aria-label={isSelected ? `Desmarcar ${c.title}` : `Selecionar ${c.title}`}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? <CheckSquare size={16} className="text-gold-500" /> : <Square size={16} />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-gold-600 dark:text-gold-400">
                            <Calendar size={12} /> {formatDateBR(c.date)}
                          </span>
                          <Badge type="alert" value={c.alert_level} />
                          <span className="text-xs muted">{c.newsCount} notícias</span>
                        </div>
                        <h3 className="mt-1 font-semibold">{c.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-sm muted">{c.preview}</p>
                        {c.categories?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.categories.slice(0, 4).map((cat) => <Badge key={cat} type="category" value={cat} />)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => setOpenItem(c)} className="btn-primary px-3 py-1.5 text-xs"><Eye size={14} /> Abrir</button>
                      <Can do="reports.export">
                        <button onClick={() => exportOne(c.data)} className="btn-ghost px-2.5 py-1.5 text-xs">
                          <FileDown size={14} /> PDF
                        </button>
                      </Can>
                      <button
                        onClick={() => setConfirm(c)}
                        className="btn-ghost px-2.5 py-1.5 text-xs text-red-800 dark:text-red-400"
                        aria-label={`Remover ${c.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                )
              })}

              <Pagination page={page} pages={pages} onChange={setPage} total={filtered.length} label="clippings" />
            </div>
          )}
        </>
      )}

      {/* ───────────── MINHA PASTA ───────────── */}
      {tab === 'pasta' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-sm">
              <FolderOpen size={16} className="text-brand-400 dark:text-brand-300" />
              <span className="font-semibold">{favorites.length}</span> notícia(s) na sua pasta
              <InfoTooltip text="Sua pasta reúne as notícias marcadas com “Salvar”. Fica guardada neste navegador." />
            </p>
            {favorites.length > 0 && (
              <span className="text-xs muted">Salve qualquer notícia clicando em “Salvar” no Clipping Diário.</span>
            )}
          </div>

          {favorites.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Sua pasta está vazia"
              hint="Ao ler o Clipping Diário, clique em “Salvar” numa notícia para guardá-la aqui e montar seu próprio dossiê."
              action={{ label: 'Abrir Clipping Diário', to: '/clipping' }}
            />
          ) : (
            <div className="space-y-4">
              {favorites.map((n) => (
                <div key={n.id} className="relative">
                  <NewsCard news={n} variant="full" />
                  <button
                    onClick={() => { removeFavorite(n.id); toast.success('Removido da pasta') }}
                    className="absolute right-3 top-3 rounded-full border border-gray-300 bg-white/90 p-1.5 text-gray-500 transition-colors hover:text-red-500 dark:border-gray-600/50 dark:bg-military-darker/80 dark:text-gray-400"
                    aria-label={`Remover ${n.title} da pasta`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────── MEUS RELATÓRIOS ───────────── */}
      {tab === 'relatorios' && (
        <Can
          do="reports.export"
          fallback={
            <EmptyState
              icon={Lock}
              tone="locked"
              title="Relatórios no plano Profissional"
              hint="Emita briefings executivos, avaliações de risco e boletins temáticos em PDF, CSV ou JSON — e acompanhe aqui o histórico de tudo o que foi gerado."
              action={{ label: 'Ver planos', to: '/planos' }}
            />
          }
        >
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="flex items-center gap-2 text-sm">
                <FileText size={16} className="text-brand-400 dark:text-brand-300" />
                <span className="font-semibold">{reportHistory.length}</span> relatório(s) emitido(s) pela equipe
              </p>
              <Link to="/relatorios" className="btn-primary px-3 py-1.5 text-xs">
                Emitir novo relatório
              </Link>
            </div>

            <div className="card overflow-x-auto p-5">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th scope="col" className="py-2 pr-4 font-semibold">Relatório</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Formato</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Autor</th>
                    <th scope="col" className="py-2 font-semibold">Emitido em</th>
                  </tr>
                </thead>
                <tbody>
                  {reportHistory.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                      <td className="py-2.5 pr-4">
                        <span className="block font-medium">{r.name}</span>
                        <span className="text-xs muted">
                          {reportTemplates.find((t) => t.id === r.template)?.name || r.template}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4"><span className="chip uppercase">{r.format}</span></td>
                      <td className="py-2.5 pr-4 text-xs">{r.author}</td>
                      <td className="py-2.5 font-mono text-xs muted">{formatDateTimeBR(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Can>
      )}

      {/* MODAL DETALHE */}
      <Modal open={!!openItem} onClose={() => setOpenItem(null)} title={openItem?.title} maxWidth="max-w-3xl">
        {openItem && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge type="alert" value={openItem.data.alert_level} />
              <span className="text-xs muted">{openItem.data.date}</span>
              <Can do="reports.export">
                <button onClick={() => exportOne(openItem.data)} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
                  <FileDown size={13} /> Exportar PDF
                </button>
              </Can>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{openItem.data.summary_executive}</p>
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
          ? `${selected.length} clipping(s) serão removidos do seu arquivo. Esta ação não pode ser desfeita.`
          : confirm ? `“${confirm.title}” será removido do arquivo. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
      />
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-gold-500 text-gray-900 dark:text-white'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={16} /> {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
        active ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'bg-white/10 muted'
      }`}>
        {count}
      </span>
    </button>
  )
}
