import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Landmark, Building, FileText, Filter, X, Download, ChevronRight, ExternalLink,
  Gavel, TrendingUp, CircleDot, CircleDashed, CheckCircle2, Archive as ArchiveIcon,
  FilePlus, RefreshCw, Tags,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { LEG_STAGE } from '../data/legislative'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR } from '../utils/dateUtils'

// As etapas que a situação oficial permite distinguir, na ordem em que ocorrem.
const FLOW = ['apresentada', 'comissao', 'plenario', 'sancao', 'aprovado']

const STAGE_ICON = {
  pendente: CircleDashed,
  apresentada: FilePlus,
  comissao: CircleDot,
  plenario: Gavel,
  sancao: FileText,
  aprovado: CheckCircle2,
  arquivado: ArchiveIcon,
}

// Duas ordenações, as duas sobre dados que existem. Havia "Maior relevância",
// sobre um campo que nunca veio da API, e "Atualização mais recente", sobre
// outro que também não vinha: as duas deixavam a lista exatamente como estava.
const SORTS = [
  { id: 'recent', label: 'Mais recentes na Câmara' },
  { id: 'stage', label: 'Estágio mais avançado' },
]

// Ordem de avanço para ordenar: arquivada e não consultada vão para o fim.
const AVANCO = { aprovado: 5, sancao: 4, plenario: 3, comissao: 2, apresentada: 1, arquivado: 0, pendente: -1 }

/** "PL 1234/2026" → "2026", para quando a data de apresentação ainda não foi consultada. */
const anoDoCodigo = (code) => /\/(\d{4})\s*$/.exec(code || '')?.[1] || null

function quando(item) {
  if (item.presented_at) return `Apresentada em ${formatDateBR(item.presented_at)}`
  const ano = anoDoCodigo(item.code)
  return ano ? `De ${ano}` : null
}

