import { useState, useMemo } from 'react'
import { Map as MapIcon, Info, AlertTriangle, ExternalLink, Database, X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services'
import { META_URGENCIA } from '../data/reference'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// MAPA DE COBERTURA
//
// A QUE LUGARES do Brasil o acervo se refere — contando menções às unidades da
// federação no texto das notícias coletadas.
//
// O que este mapa MEDE: cobertura jornalística.
// O que ele NÃO mede: atividade, risco ou tensão.
//
// Essa distinção é o ponto inteiro. Um mapa de calor sem ela vira um mapa de
// perigo na cabeça de quem olha — e a plataforma passaria a afirmar, sem dizer,
// que onde há mais notícia há mais ameaça. A tela repete a ressalva onde ela
// não pode ser ignorada: junto do próprio mapa.
//
// O desenho é um CARTOGRAMA — cada estado ocupa um quadrado igual, na posição
// geográfica aproximada. Num mapa de área real, o Amazonas dominaria o campo
// visual e São Paulo quase sumiria, ainda que tivessem a mesma contagem: a
// área do estado distorceria a leitura do dado.
// -----------------------------------------------------------------------------

const LADO = 46
const ESPACO = 5

/** Escala de cor por intensidade relativa. Zero é neutro, não "frio". */
function corDaContagem(total, maximo) {
  if (!total) return { fundo: 'rgba(148,163,184,0.10)', texto: '#94a3b8', borda: 'rgba(148,163,184,0.2)' }
  const t = maximo > 0 ? total / maximo : 0
  // Verde → ouro → vermelho. Passa por ouro porque é a cor de acento do
  // produto, e porque um degradê verde-vermelho puro é ilegível para daltonismo
  // do tipo mais comum.
  const cor = t > 0.66 ? '#c0392b' : t > 0.33 ? '#caa733' : '#2e7d46'
  const alfa = 0.25 + t * 0.55
  return {
    fundo: `${cor}${Math.round(alfa * 255).toString(16).padStart(2, '0')}`,
    texto: '#f1f5f9',
    borda: cor,
  }
}

export default function CoverageMap() {
  const [dias, setDias] = useState(90)
  const [selecionado, setSelecionado] = useState(null)

  const { data, loading, error, refetch } = useResource(
    () => request('GET /news/geo', { params: { days: dias } }),
    [dias],
    { keepPreviousData: true }
  )

  const ufs = data?.ufs || []
  const maximo = data?.maximo || 0
  const comMencao = ufs.filter((u) => u.total > 0)
  const detalhe = selecionado ? ufs.find((u) => u.uf === selecionado) : null

  const grade = useMemo(() => {
    const linhas = Math.max(...ufs.map((u) => u.linha), 0) + 1
    const colunas = Math.max(...ufs.map((u) => u.coluna), 0) + 1
    return { linhas, colunas, largura: colunas * (LADO + ESPACO), altura: linhas * (LADO + ESPACO) }
  }, [ufs])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MapIcon}
        title="Mapa de cobertura"
        description="A que lugares do Brasil as notícias coletadas se referem."
        help="Contagem de menções a unidades da federação no texto. Mede cobertura jornalística — não atividade nem risco."
        breadcrumb={[{ label: 'Dados públicos' }, { label: 'Mapa' }]}
      >
        <div className="flex flex-wrap gap-2">
          {[30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                dias === d
                  ? 'bg-gold-500 text-military-darker'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              {d === 365 ? '1 ano' : `${d} dias`}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* A ressalva vem ANTES do mapa, não depois: lida em segundo lugar, ela
          não impede a leitura errada que o desenho já terá induzido. */}
      <p className="flex items-start gap-2 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm leading-relaxed">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-gray-800 dark:text-gray-200">
          <strong>Este mapa mede cobertura jornalística, não risco.</strong> Uma notícia de orçamento
          que cite Brasília pesa igual a uma operação de fronteira que cite Roraima. Estado escuro
          significa "mais falado no período" — nunca "mais perigoso".
        </span>
      </p>

      <DataState loading={loading && !data} error={error} onRetry={refetch} skeletonCount={3}>
        {comMencao.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Nenhuma menção geográfica no período"
            hint="As notícias coletadas não citaram unidades da federação pelo nome por extenso. Amplie a janela."
            action={{ label: 'Ampliar para 1 ano', onClick: () => setDias(365) }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={MapIcon} label="Estados citados" value={String(comMencao.length)} hint="de 27 unidades" accent="brand" />
              <MetricCard
                icon={Database}
                label="Notícias analisadas"
                value={String(data.totalAnalisado)}
                hint={`${data.semLugarIdentificado} sem lugar identificado`}
                accent="brand"
              />
              <MetricCard
                icon={MapIcon}
                label="Mais citado"
                value={comMencao[0] ? [...comMencao].sort((a, b) => b.total - a.total)[0].uf : '—'}
                hint={comMencao.length ? [...comMencao].sort((a, b) => b.total - a.total)[0].nome : ''}
                accent="gold"
              />
              <MetricCard icon={Info} label="Pico de menções" value={String(maximo)} hint="num único estado" accent="amber" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* CARTOGRAMA */}
              <section className="card p-5 lg:col-span-2">
                <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                  Menções por unidade da federação
                  <InfoTooltip text="Cartograma: cada estado ocupa um quadrado igual, na posição geográfica aproximada. Num mapa de área real, o tamanho do estado distorceria a leitura da contagem." />
                </h2>
                <p className="mb-4 text-sm muted">Clique num estado para ver as notícias que o citaram</p>

                <div className="overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${grade.largura} ${grade.altura}`}
                    style={{ minWidth: 340, maxWidth: '100%', height: 'auto' }}
                    role="img"
                    aria-label="Cartograma do Brasil com a contagem de menções por estado"
                  >
                    {ufs.map((u) => {
                      const c = corDaContagem(u.total, maximo)
                      const x = u.coluna * (LADO + ESPACO)
                      const y = u.linha * (LADO + ESPACO)
                      const ativo = selecionado === u.uf
                      return (
                        <g
                          key={u.uf}
                          onClick={() => setSelecionado(ativo ? null : u.uf)}
                          style={{ cursor: u.total ? 'pointer' : 'default' }}
                          role="button"
                          tabIndex={u.total ? 0 : -1}
                          aria-label={`${u.nome}: ${u.total} menção(ões)`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelecionado(ativo ? null : u.uf)
                            }
                          }}
                        >
                          <rect
                            x={x} y={y} width={LADO} height={LADO} rx={7}
                            fill={c.fundo}
                            stroke={ativo ? '#caa733' : c.borda}
                            strokeWidth={ativo ? 2.5 : 1}
                          />
                          <text
                            x={x + LADO / 2} y={y + LADO / 2 - 3}
                            textAnchor="middle" fontSize="13" fontWeight="700"
                            fill={u.total ? c.texto : '#94a3b8'}
                          >
                            {u.uf}
                          </text>
                          <text
                            x={x + LADO / 2} y={y + LADO / 2 + 12}
                            textAnchor="middle" fontSize="10"
                            fill={u.total ? c.texto : '#94a3b8'}
                            opacity={u.total ? 0.9 : 0.5}
                          >
                            {u.total}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3 text-xs dark:border-white/10">
                  <span className="muted">Intensidade:</span>
                  {[['sem menção', 'rgba(148,163,184,0.15)'], ['baixa', '#2e7d4666'], ['média', '#caa73399'], ['alta', '#c0392bcc']].map(([r, cor]) => (
                    <span key={r} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded" style={{ background: cor }} />
                      <span className="muted">{r}</span>
                    </span>
                  ))}
                </div>
              </section>

              {/* DETALHE / REGIÕES */}
              <div className="space-y-6">
                {detalhe ? (
                  <section className="card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold tracking-tight">{detalhe.nome}</h2>
                        <p className="text-xs muted">{detalhe.regiao} · {detalhe.total} menção(ões)</p>
                      </div>
                      <button onClick={() => setSelecionado(null)} className="rounded p-1 muted hover:text-gray-900 dark:hover:text-white" aria-label="Fechar">
                        <X size={15} />
                      </button>
                    </div>

                    {detalhe.exemplos?.length ? (
                      <ul className="mt-3 space-y-2">
                        {detalhe.exemplos.map((e) => (
                          <li key={e.id} className="rounded-lg bg-white/5 p-2.5">
                            <p className="text-xs font-semibold leading-snug">{e.title}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] muted">
                              <span className={`rounded-full px-1.5 py-0.5 font-bold ${META_URGENCIA[e.urgency]?.classes || ''}`}>
                                {META_URGENCIA[e.urgency]?.rotulo || e.urgency}
                              </span>
                              {e.date && <span>{formatDateBR(e.date)}</span>}
                              {e.url && (
                                <a href={e.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 font-semibold text-brand-500 hover:underline dark:text-brand-400">
                                  abrir <ExternalLink size={9} />
                                </a>
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs muted">Nenhuma notícia citou este estado no período.</p>
                    )}
                  </section>
                ) : (
                  <section className="card p-5">
                    <h2 className="mb-2 text-base font-bold tracking-tight">Recortes estratégicos</h2>
                    <p className="mb-3 text-xs leading-relaxed muted">
                      Regiões que não são unidades da federação, mas que este domínio usa como recorte.
                    </p>
                    <div className="space-y-2">
                      {(data.regioes || []).map((r) => (
                        <div key={r.id} className="rounded-lg bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{r.nome}</p>
                            <span className="font-mono text-sm font-bold tabular-nums">{r.total}</span>
                          </div>
                          {r.ufs?.length > 0 && (
                            <p className="mt-0.5 text-[10px] muted">{r.ufs.join(' · ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="card p-5">
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wide muted">Ranking</h2>
                  <ol className="space-y-1.5">
                    {[...comMencao].sort((a, b) => b.total - a.total).slice(0, 10).map((u, i) => (
                      <li key={u.uf}>
                        <button
                          onClick={() => setSelecionado(u.uf)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-white/5"
                        >
                          <span className="w-4 text-xs tabular-nums muted">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">{u.nome}</span>
                          <span className="font-mono text-xs font-bold tabular-nums">{u.total}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>

            <p className="flex items-start gap-1.5 rounded-lg bg-white/5 p-3 text-xs leading-relaxed muted">
              <Info size={13} className="mt-0.5 shrink-0" />
              {data.nota}
            </p>
          </>
        )}
      </DataState>
    </div>
  )
}
