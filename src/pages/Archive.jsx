import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, FileDown, Trash2, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import NewsCard from '../components/ui/NewsCard'
import { useNewsStore } from '../store/newsStore'
import { CATEGORIES, ALERT_LEVELS } from '../data/mockData'
import { categoryColor, alertMeta } from '../utils/textUtils'
import { formatDateBR } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'
import { rankItems } from '../utils/semanticSearch'

const PER_PAGE = 10

export default function Archive() {
  const clippings = useNewsStore((s) => s.clippings)
  const deleteClipping = useNewsStore((s) => s.deleteClipping)
  const [params] = useSearchParams()

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

  const filtered = useMemo(() => {
    let list = [...clippings]
    if (cats.length) list = list.filter((c) => c.categories?.some((cat) => cats.includes(cat)))
    if (alert) list = list.filter((c) => c.alert_level === alert)

    if (query.trim()) {
      // Busca semântica: rankeia por relevância (título > categorias > resumo)
      // e entende termos relacionados do domínio (ex.: "submarino" → PROSUB).
      const ranked = rankItems(query, list, (c) => [
        { text: c.title, weight: 5 },
        { text: (c.categories || []).join(' '), weight: 3 },
        { text: c.preview, weight: 2 },
      ])
      return ranked.map((r) => r.item) // já ordenado por relevância
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
    toast.success('Clipping removido')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Arquivo de clippings</h1>
        <p className="text-sm muted">
          {filtered.length} clipping(s) encontrado(s)
          {query.trim() && <span className="text-brand-400"> · ordenado por relevância</span>}.
        </p>
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

      {/* LISTA */}
      <div className="space-y-3">
        {pageItems.length === 0 && (
          <div className="card p-10 text-center muted">Nenhum clipping corresponde aos filtros.</div>
        )}
        {pageItems.map((c) => (
          <div key={c.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-brand-400">{formatDateBR(c.date)}</span>
                <Badge type="alert" value={c.alert_level} />
                <span className="text-xs muted">{c.newsCount} notícias</span>
              </div>
              <h3 className="mt-1 font-semibold">{c.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-sm muted">{c.preview}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setOpenItem(c)} className="btn-ghost px-2.5 py-1.5 text-xs"><Eye size={14} /> Abrir</button>
              <button onClick={() => exportClippingToPDF(c.data)} className="btn-ghost px-2.5 py-1.5 text-xs"><FileDown size={14} /> PDF</button>
              <button onClick={() => remove(c.id)} className="btn-ghost px-2.5 py-1.5 text-xs text-red-400"><Trash2 size={14} /></button>
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

      {/* MODAL DETALHE */}
      <Modal open={!!openItem} onClose={() => setOpenItem(null)} title={openItem?.title} maxWidth="max-w-3xl">
        {openItem && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center gap-2">
              <Badge type="alert" value={openItem.data.alert_level} />
              <span className="text-xs muted">{openItem.data.date}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">{openItem.data.summary_executive}</p>
            {openItem.data.news?.map((n, i) => <NewsCard key={i} news={n} variant="full" />)}
          </div>
        )}
      </Modal>
    </div>
  )
}
