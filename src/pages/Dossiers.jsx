import { useState, useMemo, useRef } from 'react'
import {
  Layers, ArrowLeft, ArrowRight, MapPin, CheckCircle2, Activity, Tag,
  Filter, X, FileDown, Link2, Send, ShieldCheck, Gauge, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import SearchBar from '../components/ui/SearchBar'
import InfoTooltip from '../components/ui/InfoTooltip'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { DOSSIER_RISK } from '../data/dossiers'
import { clipboard } from '../utils/textUtils'
import { formatDateBR, timeAgo } from '../utils/dateUtils'
import { exportElementToPDF } from '../utils/exportUtils'

const RISKS = ['Alto', 'Médio', 'Baixo']

/**
 * Nível de confiança do dossiê, derivado de forma transparente do material que
 * ele reúne (pontos-chave e indicadores). É rotulado como ESTIMATIVA justamente
 * porque é derivado, não declarado pela fonte.
 */
function confidenceOf(dossier) {
  const evidence = (dossier.keyPoints?.length || 0) + (dossier.indicators?.length || 0)
  if (evidence >= 8) return { label: 'Alta', pct: 85, color: '#2e7d46' }
  if (evidence >= 6) return { label: 'Média', pct: 62, color: '#caa733' }
  return { label: 'Limitada', pct: 40, color: '#d4841a' }
}

// -----------------------------------------------------------------------------
// DOSSIÊS "EM FOCO"
//
// Um dossiê responde a uma pergunta que uma notícia isolada não responde:
// "o que está em jogo aqui, e o que isso significa para o Brasil?".
// -----------------------------------------------------------------------------
export default function Dossiers() {
  const { data, loading, error, refetch } = useResource(() => intelligenceService.dossiers(), [])

  const [query, setQuery] = useState('')
  const [risk, setRisk] = useState('')
  const [region, setRegion] = useState('')
  const [openId, setOpenId] = useState(null)

  const items = data?.items || []

  const regions = useMemo(
    () => [...new Set(items.map((d) => d.region))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [items]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((d) => {
      if (risk && d.risk !== risk) return false
      if (region && d.region !== region) return false
      if (needle && !`${d.title} ${d.summary} ${d.context} ${d.kicker}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [items, query, risk, region])

  const hasFilters = !!(query || risk || region)
  const clearFilters = () => { setQuery(''); setRisk(''); setRegion('') }

  // A navegação anterior/próximo respeita a LISTA FILTRADA — é a ordem que a
  // pessoa está percorrendo, não a ordem bruta do acervo.
  const currentIndex = filtered.findIndex((d) => d.id === openId)
  const active = currentIndex >= 0 ? filtered[currentIndex] : items.find((d) => d.id === openId)

  if (active) {
    return (
      <DossierDetail
        dossier={active}
        onBack={() => setOpenId(null)}
        onPrev={currentIndex > 0 ? () => setOpenId(filtered[currentIndex - 1].id) : null}
        onNext={currentIndex >= 0 && currentIndex < filtered.length - 1
          ? () => setOpenId(filtered[currentIndex + 1].id)
          : null}
        position={currentIndex >= 0 ? { current: currentIndex + 1, total: filtered.length } : null}
      />
    )
  }

  const highRisk = items.filter((d) => d.risk === 'Alto').length
  const lastUpdate = items.length
    ? items.map((d) => d.updated).sort().reverse()[0]
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title='Dossiês "Em Foco"'
        description="Análises aprofundadas que reúnem contexto, pontos-chave, indicadores e o impacto para o Brasil num só lugar."
        help="Um dossiê é montado quando um tema deixa de ser notícia isolada e passa a exigir acompanhamento contínuo."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Dossiês' }]}
        badges={<Badge type="demo" />}
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Layers} label="Dossiês publicados" value={String(items.length || '—')} hint="em acompanhamento contínuo" accent="brand" />
        <MetricCard icon={ShieldCheck} label="Risco alto" value={String(highRisk)} hint="prioridade de leitura" accent={highRisk ? 'red' : 'green'} />
        <MetricCard icon={MapPin} label="Regiões cobertas" value={String(regions.length)} hint="escopo geográfico" accent="amber" />
        <MetricCard icon={Activity} label="Atualização mais recente" value={lastUpdate ? formatDateBR(lastUpdate) : '—'} hint={lastUpdate ? timeAgo(lastUpdate) : ''} accent="green" />
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SearchBar placeholder="Buscar por tema, região ou contexto…" defaultValue={query} onChange={setQuery} />
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="input" aria-label="Filtrar por nível de risco">
            <option value="">Todos os níveis de risco</option>
            {RISKS.map((r) => <option key={r} value={r}>Risco {r}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="input" aria-label="Filtrar por região">
            <option value="">Todas as regiões</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <p className="flex items-center gap-1.5 text-sm muted">
              <Filter size={14} /> {filtered.length} de {items.length} dossiê(s)
            </p>
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          </div>
        )}
      </section>

      {/* GRADE */}
      <DataState
        loading={loading}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={3}
        emptyProps={{
          icon: Layers,
          tone: 'filter',
          title: hasFilters ? 'Nenhum dossiê corresponde aos filtros' : 'Nenhum dossiê publicado',
          hint: hasFilters ? 'Ajuste a busca, o risco ou a região.' : 'Os dossiês temáticos aparecerão aqui.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setOpenId(d.id)}
              className="card group overflow-hidden text-left transition-colors hover:border-gold-500/50"
            >
              <div className={`on-dark bg-gradient-to-br ${d.cover} p-5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-200">
                    {d.kicker}
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${DOSSIER_RISK[d.risk]}`}>
                    Risco {d.risk}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-extrabold tracking-tight text-white">{d.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-300">
                  <MapPin size={12} /> {d.region}
                </p>
              </div>
              <div className="p-5">
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{d.summary}</p>
                <div className="mt-3 flex items-center justify-between text-xs muted">
                  <span>Atualizado em {formatDateBR(d.updated)}</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-brand-500 group-hover:text-brand-400 dark:text-brand-400">
                    Abrir dossiê <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DataState>
    </div>
  )
}

// ── Detalhe do dossiê ────────────────────────────────────────────────────────
function DossierDetail({ dossier: d, onBack, onPrev, onNext, position }) {
  const contentRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const confidence = confidenceOf(d)

  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportElementToPDF(contentRef.current, `dossie-${d.id}.pdf`)
      toast.success('Dossiê exportado em PDF')
    } catch {
      toast.error('Não foi possível gerar o PDF deste dossiê.')
    } finally {
      setExporting(false)
    }
  }

  const copyLink = async () => {
    try {
      await clipboard(`${window.location.origin}${window.location.pathname}#/dossies`)
      toast.success('Link copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE AÇÕES */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
          <ArrowLeft size={16} /> Voltar aos dossiês
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
            <Link2 size={14} /> Copiar link
          </button>
          <Can do="reports.export">
            <button onClick={exportPdf} disabled={exporting} className="btn-ghost px-2.5 py-1.5 text-xs">
              <FileDown size={14} /> {exporting ? 'Gerando…' : 'Exportar PDF'}
            </button>
          </Can>
          <Can do="dossiers.edit">
            <button
              onClick={() => toast.success('Enviado para revisão — aparecerá na fila da Mesa de trabalho.')}
              className="btn-ghost px-2.5 py-1.5 text-xs"
            >
              <Send size={14} /> Enviar para revisão
            </button>
          </Can>

          {/* Navegação entre dossiês */}
          {(onPrev || onNext) && (
            <span className="ml-1 flex items-center gap-1 border-l border-gray-300 pl-2 dark:border-white/10">
              <button
                onClick={onPrev}
                disabled={!onPrev}
                className="rounded-lg p-1.5 text-gray-400 transition-colors enabled:hover:bg-gray-100 enabled:hover:text-gray-800 disabled:opacity-30 dark:enabled:hover:bg-white/10 dark:enabled:hover:text-gray-200"
                aria-label="Dossiê anterior"
              >
                <ArrowLeft size={16} />
              </button>
              {position && (
                <span className="font-mono text-xs tabular-nums muted">
                  {position.current}/{position.total}
                </span>
              )}
              <button
                onClick={onNext}
                disabled={!onNext}
                className="rounded-lg p-1.5 text-gray-400 transition-colors enabled:hover:bg-gray-100 enabled:hover:text-gray-800 disabled:opacity-30 dark:enabled:hover:bg-white/10 dark:enabled:hover:text-gray-200"
                aria-label="Próximo dossiê"
              >
                <ArrowRight size={16} />
              </button>
            </span>
          )}
        </div>
      </div>

      <div ref={contentRef} className="space-y-6">
        {/* CAPA */}
        <div className="card overflow-hidden">
          <div className={`on-dark bg-gradient-to-br ${d.cover} p-8 sm:p-10`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-200">{d.kicker}</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${DOSSIER_RISK[d.risk]}`}>Risco {d.risk}</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{d.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
              <MapPin size={14} /> {d.region} · atualizado em {formatDateBR(d.updated)}
            </p>
            <p className="mt-3 max-w-2xl text-gray-200">{d.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CONTEÚDO */}
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-5">
              <h2 className="mb-2 text-base font-bold tracking-tight">Contexto</h2>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{d.context}</p>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 text-base font-bold tracking-tight">Pontos-chave</h2>
              <ul className="space-y-2">
                {d.keyPoints.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-400" />
                    <span className="text-gray-700 dark:text-gray-300">{k}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card border-l-4 border-gold-500 p-5">
              <h2 className="mb-2 text-base font-bold tracking-tight">Impacto para o Brasil</h2>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{d.impactBR}</p>
            </section>
          </div>

          {/* LATERAL */}
          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                <Activity size={15} /> Indicadores
              </h2>
              <div className="space-y-3">
                {d.indicators.map((ind) => (
                  <div key={ind.name} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{ind.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold">{ind.value}</span>
                      <Badge type="alert" value={ind.status} />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Confiança da avaliação — derivada, e declarada como tal */}
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                <Gauge size={15} /> Nível de confiança
                <InfoTooltip text="Estimativa derivada do volume de pontos-chave e indicadores que sustentam este dossiê. Não é uma medida declarada pela fonte." />
              </h2>
              <p className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: confidence.color }}>
                {confidence.label}
              </p>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${confidence.pct}%`, background: confidence.color }} />
              </span>
              <p className="mt-2 text-[11px] muted">
                Estimativa — baseada em {d.keyPoints.length} pontos-chave e {d.indicators.length} indicadores.
              </p>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                <Tag size={15} /> Temas relacionados
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {d.related.map((r) => <Badge key={r} type="category" value={r} />)}
              </div>
            </section>
          </div>
        </div>
      </div>

      <p className="text-center text-xs muted">
        Conteúdo demonstrativo — síntese ilustrativa de fontes públicas.
      </p>
    </div>
  )
}