// -----------------------------------------------------------------------------
// RADAR LEGISLATIVO
//
// Proposições da Câmara encontradas por palavra-chave e mantidas só quando a
// EMENTA tem um termo inequívoco de defesa (regra no servidor, em
// server/src/lib/proposicoes.js). Cada cartão mostra os termos que a colocaram
// aqui — o leitor vê o motivo, não um selo de "relevância" sem origem.
// -----------------------------------------------------------------------------
export default function Legislative() {
  const [todas, setTodas] = useState(false)
  const { data, loading, error, refetch, meta } = useResource(
    () => intelligenceService.legislative({ todas }),
    [todas],
    { keepPreviousData: true }
  )

  // `?q=` chega da busca global: o resultado abre o Radar já filtrado nele.
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => params.get('q') || '')
  const [house, setHouse] = useState('Todas')
  const [stage, setStage] = useState('')
  const [sort, setSort] = useState('recent')
  // Guarda o id, não o objeto: depois de consultar a Câmara, o detalhe aberto
  // passa a mostrar a situação nova assim que a lista recarrega.
  const [openId, setOpenId] = useState(null)

  // Memoizado porque esta lista entra nas dependências dos `useMemo` abaixo.
  const items = useMemo(() => data?.items || [], [data])
  const open = openId ? items.find((i) => i.id === openId) || null : null
  // As casas vêm do que foi coletado; a coleta hoje só consulta a Câmara.
  const casas = useMemo(() => [...new Set(items.map((i) => i.house).filter(Boolean))], [items])

  const contagemPorEstagio = useMemo(() => {
    const c = {}
    for (const i of items) c[i.stage] = (c[i.stage] || 0) + 1
    return c
  }, [items])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = items.filter((i) => {
      if (house !== 'Todas' && i.house !== house) return false
      if (stage && i.stage !== stage) return false
      if (needle) {
        const alvo = `${i.code} ${i.summary || ''} ${i.statusText || ''} ${i.keyword || ''} ${(i.termos || []).join(' ')}`
        if (!alvo.toLowerCase().includes(needle)) return false
      }
      return true
    })
    // O servidor já entrega da mais recente para a mais antiga, pelo número
    // de registro na Câmara.
    if (sort === 'recent') return list
    return [...list].sort((a, b) => (AVANCO[b.stage] ?? -1) - (AVANCO[a.stage] ?? -1))
  }, [items, query, house, stage, sort])

  const stats = useMemo(() => ({
    total: items.length,
    consultadas: items.filter((i) => i.stage !== 'pendente').length,
    advanced: items.filter((i) => ['plenario', 'sancao', 'aprovado'].includes(i.stage)).length,
    approved: items.filter((i) => i.stage === 'aprovado').length,
  }), [items])

  const hasFilters = !!(query || house !== 'Todas' || stage)
  const clearFilters = () => { setQuery(''); setHouse('Todas'); setStage('') }

  const exportItems = () => {
    exportCSV(
      filtered.map((i) => ({
        Identificador: i.code,
        Casa: i.house,
        Ementa: i.summary,
        'Situação na Câmara': i.statusText || 'não consultada',
        Estágio: LEG_STAGE[i.stage]?.label || i.stage,
        'Apresentada em': i.presented_at ? formatDateBR(i.presented_at) : '',
        'Termos de defesa na ementa': (i.termos || []).join('; '),
        'Palavra-chave da busca': i.keyword,
        Link: i.url,
      })),
      `radar-legislativo-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} proposição(ões) exportada(s) em CSV`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Radar Legislativo"
        description="Proposições da Câmara dos Deputados sobre defesa, Forças Armadas e segurança, com a situação oficial de tramitação."
        help={`As proposições vêm da API de Dados Abertos da Câmara, buscadas por ${data?.keywords?.length || 13} palavras-chave. A busca da Câmara casa a palavra em qualquer sentido — "inteligência" traz projetos de inteligência artificial — então só fica no Radar a proposição cuja ementa contém um termo inequívoco de defesa; os termos encontrados aparecem em cada cartão. O estágio é derivado do texto oficial de situação, consultado em lotes a cada coleta.`}
        breadcrumb={[{ label: 'Estratégico' }, { label: 'Radar Legislativo' }]}
        badges={<Badge type={meta?.source === 'live' ? 'live' : 'sem-dado'} />}
        actions={
          <Can do="reports.export">
            <button onClick={exportItems} className="btn-ghost text-sm" disabled={!filtered.length}>
              <Download size={15} /> Exportar CSV
            </button>
          </Can>
        }
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={FileText}
          label={todas ? 'Proposições coletadas' : 'Proposições no Radar'}
          value={data ? String(stats.total) : '—'}
          hint={data && !todas ? `de ${data.coletadas ?? stats.total} encontradas por palavra-chave` : 'todas as encontradas por palavra-chave'}
          accent="brand"
        />
        <MetricCard
          icon={CircleDashed}
          label="Situação consultada"
          value={data ? String(stats.consultadas) : '—'}
          hint={stats.total - stats.consultadas > 0 ? `${stats.total - stats.consultadas} aguardam a próxima coleta` : 'todas já consultadas'}
          accent="amber"
        />
        <MetricCard icon={TrendingUp} label="Em tramitação avançada" value={data ? String(stats.advanced) : '—'} hint="plenário, sanção ou norma" accent="red" />
        <MetricCard icon={CheckCircle2} label="Viraram norma" value={data ? String(stats.approved) : '—'} hint="transformadas em norma jurídica" accent="green" />
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <div className={`grid grid-cols-1 gap-3 ${casas.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <SearchBar placeholder="Buscar por número, ementa, situação ou termo…" defaultValue={query} onChange={setQuery} />
          {casas.length > 1 && (
            <select value={house} onChange={(e) => setHouse(e.target.value)} className="input" aria-label="Filtrar por casa legislativa">
              <option value="Todas">Todas as casas</option>
              {casas.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Ordenação">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
            <Filter size={13} /> Estágio de tramitação
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Só os estágios presentes, com a contagem — e o escolhido fica
                sempre visível, para que dê para desmarcá-lo. */}
            {Object.entries(LEG_STAGE)
              .filter(([id]) => contagemPorEstagio[id] || stage === id)
              .map(([id, info]) => {
                const Icon = STAGE_ICON[id] || CircleDot
                const ativo = stage === id
                return (
                  <button
                    key={id}
                    onClick={() => setStage(ativo ? '' : id)}
                    aria-pressed={ativo}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${info.classes} ${
                      ativo ? 'ring-2 ring-gold-500/60' : ''
                    }`}
                  >
                    <Icon size={12} /> {info.label}
                    <span className="tabular-nums opacity-70">{contagemPorEstagio[id] || 0}</span>
                    {ativo && <X size={11} aria-hidden="true" />}
                  </button>
                )
              })}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2 border-t border-gray-200 pt-3 text-sm dark:border-white/[0.06]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={todas}
            onChange={(e) => { setTodas(e.target.checked); setStage('') }}
          />
          <span>
            Mostrar também as que só casaram a palavra-chave
            {data?.foraDoDominio > 0 && <span className="muted"> ({data.foraDoDominio} fora do domínio)</span>}
            <span className="block text-xs muted">Para conferir o que o filtro de defesa deixou de fora.</span>
          </span>
        </label>

        {hasFilters && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <p className="text-sm muted">{filtered.length} de {items.length} proposição(ões)</p>
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          </div>
        )}
      </section>

      {/* LISTA */}
      <DataState
        loading={loading && !data}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={3}
        emptyProps={{
          icon: Landmark,
          tone: 'filter',
          title: hasFilters ? 'Nenhuma proposição corresponde aos filtros' : 'Nenhuma proposição no Radar',
          hint: hasFilters
            ? 'Ajuste a busca, a casa ou o estágio de tramitação.'
            : 'A coleta da Câmara ainda não trouxe proposições com termo de defesa na ementa.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
          {filtered.map((item) => (
            <ProposalCard key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
          ))}
        </div>
      </DataState>

      <p className="text-center text-xs muted">
        Proposições da API de Dados Abertos da Câmara dos Deputados. O estágio é derivado do texto oficial
        de situação; confira sempre no portal da Câmara antes de citar.
      </p>

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.code} maxWidth="max-w-2xl">
        {open && <ProposalDetail item={open} onAtualizado={refetch} />}
      </Modal>
    </div>
  )
}

