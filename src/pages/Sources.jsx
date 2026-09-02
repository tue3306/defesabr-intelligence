import { useState } from 'react'
import {
  Rss, RefreshCw, Loader2, ExternalLink, AlertTriangle, CheckCircle2,
  Download, XCircle, Power, PowerOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import { useResource } from '../hooks/useResource'
import { fontes as apiFontes, sistema } from '../services'
import { exportCSV } from '../utils/exportUtils'
import { timeAgo, formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// FONTES
//
// De onde vem cada notícia, e o que cada fonte respondeu na última tentativa.
//
// A confiabilidade aqui não é um juízo editorial sobre a qualidade do
// jornalismo — é uma medida OPERACIONAL: quantas vezes a fonte respondeu
// quando o coletor a procurou. Chamá-la de "confiabilidade da fonte" sem essa
// distinção seria confundir disponibilidade técnica com credibilidade.
// -----------------------------------------------------------------------------
export default function Sources() {
  const { data, loading, error, refetch } = useResource(() => apiFontes.listar(), [])
  const [ocupado, setOcupado] = useState(null)

  const itens = data?.items || []
  const totalArtigos = itens.reduce((a, f) => a + (f.articles || 0), 0)
  const totalRelevantes = itens.reduce((a, f) => a + (f.relevantArticles || 0), 0)

  const testar = async (f) => {
    setOcupado(f.id)
    try {
      const { data: r } = await sistema.coletarFonte(f.id)
      if (r.ok) {
        toast.success(r.novos
          ? `${f.name}: ${r.novos} novo(s), ${r.relevantes} relevante(s)`
          : `${f.name}: respondeu com ${r.encontrados} item(ns), nenhum inédito`)
      } else {
        toast.error(`${f.name}: ${r.erro}`)
      }
      refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível coletar.')
    } finally {
      setOcupado(null)
    }
  }

  const alternar = async (f) => {
    setOcupado(f.id)
    try {
      await apiFontes.alternar(f.id, !f.enabled)
      toast.success(`${f.name} ${f.enabled ? 'desativada' : 'ativada'}`)
      refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível alterar.')
    } finally {
      setOcupado(null)
    }
  }

  const exportar = () => {
    exportCSV(
      itens.map((f) => ({
        Fonte: f.name,
        Categoria: f.category || f.kind,
        URL: f.url,
        Habilitada: f.enabled ? 'sim' : 'não',
        'Situação': f.lastStatus || 'nunca coletada',
        Erro: f.lastError || '',
        'Última coleta': f.lastFetchAt ? formatDateTimeBR(f.lastFetchAt) : '',
        'Execuções': f.totalRuns,
        Falhas: f.totalFailures,
        'Disponibilidade (%)': f.reliability ?? '',
        Artigos: f.articles,
        Relevantes: f.relevantArticles,
      })),
      `fontes-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${itens.length} fonte(s) exportada(s)`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Rss}
        title="Fontes"
        description="De onde vem cada notícia, e o que cada fonte respondeu na última tentativa."
        help="A disponibilidade mede quantas vezes a fonte respondeu quando o coletor a procurou — é uma medida técnica, não um juízo sobre a qualidade do jornalismo."
        breadcrumb={[{ label: 'Coleta' }, { label: 'Fontes' }]}
        actions={
          <button onClick={exportar} disabled={!itens.length} className="btn-ghost text-sm">
            <Download size={15} /> CSV
          </button>
        }
      />

      <DataState loading={loading} error={error} onRetry={refetch} skeletonCount={4}>
        {itens.length === 0 ? (
          <EmptyState icon={Rss} title="Nenhuma fonte cadastrada" hint="As fontes são cadastradas na primeira subida do servidor." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={Rss} label="Fontes" value={String(itens.length)} hint={`${itens.filter((f) => f.enabled).length} habilitada(s)`} accent="brand" />
              <MetricCard
                icon={data.comErro ? AlertTriangle : CheckCircle2}
                label="Com erro"
                value={String(data.comErro)}
                hint={data.comErro ? 'na última tentativa' : 'todas responderam'}
                accent={data.comErro ? 'red' : 'green'}
              />
              <MetricCard icon={Download} label="Artigos coletados" value={String(totalArtigos)} hint="somando todas as fontes" accent="brand" />
              <MetricCard
                icon={CheckCircle2}
                label="Aprovados pelo filtro"
                value={String(totalRelevantes)}
                hint={totalArtigos ? `${Math.round((totalRelevantes / totalArtigos) * 100)}% do coletado` : '—'}
                accent="green"
              />
            </div>

            <div className="space-y-3">
              {itens.map((f) => {
                const quebrada = f.lastStatus === 'erro'
                return (
                  <article key={f.id} className={`card p-4 ${f.enabled ? '' : 'opacity-70'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        quebrada ? 'bg-red-500' : f.lastStatus ? 'bg-emerald-500' : 'bg-gray-400'
                      }`} />
                      <h2 className="text-sm font-bold tracking-tight">{f.name}</h2>
                      {f.category && <span className="chip text-[10px]">{f.category}</span>}
                      {!f.enabled && (
                        <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold muted">desativada</span>
                      )}
                      {f.reliability !== null && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          f.reliability >= 90 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : f.reliability >= 60 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-red-500/15 text-red-700 dark:text-red-300'
                        }`}>
                          {f.reliability}% disponível
                        </span>
                      )}
                    </div>

                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all font-mono text-[11px] text-brand-500 hover:underline dark:text-brand-400"
                    >
                      {f.url}
                    </a>

                    {f.lastError && (
                      <p className="mt-2 rounded-lg bg-red-500/10 p-2 font-mono text-[11px] text-red-700 dark:text-red-300">
                        {f.lastError}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-200 pt-2.5 text-[11px] muted dark:border-white/[0.06]">
                      <span>{f.articles} artigo(s) · {f.relevantArticles} relevante(s)</span>
                      <span>· {f.totalRuns} execução(ões), {f.totalFailures} falha(s)</span>
                      <span>· {f.lastFetchAt ? timeAgo(f.lastFetchAt) : 'nunca coletada'}</span>
                      {f.lastDurationMs != null && <span>· {f.lastDurationMs}ms</span>}

                      <span className="ml-auto flex flex-wrap gap-2">
                        <button
                          onClick={() => testar(f)}
                          disabled={ocupado === f.id || !f.enabled}
                          className="btn-ghost px-2.5 py-1 text-xs"
                          title={f.enabled ? 'Coletar só esta fonte' : 'Fonte desativada'}
                        >
                          {ocupado === f.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Testar
                        </button>
                        <button onClick={() => alternar(f)} disabled={ocupado === f.id} className="btn-ghost px-2.5 py-1 text-xs">
                          {f.enabled ? <PowerOff size={12} /> : <Power size={12} />}
                          {f.enabled ? 'Desativar' : 'Ativar'}
                        </button>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Fontes que recusaram — documentadas para não serem recadastradas. */}
            {(data.recusadas || []).length > 0 && (
              <section className="card p-5">
                <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                  <XCircle size={17} className="text-red-500" /> Fontes que recusam cliente automatizado
                </h2>
                <p className="mb-3 text-sm leading-relaxed muted">
                  Foram testadas e ficaram de fora. Estão listadas para que ninguém as recadastre
                  achando que foram esquecimento — cadastrá-las encheria o painel de status de erro
                  permanente que ninguém pode consertar, e erro que não se conserta vira erro que se ignora.
                </p>
                <ul className="space-y-1.5">
                  {data.recusadas.map((r) => (
                    <li key={r.name} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      <span>
                        <strong className="font-semibold">{r.name}</strong>
                        <span className="muted"> — {r.motivo}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </DataState>
    </div>
  )
}
