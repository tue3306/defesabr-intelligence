import { useState, useMemo } from 'react'
import {
  Newspaper, RefreshCw, Loader2, Filter, X, ShieldCheck, Database,
  ChevronDown, AlertTriangle, FlaskConical,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import NewsCard from '../components/ui/NewsCard'
import TagFilter from '../components/ui/TagFilter'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { noticias, favoritos, sistema } from '../services'
import { CATEGORIAS, URGENCIAS, META_URGENCIA, META_ALERTA, corDaCategoria } from '../data/reference'

const PERIODOS = [
  { id: 1, rotulo: '24h' },
  { id: 3, rotulo: '3 dias' },
  { id: 7, rotulo: '7 dias' },
  { id: 30, rotulo: '30 dias' },
  { id: 90, rotulo: '90 dias' },
]

// -----------------------------------------------------------------------------
// CLIPPING DIÁRIO
//
// Mostra o que a coleta REALMENTE trouxe no período. Duas honestidades que a
// tela precisa carregar:
//
//  • O nível de alerta é CALCULADO da distribuição de urgências, e a própria
//    tela explica a base. Sem ocorrências não há nível — e dizemos isso, em
//    vez de exibir um "NORMAL" que não significaria nada.
//
//  • As fontes de defesa não publicam todo dia. Janela vazia é resultado
//    legítimo; o servidor diz onde HÁ conteúdo e a tela oferece ir até lá.
// -----------------------------------------------------------------------------
export default function DailyClipping() {
  const [dias, setDias] = useState(7)
  const [cats, setCats] = useState([])
  const [urgencia, setUrgencia] = useState('')
  const [coletando, setColetando] = useState(false)

  const clipping = useResource(() => noticias.clipping({ days: dias, limit: 60 }), [dias], { keepPreviousData: true })
  const salvos = useResource(() => favoritos.listar(), [])

  const d = clipping.data
  const lista = d?.news || []
  const alerta = d?.alert
  const sugestao = d?.suggestedWindow

  const idsSalvos = useMemo(
    () => new Set((salvos.data?.items || []).map((f) => f.id)),
    [salvos.data]
  )

  const filtradas = useMemo(() => lista.filter((n) => {
    if (cats.length && !cats.includes(n.category)) return false
    if (urgencia && n.urgency !== urgencia) return false
    return true
  }), [lista, cats, urgencia])

  const temFiltro = cats.length > 0 || !!urgencia
  const limpar = () => { setCats([]); setUrgencia('') }

  const coletar = async () => {
    setColetando(true)
    const aviso = toast.loading('Coletando das fontes públicas…')
    try {
      const { data: r } = await sistema.coletar()
      toast.success(
        r.noticias?.novos
          ? `${r.noticias.novos} notícia(s) nova(s), ${r.noticias.relevantes} relevante(s)`
          : 'Coleta concluída — nada novo nas fontes',
        { id: aviso }
      )
      clipping.refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Falha na coleta.', { id: aviso })
    } finally {
      setColetando(false)
    }
  }

  const alternarSalvo = async (n) => {
    try {
      if (idsSalvos.has(n.id)) {
        await favoritos.remover(n.id)
        toast.success('Removido dos favoritos')
      } else {
        await favoritos.salvar(n.id)
        toast.success('Salvo nos favoritos')
      }
      salvos.refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível salvar.')
    }
  }

  const rotuloAlerta = alerta?.level ? (META_ALERTA[alerta.level]?.rotulo || alerta.level) : null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Newspaper}
        title="Clipping"
        description="As ocorrências que a coleta trouxe das fontes públicas, filtradas por relevância para defesa e segurança."
        help="A coleta roda no servidor. Categoria e urgência são derivadas por regra de palavra-chave, e cada item mostra quais termos casaram."
        breadcrumb={[{ label: 'Coleta' }, { label: 'Clipping' }]}
        meta={d ? [
          { label: 'Período', value: `${d.periodDays}d` },
          { label: 'Ocorrências', value: String(lista.length) },
        ] : []}
        actions={
          <button onClick={coletar} disabled={coletando} className="btn-primary text-sm">
            {coletando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Coletar agora
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDias(p.id)}
              aria-pressed={dias === p.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                dias === p.id
                  ? 'bg-gold-500 text-military-darker'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </PageHeader>

      <DataState loading={clipping.loading && !d} error={clipping.error} onRetry={clipping.refetch} skeletonCount={4}>
        {/* NÍVEL DE ALERTA */}
        <section className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                <ShieldCheck size={15} /> Nível de alerta do período
                <InfoTooltip text="Média ponderada das urgências das ocorrências do período: Crítico=100, Alto=70, Médio=40, Baixo=15." />
              </h2>
              {rotuloAlerta ? (
                <>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight"
                    style={{ color: META_ALERTA[alerta.level]?.cor }}>
                    {rotuloAlerta}
                    <span className="ml-2 font-mono text-lg muted">{alerta.score}/100</span>
                  </p>
                  <p className="mt-1 text-xs muted">{alerta.basis}</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold tracking-tight muted">Sem ocorrências</p>
                  <p className="mt-1 text-xs muted">
                    {alerta?.basis || 'Nenhuma ocorrência relevante neste período.'}
                  </p>
                </>
              )}
            </div>

            {rotuloAlerta && (
              <div className="w-full sm:w-56">
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div className="h-full rounded-full"
                    style={{ width: `${alerta.score}%`, background: META_ALERTA[alerta.level]?.cor }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide muted">
                  <span>Normal</span><span>Crítico</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RESUMO EXECUTIVO — deliberadamente ausente */}
        <section className="card border-l-4 border-brand-400 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <AlertTriangle size={15} className="text-brand-400" /> Resumo executivo
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed muted">
            {d?.summaryNote || 'Não gerado nesta versão.'}
          </p>
          <p className="mt-2 text-xs leading-relaxed muted">
            Um resumo escrito por máquina, sem revisão, seria apresentado como análise sem sê-lo.
            Enquanto não houver modelo de linguagem nem analista, o campo fica explicitamente vazio.
          </p>
        </section>

        {/* DISTRIBUIÇÃO */}
        {Object.keys(d?.byCategory || {}).length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.entries(d.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([cat, n]) => (
                <MetricCard key={cat} label={cat} value={String(n)} hint="no período" accent="brand" />
              ))}
          </div>
        )}

        {/* FILTROS */}
        {lista.length > 0 && (
          <section className="card space-y-4 p-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
                <Filter size={13} /> Categorias
              </p>
              <TagFilter options={CATEGORIAS} selected={cats} onToggle={(c) => setCats((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))} getColor={corDaCategoria} />
            </div>
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
              <span className="ml-auto text-sm muted">{filtradas.length} de {lista.length}</span>
              {temFiltro && (
                <button onClick={limpar} className="btn-ghost px-2.5 py-1 text-xs"><X size={13} /> Limpar</button>
              )}
            </div>
          </section>
        )}

        {/* LISTA */}
        {lista.length === 0 ? (
          <EmptyState
            icon={Database}
            title={`Nenhuma ocorrência relevante ${dias === 1 ? 'nas últimas 24 horas' : `nos últimos ${dias} dias`}`}
            hint={sugestao
              ? `As fontes de defesa não publicam todos os dias — silêncio no período é resultado, não falha. Há ${sugestao.count} ocorrência(s) em ${sugestao.days} dias.`
              : d?.relevantTotal > 0
                ? `O acervo tem ${d.relevantTotal} ocorrência(s) relevante(s), nenhuma neste período.`
                : 'Dispare uma coleta para trazer o que as fontes publicaram.'}
            action={sugestao
              ? { label: `Ver os últimos ${sugestao.days} dias`, onClick: () => setDias(sugestao.days), icon: Filter }
              : { label: 'Coletar agora', onClick: coletar, icon: RefreshCw }}
          />
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={Filter}
            tone="filter"
            title="Nenhuma ocorrência corresponde aos filtros"
            hint="Ajuste a categoria ou a urgência."
            action={{ label: 'Limpar filtros', onClick: limpar, icon: X }}
          />
        ) : (
          <div className="space-y-3">
            {filtradas.map((n) => (
              <NewsCard key={n.id} noticia={n} salvo={idsSalvos.has(n.id)} onAlternarSalvo={alternarSalvo} />
            ))}
          </div>
        )}

        <PainelDoMetodo metodo={d?.method} coletados={d?.totalCollected} exibidos={lista.length} />
      </DataState>
    </div>
  )
}

// -----------------------------------------------------------------------------
// COMO O FILTRO DECIDE
//
// Um clipping filtra — logo, deixa coisas de fora. Não declarar o critério
// tornaria essa escolha indistinguível de uma decisão editorial não assumida:
// quem lê não teria como saber se uma notícia ausente foi filtrada por regra
// ou por conveniência.
// -----------------------------------------------------------------------------
function PainelDoMetodo({ metodo, coletados, exibidos }) {
  const [aberto, setAberto] = useState(false)
  if (!metodo) return null

  return (
    <section className="card p-5">
      <button onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex w-full items-center gap-2 text-left">
        <FlaskConical size={16} className="shrink-0 text-gold-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-tight">Como o filtro decide</span>
          <span className="mt-0.5 block text-xs muted">
            {coletados != null
              ? `${coletados} item(ns) coletados · ${exibidos} passaram no filtro neste período`
              : metodo.regra}
          </span>
        </span>
        <ChevronDown size={15} className={`shrink-0 muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-white/10">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{metodo.descricao}</p>
          <ol className="space-y-2.5">
            {(metodo.etapas || []).map((e, i) => (
              <li key={e.titulo} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-[11px] font-bold text-brand-600 dark:text-brand-300">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{e.titulo}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed muted">{e.texto}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="rounded-lg bg-white/5 p-3 text-xs leading-relaxed muted">
            O filtro erra nos dois sentidos. Cada cartão tem um "por que está aqui?" que mostra os
            termos que casaram naquele item — a regra é verificável caso a caso, não só declarada.
          </p>
        </div>
      )}
    </section>
  )
}
