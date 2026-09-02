import { useState } from 'react'
import {
  Landmark, ExternalLink, RefreshCw, Loader2, Filter, X, Download, Database, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import SearchBar from '../components/ui/SearchBar'
import { useResource } from '../hooks/useResource'
import { legislativo } from '../services'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR, timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// RADAR LEGISLATIVO
//
// Proposições REAIS dos Dados Abertos da Câmara: número, ementa, data e link
// para a tramitação oficial.
//
// O que esta tela NÃO faz: dizer o que cada proposição significa para a
// defesa. Isso é análise, exige julgamento, e nenhuma API o fornece. A palavra
// que trouxe a proposição para o acervo é mostrada como pista de por que ela
// está aqui — mas pista não é análise, e a tela não finge que é.
// -----------------------------------------------------------------------------
export default function Legislative() {
  const [consulta, setConsulta] = useState('')
  const [palavra, setPalavra] = useState('')
  const [atualizando, setAtualizando] = useState(null)

  const { data, loading, error, refetch } = useResource(
    () => legislativo.listar({ q: consulta || undefined, keyword: palavra || undefined }),
    [consulta, palavra],
    { keepPreviousData: true }
  )

  const itens = data?.items || []
  const temFiltro = !!(consulta || palavra)

  const atualizarTramitacao = async (b) => {
    setAtualizando(b.id)
    try {
      const { data: r } = await legislativo.atualizarTramitacao(b.id)
      toast[r.ok ? 'success' : 'error'](r.mensagem)
      refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível consultar a Câmara.')
    } finally {
      setAtualizando(null)
    }
  }

  const exportar = () => {
    exportCSV(
      itens.map((b) => ({
        Identificador: b.code,
        Casa: b.house,
        Ementa: b.summary || '',
        Apresentada: b.presentedAt ? formatDateBR(b.presentedAt) : '',
        'Situação': b.statusText || 'não consultada',
        'Palavra que a trouxe': b.keyword || '',
        Link: b.url || '',
      })),
      `legislativo-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${itens.length} proposição(ões) exportada(s)`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Radar Legislativo"
        description="Proposições em tramitação na Câmara que tocam defesa, segurança, fronteiras e soberania."
        help="Vêm dos Dados Abertos da Câmara, buscadas por 13 palavras-chave do domínio e deduplicadas por identificador."
        breadcrumb={[{ label: 'Dados públicos' }, { label: 'Legislativo' }]}
        meta={data ? [
          { label: 'Fonte', value: data.provider },
          { label: 'Coletado', value: data.lastFetchAt ? timeAgo(data.lastFetchAt) : '—' },
        ] : []}
        actions={
          <button onClick={exportar} disabled={!itens.length} className="btn-ghost text-sm">
            <Download size={15} /> CSV
          </button>
        }
      />

      <DataState loading={loading && !data} error={error} onRetry={refetch} skeletonCount={4}>
        {itens.length === 0 && !temFiltro ? (
          <EmptyState
            icon={Database}
            title="Nenhuma proposição coletada"
            hint="A coleta consulta os Dados Abertos da Câmara por palavras-chave de defesa. Dispare uma coleta no painel de status."
            action={{ label: 'Ir para o Status', to: '/status' }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={Landmark} label="Proposições" value={String(data.total)} hint="acompanhadas" accent="brand" />
              <MetricCard
                icon={Info}
                label="Com tramitação"
                value={String(data.total - data.semSituacao)}
                hint={`${data.semSituacao} ainda não consultadas`}
                accent={data.semSituacao > data.total / 2 ? 'amber' : 'green'}
              />
              <MetricCard icon={Filter} label="Palavras-chave" value={String(data.keywords?.length ?? 0)} hint="usadas na busca" accent="brand" />
              <MetricCard icon={RefreshCw} label="Última coleta" value={data.lastFetchAt ? timeAgo(data.lastFetchAt) : '—'} hint={data.provider} accent="brand" />
            </div>

            {/* A ressalva sobre a tramitação: ela chega em lote, não de uma vez. */}
            {data.semSituacao > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed">
                <Info size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
                <span className="text-gray-700 dark:text-gray-300">
                  {data.semSituacao} proposição(ões) ainda sem situação de tramitação. Consultá-la exige
                  uma requisição por proposição, então o servidor a preenche em lotes pequenos a cada
                  coleta — ou você pode pedir uma agora, item a item.
                </span>
              </p>
            )}

            <section className="card space-y-3 p-5">
              <SearchBar placeholder="Buscar por número ou ementa…" defaultValue={consulta} onChange={setConsulta} />
              <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-white/10">
                <span className="text-xs font-semibold uppercase muted">Trazida por</span>
                {(data.keywords || []).map((k) => (
                  <button
                    key={k}
                    onClick={() => setPalavra(palavra === k ? '' : k)}
                    aria-pressed={palavra === k}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      palavra === k ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'muted hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {k}
                  </button>
                ))}
                {temFiltro && (
                  <button onClick={() => { setConsulta(''); setPalavra('') }} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
                    <X size={13} /> Limpar
                  </button>
                )}
              </div>
            </section>

            {itens.length === 0 ? (
              <EmptyState
                icon={Landmark}
                tone="filter"
                title="Nenhuma proposição corresponde aos filtros"
                hint="Ajuste a busca ou a palavra-chave."
                action={{ label: 'Limpar filtros', onClick: () => { setConsulta(''); setPalavra('') }, icon: X }}
              />
            ) : (
              <div className="space-y-3">
                {itens.map((b) => (
                  <article key={b.id} className="card p-5 transition-colors hover:border-gold-500/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gold-600 dark:text-gold-400">{b.code}</span>
                      <span className="chip text-[10px]">{b.house}</span>
                      {b.statusText ? (
                        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-300">
                          {b.statusText}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-semibold muted">
                          tramitação não consultada
                        </span>
                      )}
                      {b.presentedAt && (
                        <span className="ml-auto text-[11px] muted">
                          apresentada em {formatDateBR(b.presentedAt)}
                        </span>
                      )}
                    </div>

                    {b.summary && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{b.summary}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-200 pt-2.5 text-[11px] dark:border-white/[0.06]">
                      {b.keyword && <span className="muted">trazida pela busca por "{b.keyword}"</span>}
                      {b.url && (
                        <a href={b.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-brand-500 hover:underline dark:text-brand-400">
                          Ver na Câmara <ExternalLink size={10} />
                        </a>
                      )}
                      <button
                        onClick={() => atualizarTramitacao(b)}
                        disabled={atualizando === b.id}
                        className="btn-ghost ml-auto px-2.5 py-1 text-xs"
                      >
                        {atualizando === b.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Consultar tramitação
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </DataState>

      <p className="text-center text-xs leading-relaxed muted">
        Identificação, ementa e tramitação vêm dos Dados Abertos da Câmara dos Deputados.
        Esta plataforma <strong>não interpreta</strong> o impacto de cada proposição — isso é análise,
        e exige julgamento humano.
      </p>
    </div>
  )
}