// ── Cartão de proposição ─────────────────────────────────────────────────────
function ProposalCard({ item, onOpen }) {
  const stage = LEG_STAGE[item.stage] || LEG_STAGE.pendente
  const Icon = STAGE_ICON[item.stage] || CircleDot
  const temBarra = FLOW.includes(item.stage)

  return (
    <button onClick={onOpen} className="card w-full p-5 text-left transition-colors hover:border-gold-500/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-gold-600 dark:text-gold-400">{item.code}</span>
        <span className="inline-flex items-center gap-1 text-[11px] muted">
          <Building size={11} /> {item.house}
        </span>
        {item.relevante === false && (
          <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-300">
            Fora do domínio
          </span>
        )}
        {quando(item) && <span className="ml-auto text-[11px] muted">{quando(item)}</span>}
      </div>

      <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-gray-800 dark:text-gray-200">
        {item.summary || 'Ementa não informada pela Câmara.'}
      </p>

      {item.termos?.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] muted">
          <Tags size={11} aria-hidden="true" />
          {item.termos.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
          {item.termos.length > 4 && <span>+{item.termos.length - 4}</span>}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.classes}`}>
            <Icon size={11} /> {stage.label}
          </span>
          {temBarra && <span className="font-mono text-xs font-bold tabular-nums muted">{stage.pct}%</span>}
        </div>
        {temBarra && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <span className="block h-full rounded-full bg-gold-500 transition-all" style={{ width: `${stage.pct}%` }} />
          </span>
        )}
      </div>

      <p className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-500 dark:text-brand-400">
        Ver situação e tramitação <ChevronRight size={13} />
      </p>
    </button>
  )
}

// ── Detalhe com linha do tempo das etapas ────────────────────────────────────
function ProposalDetail({ item, onAtualizado }) {
  const stage = LEG_STAGE[item.stage] || LEG_STAGE.pendente
  const currentIndex = FLOW.indexOf(item.stage)
  const [consultando, setConsultando] = useState(false)

  const consultar = async () => {
    setConsultando(true)
    try {
      const { data } = await intelligenceService.atualizarTramitacao(item.id)
      if (data?.ok) toast.success(data.mensagem || 'Tramitação atualizada.')
      else toast.error(data?.mensagem || 'A Câmara não retornou a situação.')
      await onAtualizado()
    } catch (err) {
      toast.error(err?.message || 'Não foi possível consultar a Câmara.')
    } finally {
      setConsultando(false)
    }
  }

  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stage.classes}`}>{stage.label}</span>
        <span className="chip">{item.house}</span>
        {quando(item) && <span className="chip">{quando(item)}</span>}
        {item.relevante === false && <span className="chip">Fora do domínio</span>}
      </div>

      <div>
        <h3 className="text-sm font-bold tracking-tight">Ementa</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {item.summary || 'Ementa não informada pela Câmara.'}
        </p>
      </div>

      <section className="rounded-xl border-l-4 border-gold-500 bg-gray-500/5 p-4 dark:bg-white/5">
        <h4 className="text-sm font-bold tracking-tight">Por que está no Radar</h4>
        {item.termos?.length > 0 ? (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            A ementa contém {item.termos.length === 1 ? 'o termo' : 'os termos'}{' '}
            {item.termos.map((t, i) => (
              <span key={t}>{i > 0 && (i === item.termos.length - 1 ? ' e ' : ', ')}<strong>{t}</strong></span>
            ))}.
          </p>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Nenhum termo de defesa na ementa: veio só porque a busca da Câmara casou a palavra-chave.
          </p>
        )}
        {item.keyword && (
          <p className="mt-1 text-xs muted">Encontrada pela busca por “{item.keyword}”.</p>
        )}
      </section>

      <section>
        <h4 className="text-sm font-bold tracking-tight">Tramitação</h4>
        {item.statusText && (
          <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
            Situação na Câmara: <strong>{item.statusText}</strong>
            {item.status_at && <span className="muted"> · consultada em {formatDateBR(item.status_at)}</span>}
          </p>
        )}

        {item.stage === 'pendente' && (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-gray-500/5 p-3 text-sm muted dark:bg-white/5">
            <CircleDashed size={15} className="mt-0.5 shrink-0" />
            A situação desta proposição ainda não foi consultada. A Câmara exige uma consulta por proposição,
            e o servidor as faz em lotes a cada coleta.
          </p>
        )}

        {item.stage === 'arquivado' && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-gray-500/5 p-3 text-sm muted dark:bg-white/5">
            <ArchiveIcon size={15} /> Proposição arquivada, retirada ou prejudicada.
          </p>
        )}

        {currentIndex >= 0 && (
          <ol className="mt-3 space-y-0">
            {FLOW.map((step, i) => {
              const info = LEG_STAGE[step]
              const Icon = STAGE_ICON[step] || CircleDot
              const done = i < currentIndex
              const current = i === currentIndex
              const last = i === FLOW.length - 1
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-military-green/20 text-emerald-800 dark:text-emerald-400'
                          : current ? 'bg-gold-500 text-military-darker'
                            : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                      }`}
                    >
                      <Icon size={14} />
                    </span>
                    {!last && (
                      <span
                        className={`w-0.5 flex-1 ${done ? 'bg-military-green/40' : 'bg-gray-200 dark:bg-white/10'}`}
                        style={{ minHeight: 22 }}
                      />
                    )}
                  </div>
                  <div className={`pb-4 ${current ? '' : 'opacity-70'}`}>
                    <p className="text-sm font-semibold leading-tight">{info.label}</p>
                    {current && <p className="mt-0.5 text-xs text-gold-600 dark:text-gold-400">etapa atual</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-white/[0.06]">
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            <ExternalLink size={14} /> Abrir no portal da Câmara
          </a>
        )}
        <Can do="collection.monitor">
          <button onClick={consultar} disabled={consultando} className="btn-ghost text-sm">
            <RefreshCw size={14} className={consultando ? 'animate-spin' : ''} />
            {consultando ? 'Consultando a Câmara…' : 'Consultar situação agora'}
          </button>
        </Can>
      </div>
    </div>
  )
}
