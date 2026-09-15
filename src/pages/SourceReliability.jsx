import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, X, Gauge, AlertTriangle, Pause, Download, ExternalLink, Newspaper, Radio, BookOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import SearchBar from '../components/ui/SearchBar'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { SOURCE_STATUS } from '../data/adminData'
import { exportCSV } from '../utils/exportUtils'
import { formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// DISPONIBILIDADE DAS FONTES
//
// A tela se chamava "Confiabilidade das Fontes" e rotulava cada veículo como
// "Muito alta", "Alta" ou "Requer cautela — sempre cruzar com fonte primária".
// O número por trás era DISPONIBILIDADE: quantas vezes o feed respondeu. Uma
// fonte que nunca entregou uma matéria aprovada aparecia com "100 · Muito
// alta", e o rótulo transformava "o servidor respondeu" em juízo sobre o
// jornalismo. Havia também "Reavaliar fonte", que alterava a nota só na tela
// e sumia ao recarregar, filtros por tipos ("Internacional", "Redes") que
// nenhuma fonte tem e um "Como calculamos: cinco critérios" com a lista vazia.
//
// Ficou o que é medido, com o nome do que é: se a fonte responde e se o que
// ela entrega passa pelo filtro. As duas coisas ajudam a decidir se vale
// manter a fonte ligada — que se faz no Console de Governança.
// -----------------------------------------------------------------------------

const SORTS = [
  { id: 'disp-asc', label: 'Menor disponibilidade' },
  { id: 'disp-desc', label: 'Maior disponibilidade' },
  { id: 'aprov-desc', label: 'Mais matérias aprovadas' },
  { id: 'aprov-asc', label: 'Menos matérias aprovadas' },
  { id: 'name', label: 'Nome (A–Z)' },
]

const valorOu = (v, padrao) => (v == null ? padrao : v)

export default function SourceReliability() {
  const { data, loading, error, refetch, meta } = useResource(() => intelligenceService.sources(), [])
  const aoVivo = meta?.source === 'live'
  const sources = useMemo(() => data?.items || [], [data])

  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estado, setEstado] = useState('')
  const [sort, setSort] = useState('disp-asc')

  const categorias = useMemo(() => [...new Set(sources.map((s) => s.type).filter(Boolean))].sort(), [sources])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = sources.filter((s) => {
      if (categoria && s.type !== categoria) return false
      if (estado && s.status !== estado) return false
      if (needle && !`${s.name} ${s.domain} ${s.type || ''}`.toLowerCase().includes(needle)) return false
      return true
    })
    const disp = (s) => valorOu(s.availability, -1)
    return [...list].sort((a, b) => {
      if (sort === 'disp-desc') return disp(b) - disp(a)
      if (sort === 'aprov-desc') return (b.relevant_articles || 0) - (a.relevant_articles || 0)
      if (sort === 'aprov-asc') return (a.relevant_articles || 0) - (b.relevant_articles || 0)
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return disp(a) - disp(b)
    })
  }, [sources, query, categoria, estado, sort])

  const stats = useMemo(() => {
    const medidas = sources.filter((s) => s.availability != null)
    return {
      media: medidas.length ? Math.round(medidas.reduce((a, s) => a + s.availability, 0) / medidas.length) : null,
      falha: sources.filter((s) => s.status === 'indisponivel').length,
      pausadas: sources.filter((s) => s.status === 'pausada').length,
      semAprovadas: sources.filter((s) => (s.articles || 0) > 0 && !s.relevant_articles).length,
      nuncaEntregou: sources.filter((s) => !s.articles).length,
    }
  }, [sources])

  const hasFilters = !!(query || categoria || estado)
  const clearFilters = () => { setQuery(''); setCategoria(''); setEstado('') }

  const exportar = () => {
    exportCSV(
      filtered.map((s) => ({
        Fonte: s.name,
        Domínio: s.domain,
        Categoria: s.type,
        Estado: SOURCE_STATUS[s.status]?.label || s.status,
        'Disponibilidade (%)': valorOu(s.availability, ''),
        Execuções: valorOu(s.total_runs, 0),
        Falhas: valorOu(s.total_failures, 0),
        'Artigos coletados': valorOu(s.articles, 0),
        'Aprovados pelo filtro': valorOu(s.relevant_articles, 0),
        'Última coleta': s.last_fetch_at ? formatDateTimeBR(s.last_fetch_at) : '',
        'Último erro': s.last_error || '',
      })),
      `disponibilidade-fontes-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} fonte(s) exportada(s) em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BadgeCheck}
        title="Disponibilidade das Fontes"
        description="Se cada fonte responde quando o coletor a procura, e quanto do que ela entrega passa pelo filtro de relevância."
        help="Disponibilidade é a proporção de execuções em que o feed respondeu sem erro. Não é juízo sobre a qualidade do veículo: um jornal excelente com o servidor instável pontua baixo. A taxa de aprovação mostra quanto do que a fonte publica é de fato sobre segurança e defesa."
        breadcrumb={[{ label: 'Administração' }, { label: 'Disponibilidade das Fontes' }]}
        badges={<Badge type={aoVivo ? 'live' : 'sem-dado'} />}
        actions={
          <button onClick={exportar} className="btn-ghost text-sm" disabled={!filtered.length}>
            <Download size={15} /> Exportar CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Radio} label="Fontes cadastradas" value={sources.length ? String(sources.length) : '—'} hint={`${stats.pausadas} pausada(s)`} accent="brand" />
        <MetricCard icon={Gauge} label="Disponibilidade média" value={stats.media != null ? `${stats.media}%` : '—'} hint="das execuções registradas" accent={stats.media != null && stats.media < 90 ? 'amber' : 'green'} />
        <MetricCard icon={AlertTriangle} label="Com falha agora" value={String(stats.falha)} hint="última tentativa com erro" accent={stats.falha ? 'red' : 'green'} />
        <MetricCard icon={Newspaper} label="Sem matéria aprovada" value={String(stats.semAprovadas + stats.nuncaEntregou)} hint="não contribuíram ao acervo" accent={stats.semAprovadas + stats.nuncaEntregou ? 'amber' : 'green'} />
      </div>

      <section className="card space-y-3 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <SearchBar placeholder="Buscar por nome, domínio ou categoria…" defaultValue={query} onChange={setQuery} />
          </div>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input" aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenação">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SOURCE_STATUS).map(([id, meta]) => (
            <button
              key={id}
              onClick={() => setEstado(estado === id ? '' : id)}
              aria-pressed={estado === id}
              title={meta.desc}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes} ${estado === id ? 'ring-2 ring-gold-500/60' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} /> {meta.label}
            </button>
          ))}
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros ({filtered.length} de {sources.length})
            </button>
          )}
        </div>
      </section>

      <DataState
        loading={loading}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={4}
        emptyProps={{
          icon: BadgeCheck,
          tone: hasFilters ? 'filter' : 'neutral',
          title: hasFilters ? 'Nenhuma fonte corresponde aos filtros' : 'Nenhuma fonte cadastrada',
          hint: hasFilters ? 'Ajuste a busca, a categoria ou o estado.' : 'O servidor semeia as fontes na primeira subida.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((s) => <FonteCard key={s.id} s={s} />)}
        </div>
      </DataState>

      <section className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
          <BookOpen size={17} className="text-brand-400 dark:text-brand-300" /> Como ler os números
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <li><strong>Disponibilidade</strong> — execuções sem erro ÷ execuções totais, desde que a fonte foi cadastrada.</li>
          <li><strong>Aprovação</strong> — matérias que passaram pelo filtro de relevância ÷ matérias coletadas da fonte. Fonte generalista aprova pouco, e isso é esperado.</li>
          <li><strong>Sem matéria aprovada</strong> — a fonte responde mas nada do que publicou entrou no acervo. É candidata a ser pausada.</li>
        </ul>
        <p className="mt-3 text-xs muted">
          Pausar, religar ou coletar uma fonte agora: <Link to="/admin" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Console de Governança → Fontes e coleta</Link>.
        </p>
      </section>
    </div>
  )
}

function FonteCard({ s }) {
  const st = SOURCE_STATUS[s.status] || SOURCE_STATUS.configurada
  const disp = s.availability
  const aprov = s.articles ? Math.round(((s.relevant_articles || 0) / s.articles) * 100) : null
  const cor = disp == null ? '#94a3b8' : disp >= 95 ? '#2e7d46' : disp >= 80 ? '#caa733' : '#c0392b'

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight">
            {s.name}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
            </span>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs muted">
            {s.type && <span className="chip">{s.type}</span>}
            <span className="font-mono">{s.domain}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-2xl font-extrabold leading-none tabular-nums" style={{ color: cor }}>
            {disp == null ? '—' : `${disp}%`}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide muted">disponível</p>
        </div>
      </div>

      <div className="mt-3">
        <span className="block h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${disp || 0}%`, background: cor }} />
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini termo="Execuções" valor={`${s.total_runs ?? 0}`} detalhe={`${s.total_failures ?? 0} falha(s)`} />
        <Mini termo="Coletadas" valor={`${s.articles ?? 0}`} detalhe="matérias" />
        <Mini termo="Aprovadas" valor={`${s.relevant_articles ?? 0}`} detalhe={aprov == null ? '—' : `${aprov}% do coletado`} />
      </dl>

      {s.last_error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          Última falha: {s.last_error}
        </p>
      )}
      {!s.last_error && s.articles > 0 && !s.relevant_articles && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <Pause size={12} /> Responde, mas nenhuma matéria dela passou pelo filtro.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] muted">
        <span>{s.last_fetch_at ? `última coleta ${formatDateTimeBR(s.last_fetch_at)}` : 'ainda não coletada'}</span>
        {(s.site_url || s.url) && (
          <a href={s.site_url || s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Abrir site <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  )
}

function Mini({ termo, valor, detalhe }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-white/5">
      <dt className="text-[10px] font-bold uppercase tracking-wide muted">{termo}</dt>
      <dd className="font-mono text-sm font-bold">{valor}</dd>
      <dd className="text-[10px] muted">{detalhe}</dd>
    </div>
  )
}
