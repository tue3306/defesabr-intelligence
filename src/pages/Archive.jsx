import { useState, useMemo } from 'react'
import { Archive as ArchiveIcon, Filter, X, Bookmark, Download, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import NewsCard from '../components/ui/NewsCard'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import { useResource } from '../hooks/useResource'
import { noticias, favoritos } from '../services'
import { CATEGORIAS, URGENCIAS, META_URGENCIA, corDaCategoria } from '../data/reference'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR, timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// ACERVO
//
// Tudo o que foi coletado, sem recorte de período — inclusive o que o filtro
// RECUSOU, se a pessoa pedir.
//
// Mostrar o recusado é o que torna o filtro inspecionável: sem essa metade,
// "o filtro aprovou 58 de 127" é uma afirmação que ninguém pode conferir.
// -----------------------------------------------------------------------------
export default function Archive() {
  const [consulta, setConsulta] = useState('')
  const [cats, setCats] = useState([])
  const [urgencia, setUrgencia] = useState('')
  const [incluirRecusados, setIncluirRecusados] = useState(false)
  const [aba, setAba] = useState('acervo')

  const acervo = useResource(
    () => noticias.listar({
      days: 'all',
      limit: 200,
      q: consulta || undefined,
      category: cats.length === 1 ? cats[0] : undefined,
      urgency: urgencia || undefined,
      includeIrrelevant: incluirRecusados ? 'true' : undefined,
    }),
    [consulta, cats, urgencia, incluirRecusados],
    { keepPreviousData: true }
  )
  const salvos = useResource(() => favoritos.listar(), [])

  const idsSalvos = useMemo(
    () => new Set((salvos.data?.items || []).map((f) => f.id)),
    [salvos.data]
  )

  const lista = acervo.data?.items || []
  // O filtro por categoria com várias seleções é feito aqui: a API aceita uma
  // só, e mandar N requisições para o mesmo resultado seria desperdício.
  const filtradas = cats.length > 1 ? lista.filter((n) => cats.includes(n.category)) : lista
  const emExibicao = aba === 'salvos' ? (salvos.data?.items || []) : filtradas

  const temFiltro = !!consulta || cats.length > 0 || !!urgencia || incluirRecusados
  const limpar = () => { setConsulta(''); setCats([]); setUrgencia(''); setIncluirRecusados(false) }

  const alternarSalvo = async (n) => {
    try {
      if (idsSalvos.has(n.id)) { await favoritos.remover(n.id); toast.success('Removido dos favoritos') }
      else { await favoritos.salvar(n.id); toast.success('Salvo nos favoritos') }
      salvos.refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível salvar.')
    }
  }

  const exportar = () => {
    exportCSV(
      emExibicao.map((n) => ({
        Data: n.date ? formatDateBR(n.date) : '',
        'Título': n.title,
        Fonte: n.source,
        Categoria: n.category || '',
        'Urgência': n.urgency || '',
        'Pontuação': n.score ?? '',
        'Termos que casaram': (n.matched || []).join('; '),
        Link: n.url || '',
      })),
      `acervo-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${emExibicao.length} item(ns) exportado(s)`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArchiveIcon}
        title="Acervo"
        description="Tudo o que a coleta trouxe, sem recorte de período — inclusive o que o filtro recusou."
        help="Ligar 'incluir recusados' mostra a metade do trabalho que normalmente fica invisível: é o que permite conferir se o filtro filtra bem."
        breadcrumb={[{ label: 'Coleta' }, { label: 'Acervo' }]}
        meta={acervo.data ? [{ label: 'Última coleta', value: acervo.data.lastFetchAt ? timeAgo(acervo.data.lastFetchAt) : '—' }] : []}
        actions={
          <button onClick={exportar} disabled={!emExibicao.length} className="btn-ghost text-sm">
            <Download size={15} /> CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Database} label="Coletado" value={String(acervo.data?.totalCollected ?? 0)} hint="itens no banco" accent="brand" />
        <MetricCard icon={Filter} label="Relevantes" value={String(acervo.data?.totalRelevant ?? 0)} hint="aprovados pelo filtro" accent="green" />
        <MetricCard
          icon={Filter}
          label="Taxa de aprovação"
          value={acervo.data?.totalCollected
            ? `${Math.round((acervo.data.totalRelevant / acervo.data.totalCollected) * 100)}%`
            : '—'}
          hint="do que foi coletado"
          accent="amber"
        />
        <MetricCard icon={Bookmark} label="Favoritos" value={String(salvos.data?.total ?? 0)} hint="salvos neste navegador" accent="gold" />
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl bg-white/5 p-1">
        {[
          { id: 'acervo', rotulo: 'Acervo', icone: ArchiveIcon },
          { id: 'salvos', rotulo: `Favoritos (${salvos.data?.total ?? 0})`, icone: Bookmark },
        ].map((t) => {
          const Icone = t.icone
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={aba === t.id}
              onClick={() => setAba(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                aba === t.id ? 'bg-gold-500/20 text-gold-600 dark:text-gold-300' : 'muted hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icone size={15} /> {t.rotulo}
            </button>
          )
        })}
      </div>

      {aba === 'acervo' && (
        <section className="card space-y-4 p-5">
          <SearchBar placeholder="Buscar no acervo…" defaultValue={consulta} onChange={setConsulta} />
          <TagFilter
            options={CATEGORIAS}
            selected={cats}
            onToggle={(c) => setCats((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))}
            getColor={corDaCategoria}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-white/10">
            <span className="text-xs font-semibold uppercase muted">Urgência</span>
            {URGENCIAS.map((u) => (
              <button
                key={u}
                onClick={() => setUrgencia(urgencia === u ? '' : u)}
                aria-pressed={urgencia === u}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  urgencia === u ? META_URGENCIA[u].classes : 'muted hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {META_URGENCIA[u].rotulo}
              </button>
            ))}

            <button
              onClick={() => setIncluirRecusados((v) => !v)}
              aria-pressed={incluirRecusados}
              className={`ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                incluirRecusados ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'muted hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              incluir recusados pelo filtro
            </button>
            {temFiltro && (
              <button onClick={limpar} className="btn-ghost px-2.5 py-1 text-xs"><X size={13} /> Limpar</button>
            )}
          </div>
        </section>
      )}

      <DataState
        loading={(aba === 'acervo' ? acervo.loading : salvos.loading) && !emExibicao.length}
        error={aba === 'acervo' ? acervo.error : salvos.error}
        onRetry={aba === 'acervo' ? acervo.refetch : salvos.refetch}
        skeletonCount={4}
      >
        {emExibicao.length === 0 ? (
          <EmptyState
            icon={aba === 'salvos' ? Bookmark : ArchiveIcon}
            tone={temFiltro ? 'filter' : 'neutral'}
            title={aba === 'salvos' ? 'Nenhum favorito salvo' : temFiltro ? 'Nada corresponde aos filtros' : 'Acervo vazio'}
            hint={aba === 'salvos'
              ? 'Use o marcador nos cartões para guardar o que interessa. Os favoritos ficam neste navegador — não há conta para associá-los.'
              : temFiltro ? 'Ajuste a busca, a categoria ou a urgência.' : 'Dispare uma coleta no Clipping.'}
            action={temFiltro ? { label: 'Limpar filtros', onClick: limpar, icon: X } : undefined}
          />
        ) : (
          <>
            <p className="text-sm muted">{emExibicao.length} item(ns)</p>
            <div className="space-y-3">
              {emExibicao.map((n) => (
                <NewsCard key={n.id} noticia={n} salvo={idsSalvos.has(n.id)} onAlternarSalvo={alternarSalvo} />
              ))}
            </div>
          </>
        )}
      </DataState>
    </div>
  )
}
