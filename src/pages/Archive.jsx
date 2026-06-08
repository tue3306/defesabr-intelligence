import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Eye, FileDown, Trash2, Filter, Archive as ArchiveIcon, Star, FolderOpen, Newspaper, Calendar, X } from 'lucide-react'
import toast from 'react-hot-toast'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import NewsCard from '../components/ui/NewsCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useNewsStore } from '../store/newsStore'
import { CATEGORIES, ALERT_LEVELS } from '../data/mockData'
import { categoryColor, alertMeta } from '../utils/textUtils'
import { formatDateBR } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'
import { rankItems } from '../utils/semanticSearch'

const PER_PAGE = 8

export default function Archive() {
  const clippings = useNewsStore((s) => s.clippings)
  const favorites = useNewsStore((s) => s.favorites)
  const deleteClipping = useNewsStore((s) => s.deleteClipping)
  const removeFavorite = useNewsStore((s) => s.removeFavorite)
  const [params] = useSearchParams()

  const [tab, setTab] = useState('clippings') // 'clippings' | 'pasta'
  const [query, setQuery] = useState(params.get('q') || '')
  const [cats, setCats] = useState([])
  const [alert, setAlert] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [openItem, setOpenItem] = useState(null)

  useEffect(() => {
    const q = params.get('q')
    if (q) setQuery(q)
  }, [params])

  // Reinicia a paginação ao trocar filtros/aba
  useEffect(() => { setPage(1) }, [query, cats, alert, sort, tab])

  const filtered = useMemo(() => {
    let list = [...clippings]
    if (cats.length) list = list.filter((c) => c.categories?.some((cat) => cats.includes(cat)))
    if (alert) list = list.filter((c) => c.alert_level === alert)

    if (query.trim()) {
      const ranked = rankItems(query, list, (c) => [
        { text: c.title, weight: 5 },
        { text: (c.categories || []).join(' '), weight: 3 },
        { text: c.preview, weight: 2 },
      ])
      return ranked.map((r) => r.item)
    }

    list.sort((a, b) =>
      sort === 'recent' ? b.date.localeCompare(a.date) : sort === 'old' ? a.date.localeCompare(b.date) : b.newsCount - a.newsCount
    )
    return list
  }, [clippings, query, cats, alert, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const remove = (id) => {
    deleteClipping(id)
    toast.success('Clipping removido do arquivo')
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <ArchiveIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Arquivo & Minha Pasta</h1>
            <p className="text-sm muted">
              Reveja clippings anteriores ou consulte as notícias que você salvou.
            </p>
          </div>
        </div>

        {/* ABAS */}
        <div className="mt-5 flex gap-2 border-b border-gray-700/40">
          <TabBtn active={tab === 'clippings'} onClick={() => setTab('clippings')} icon={Newspaper} label="Clippings arquivados" count={clippings.length} />
          <TabBtn active={tab === 'pasta'} onClick={() => setTab('pasta')} icon={Star} label="Minha Pasta" count={favorites.length} />
        </div>
      </div>

      {tab === 'clippings' ? (
        <>
          {/* AJUDA RÁPIDA */}
          <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs muted">
            <span className="flex items-center gap-1.5"><Eye size={13} className="text-brand-400" /> <strong className="text-gray-300">Abrir</strong> lê o clipping completo</span>
            <span className="flex items-center gap-1.5"><FileDown size={13} className="text-brand-400" /> <strong className="text-gray-300">PDF</strong> baixa o relatório</span>
            <span className="flex items-center gap-1.5"><Trash2 size={13} className="text-red-400" /> <strong className="text-gray-300">Lixeira</strong> remove do arquivo</span>
          </div>

          {/* FILTROS */}
          <div className="card space-y-4 p-5">
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
          </div>

          <p className="text-sm muted">
            {filtered.length} clipping(s) encontrado(s)
            {query.trim() && <span className="text-brand-400"> · ordenado por relevância</span>}.
          </p>

          {/* LISTA */}
          <div className="space-y-3">
            {pageItems.length === 0 && (
              <EmptyState
                icon={Newspaper}
                title={query || cats.length || alert ? 'Nenhum clipping corresponde aos filtros' : 'Ainda não há clippings arquivados'}
                hint={query || cats.length || alert
                  ? 'Tente limpar a busca ou os filtros de categoria/nível.'
                  : 'Gere um clipping no Clipping Diário e clique em “Salvar no arquivo”.'}
                cta={query || cats.length || alert
                  ? { label: 'Limpar filtros', onClick: () => { setQuery(''); setCats([]); setAlert('') } }
                  : { label: 'Ir ao Clipping Diário', to: '/clipping' }}
              />
            )}
            {pageItems.map((c) => (
              <div key={c.id} className="card flex flex-col gap-3 p-4 transition-colors hover:border-brand-500/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-brand-400"><Calendar size={12} /> {formatDateBR(c.date)}</span>
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
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setOpenItem(c)} className="btn-primary px-3 py-1.5 text-xs"><Eye size={14} /> Abrir</button>
                  <button onClick={() => exportClippingToPDF(c.data)} className="btn-ghost px-2.5 py-1.5 text-xs"><FileDown size={14} /> PDF</button>
                  <button onClick={() => remove(c.id)} className="btn-ghost px-2.5 py-1.5 text-xs text-red-400" aria-label="Remover clipping"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINAÇÃO */}
          {pages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-8 w-8 rounded-lg text-sm font-semibold ${
                    page === i + 1 ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        /* MINHA PASTA (favoritos) */
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="flex items-center gap-2 text-sm">
              <FolderOpen size={16} className="text-brand-400" />
              <span className="font-semibold">{favorites.length}</span> notícia(s) na sua pasta
              <InfoTooltip text="Sua pasta reúne as notícias que você marcou com a estrela/“Salvar”. Fica salva neste navegador." />
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
              cta={{ label: 'Abrir Clipping Diário', to: '/clipping' }}
            />
          ) : (
            <div className="space-y-4">
              {favorites.map((n) => (
                <div key={n.id} className="relative">
                  <NewsCard news={n} variant="full" />
                  <button
                    onClick={() => { removeFavorite(n.id); toast.success('Removido da pasta') }}
                    className="absolute right-3 top-3 rounded-full border border-gray-600/50 bg-military-darker/80 p-1.5 text-gray-400 hover:text-red-400"
                    aria-label="Remover da pasta"
                  >
                    <X size={14} />
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
              <span className="text-xs muted">{openItem.data.date}</span>
              <button onClick={() => exportClippingToPDF(openItem.data)} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
                <FileDown size={13} /> Exportar PDF
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">{openItem.data.summary_executive}</p>
            {openItem.data.news?.map((n, i) => <NewsCard key={i} news={n} variant="full" />)}
          </div>
        )}
      </Modal>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'border-brand-500 text-brand-300' : 'border-transparent text-gray-400 hover:text-gray-200'
      }`}
    >
      <Icon size={16} /> {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-brand-500/20 text-brand-300' : 'bg-white/5 muted'}`}>{count}</span>
    </button>
  )
}

function EmptyState({ icon: Icon, title, hint, cta }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
        <Icon size={28} />
      </span>
      <h3 className="font-bold tracking-tight">{title}</h3>
      <p className="max-w-sm text-sm muted">{hint}</p>
      {cta && (cta.to ? (
        <Link to={cta.to} className="btn-primary mt-1">{cta.label}</Link>
      ) : (
        <button onClick={cta.onClick} className="btn-ghost mt-1">{cta.label}</button>
      ))}
    </div>
  )
}
