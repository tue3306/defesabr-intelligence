import { useState } from 'react'
import {
  Activity, RefreshCw, Loader2, CheckCircle2, AlertTriangle, MinusCircle,
  Database, Server, Rss, Clock, Play, ChevronDown, FlaskConical, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import { useResource } from '../hooks/useResource'
import { sistema, fontes as apiFontes } from '../services'
import { formatDateTimeBR, timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// PAINEL DE STATUS
//
// Responde uma pergunta só, com evidência: O QUE AQUI FUNCIONA DE VERDADE?
//
// Cada linha vem do banco — quantos registros existem, quando foi a última
// execução, o que a fonte respondeu. Nada aqui é uma bolinha verde que alguém
// desenhou uma vez: um painel assim treina quem olha a não olhar.
//
// Três estados, deliberadamente distintos:
//   operacional       funciona, e há prova no banco
//   degradado         implementado, mas a última execução falhou ou nada trouxe
//   não implementado  não existe nesta versão — e isso não é falha
// -----------------------------------------------------------------------------

const ESTADO = {
  operacional: {
    rotulo: 'Operacional',
    icone: CheckCircle2,
    ponto: 'bg-emerald-500',
    chip: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-300',
    borda: 'border-l-emerald-500',
  },
  degradado: {
    rotulo: 'Degradado',
    icone: AlertTriangle,
    ponto: 'bg-amber-500',
    chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-300',
    borda: 'border-l-amber-500',
  },
  nao_implementado: {
    rotulo: 'Não implementado',
    icone: MinusCircle,
    ponto: 'bg-gray-400',
    chip: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
    borda: 'border-l-gray-400',
  },
}

const GRUPOS = ['Coleta', 'Processamento', 'Entrega', 'Não implementado']

export default function SystemStatus() {
  const status = useResource(() => sistema.status(), [])
  const execucoes = useResource(() => sistema.execucoes(30), [])
  const fontes = useResource(() => apiFontes.listar(), [])
  const [coletando, setColetando] = useState(false)

  const d = status.data
  const capacidades = d?.capacidades || []

  const coletar = async () => {
    setColetando(true)
    const aviso = toast.loading('Coletando das fontes públicas… isso leva alguns segundos.')
    try {
      const { data: r } = await sistema.coletar()
      toast.success(
        `${r.noticias?.novos ?? 0} notícia(s), ${r.legislativo?.novos ?? 0} proposição(ões), `
        + `${r.indicadores?.gravados ?? 0} ponto(s) de série`,
        { id: aviso, duration: 6000 }
      )
      status.refetch(); execucoes.refetch(); fontes.refetch()
    } catch (err) {
      toast.error(err?.userMessage || 'Falha na coleta.', { id: aviso })
    } finally {
      setColetando(false)
    }
  }

  const atualizarTudo = () => { status.refetch(); execucoes.refetch(); fontes.refetch() }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Status da Plataforma"
        description="O que funciona, o que está degradado e o que não existe nesta versão — cada linha derivada do banco."
        help="Um painel que pinta tudo de verde porque alguém escreveu 'ok' no código é pior que nenhum painel: ele treina quem olha a não olhar."
        breadcrumb={[{ label: 'Sistema' }, { label: 'Status' }]}
        actions={
          <>
            <button onClick={atualizarTudo} className="btn-ghost text-sm">
              <RefreshCw size={15} /> Atualizar
            </button>
            <button onClick={coletar} disabled={coletando} className="btn-primary text-sm">
              {coletando ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Coletar agora
            </button>
          </>
        }
      />

      <DataState loading={status.loading && !d} error={status.error} onRetry={status.refetch} skeletonCount={4}>
        {d && (
          <>
            {/* RESUMO */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={CheckCircle2}
                label="Saúde"
                value={`${d.resumo.saude}%`}
                hint={`${d.resumo.operacional} de ${d.resumo.operacional + d.resumo.degradado} implementadas`}
                accent={d.resumo.saude >= 90 ? 'green' : d.resumo.saude >= 60 ? 'amber' : 'red'}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Degradadas"
                value={String(d.resumo.degradado)}
                hint={d.resumo.degradado ? 'precisam de atenção' : 'nenhuma'}
                accent={d.resumo.degradado ? 'amber' : 'green'}
              />
              <MetricCard
                icon={Database}
                label="Acervo"
                value={String(d.acervo.artigos)}
                hint={`${d.acervo.artigosRelevantes} relevantes · ${d.acervo.proposicoes} proposições`}
                accent="brand"
              />
              <MetricCard
                icon={Clock}
                label="Próxima coleta"
                value={d.agendador.proximaExecucao
                  ? new Date(d.agendador.proximaExecucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
                hint={d.agendador.ativo ? `a cada ${d.agendador.intervaloMinutos} min` : 'agendador desligado'}
                accent="brand"
              />
            </div>

            {/* A nota que impede a leitura errada do número acima. */}
            <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed">
              <MinusCircle size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
              <span className="text-gray-700 dark:text-gray-300">
                A saúde conta só o que a plataforma <strong>se propõe a fazer</strong>. As{' '}
                {d.resumo.naoImplementado} capacidades marcadas como não implementadas ficam de fora
                do cálculo — contá-las como falha puniria a honestidade de declará-las.
              </span>
            </p>

            {/* CAPACIDADES POR GRUPO */}
            {GRUPOS.map((grupo) => {
              const doGrupo = capacidades.filter((c) => c.grupo === grupo)
              if (!doGrupo.length) return null
              return (
                <section key={grupo}>
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide muted">{grupo}</h2>
                  <div className="space-y-2">
                    {doGrupo.map((c) => <Capacidade key={c.id} c={c} />)}
                  </div>
                </section>
              )
            })}

            {/* FONTES */}
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                <Rss size={17} className="text-brand-400 dark:text-brand-300" /> Fontes de coleta
              </h2>
              <p className="mb-4 text-sm muted">
                O que cada fonte respondeu na última tentativa. Uma fonte quebrada não avisa
                sozinha — ela apenas para de contribuir, e o acervo encolhe sem que ninguém veja.
              </p>
              <DataState loading={fontes.loading} error={fontes.error} onRetry={fontes.refetch} skeletonCount={3}>
                <div className="space-y-2">
                  {(fontes.data?.items || []).map((f) => <Fonte key={f.id} f={f} onColetado={atualizarTudo} />)}
                </div>

                {(fontes.data?.recusadas || []).length > 0 && (
                  <div className="mt-4 rounded-lg bg-white/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide muted">
                      Fontes que recusam cliente automatizado
                    </p>
                    <p className="mt-1 text-xs leading-relaxed muted">
                      Documentadas para que ninguém as recadastre achando que foram esquecidas.
                      Cadastrá-las encheria este painel de erro permanente que ninguém pode consertar.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {fontes.data.recusadas.map((r) => (
                        <li key={r.name} className="text-xs muted">
                          <span className="font-semibold">{r.name}</span> — {r.motivo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </DataState>
            </section>

            <TestadorDoFiltro />

            {/* HISTÓRICO */}
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                <Clock size={17} className="text-brand-400 dark:text-brand-300" /> Histórico de execuções
              </h2>
              <p className="mb-4 text-sm muted">
                Cada coleta é registrada com duração e resultado. É o que separa "funciona" de
                "funcionou uma vez".
              </p>
              <DataState loading={execucoes.loading} error={execucoes.error} onRetry={execucoes.refetch} skeletonCount={2}>
                {(execucoes.data?.porColetor || []).length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {execucoes.data.porColetor.map((c) => (
                      <div key={c.collector} className="rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider muted">{c.collector}</p>
                        <p className="mt-0.5 text-lg font-extrabold tabular-nums">
                          {c.sucessos}/{c.execucoes}
                        </p>
                        <p className="text-[11px] muted">
                          {c.duracaoMediaMs}ms · {c.itensNovos} item(ns)
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide muted dark:border-white/10">
                        <th scope="col" className="py-2 pr-3 font-semibold">Quando</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Coletor</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Resultado</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Itens</th>
                        <th scope="col" className="py-2 font-semibold">Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(execucoes.data?.items || []).map((e) => (
                        <tr key={e.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.06]">
                          <td className="whitespace-nowrap py-2 pr-3 text-xs muted">
                            {formatDateTimeBR(e.finished_at || e.started_at)}
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">{e.collector}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              e.ok ? ESTADO.operacional.chip : ESTADO.degradado.chip
                            }`}>
                              {e.ok ? 'ok' : 'falha'}
                            </span>
                            {e.error && <span className="ml-2 text-[11px] text-red-500">{e.error}</span>}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{e.items_new}</td>
                          <td className="py-2 text-xs tabular-nums muted">{e.duration_ms}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataState>
            </section>

            {/* AMBIENTE */}
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                <Server size={14} /> Ambiente
              </h2>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Node', d.ambiente.node],
                  ['Ambiente', d.ambiente.ambiente],
                  ['Versão', d.ambiente.versao],
                  ['No ar há', `${Math.floor(d.ambiente.uptimeSegundos / 60)} min`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/5 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider muted">{k}</dt>
                    <dd className="mt-0.5 truncate font-mono text-xs font-semibold" title={String(v)}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 break-all font-mono text-[11px] muted">{d.ambiente.banco}</p>
            </section>
          </>
        )}
      </DataState>
    </div>
  )
}

// ── Uma capacidade ───────────────────────────────────────────────────────────
function Capacidade({ c }) {
  const [aberto, setAberto] = useState(false)
  const e = ESTADO[c.estado] || ESTADO.degradado
  const Icone = e.icone

  return (
    <article className={`card border-l-4 p-4 ${e.borda}`}>
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-start gap-3 text-left"
      >
        <Icone size={17} className={`mt-0.5 shrink-0 ${
          c.estado === 'operacional' ? 'text-emerald-500'
            : c.estado === 'degradado' ? 'text-amber-500' : 'text-gray-400'
        }`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold tracking-tight">{c.nome}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.chip}`}>{e.rotulo}</span>
          </span>
          <span className="mt-0.5 block text-xs muted">{c.detalhe}</span>
        </span>
        <ChevronDown size={15} className={`mt-0.5 shrink-0 muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-white/10">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{c.descricao}</p>
          {c.fonte && c.fonte !== '—' && (
            <p className="font-mono text-[11px] muted">fonte: {c.fonte}</p>
          )}
          {Object.keys(c.metricas || {}).length > 0 && (
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {Object.entries(c.metricas)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <dt className="muted">{rotularMetrica(k)}</dt>
                    <dd className="font-mono font-semibold">{formatarMetrica(k, v)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      )}
    </article>
  )
}

const ROTULOS = {
  registros: 'registros',
  ultimaExecucao: 'última execução',
  duracaoMs: 'duração',
  novosNaUltima: 'novos na última',
  confiabilidade: 'confiabilidade',
  taxaAprovacao: 'taxa de aprovação',
  proximaExecucao: 'próxima',
  emAndamento: 'em andamento',
}
const rotularMetrica = (k) => ROTULOS[k] || k

function formatarMetrica(k, v) {
  if (k === 'duracaoMs') return `${v}ms`
  if (k === 'confiabilidade' || k === 'taxaAprovacao') return `${v}%`
  if (k === 'emAndamento') return v ? 'sim' : 'não'
  if (k === 'ultimaExecucao' || k === 'proximaExecucao') return v ? timeAgo(v) : '—'
  return String(v)
}

// ── Uma fonte ────────────────────────────────────────────────────────────────
function Fonte({ f, onColetado }) {
  const [ocupado, setOcupado] = useState(false)
  const quebrada = f.lastStatus === 'erro'

  const coletar = async () => {
    setOcupado(true)
    try {
      const { data: r } = await sistema.coletarFonte(f.id)
      if (r.ok) {
        toast.success(r.novos
          ? `${f.name}: ${r.novos} item(ns) novo(s), ${r.relevantes} relevante(s)`
          : `${f.name}: respondeu com ${r.encontrados} item(ns), nenhum inédito`)
      } else {
        toast.error(`${f.name}: ${r.erro}`)
      }
      onColetado()
    } catch (err) {
      toast.error(err?.userMessage || 'Não foi possível coletar esta fonte.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className={`rounded-lg p-3 ${quebrada ? 'bg-red-500/5' : 'bg-white/5'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${
          quebrada ? 'bg-red-500' : f.lastStatus ? 'bg-emerald-500' : 'bg-gray-400'
        }`} />
        <p className="text-sm font-semibold">{f.name}</p>
        {f.category && <span className="chip text-[10px]">{f.category}</span>}
        {f.reliability !== null && (
          <span className="text-[11px] muted">{f.reliability}% de sucesso</span>
        )}
        <button onClick={coletar} disabled={ocupado} className="btn-ghost ml-auto px-2.5 py-1 text-xs">
          {ocupado ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Testar
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] muted">
        <span>{f.articles} artigo(s) · {f.relevantArticles} relevante(s)</span>
        <span>· {f.lastFetchAt ? timeAgo(f.lastFetchAt) : 'nunca coletada'}</span>
        {f.lastDurationMs != null && <span>· {f.lastDurationMs}ms</span>}
        {f.siteUrl && (
          <a href={f.siteUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-brand-500 hover:underline dark:text-brand-400">
            site <ExternalLink size={10} />
          </a>
        )}
      </div>

      {f.lastError && (
        <p className="mt-1.5 font-mono text-[11px] text-red-800 dark:text-red-400">{f.lastError}</p>
      )}
    </div>
  )
}

// ── Testador do filtro ───────────────────────────────────────────────────────
//
// Deixa a regra de relevância demonstrável AO VIVO: cola-se um título e vê-se
// a decisão com os termos que casaram. Sem isto, "a regra é auditável" seria
// só uma afirmação sobre o código.
const EXEMPLOS = [
  'Forças Armadas ampliam Operação Ágata na faixa de fronteira norte',
  'Justiça condena empresa em ação de defesa do consumidor',
  'Ministério da Defesa anuncia entrega de nova fragata classe Tamandaré',
  'Toffoli suspende campanha digital na internet',
]

function TestadorDoFiltro() {
  const [texto, setTexto] = useState(EXEMPLOS[0])
  const [r, setR] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const testar = async (t = texto) => {
    if (!t.trim()) return
    setOcupado(true)
    try {
      const { data } = await sistema.testarFiltro(t)
      setR(data)
    } catch (err) {
      toast.error(err?.userMessage || 'Falha ao testar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
        <FlaskConical size={17} className="text-gold-500" /> Testar o filtro de relevância
      </h2>
      <p className="mb-4 text-sm muted">
        Cole um título e veja a decisão da regra, com os termos que casaram. O mesmo código que
        classifica a coleta responde aqui.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="filtro-teste" className="sr-only">Texto para testar</label>
        <input
          id="filtro-teste"
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && testar()}
          placeholder="Cole um título de notícia…"
        />
        <button onClick={() => testar()} disabled={ocupado} className="btn-primary shrink-0 justify-center">
          {ocupado ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />} Testar
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXEMPLOS.map((ex) => (
          <button
            key={ex}
            onClick={() => { setTexto(ex); testar(ex) }}
            className="rounded-full border border-gray-300 px-2.5 py-1 text-xs muted transition-colors hover:border-gold-500/50 dark:border-white/10"
          >
            {ex.slice(0, 44)}…
          </button>
        ))}
      </div>

      {r && (
        <div className={`mt-4 rounded-lg border-l-4 p-4 ${
          r.relevante ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'
        }`}>
          <p className="flex items-center gap-2 text-sm font-bold">
            {r.relevante
              ? <><CheckCircle2 size={16} className="text-emerald-500" /> Entra no acervo</>
              : <><MinusCircle size={16} className="text-red-500" /> Fica de fora</>}
            <span className="ml-auto font-mono text-xs muted">{r.pontos} ponto(s)</span>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{r.porque}</p>

          <dl className="mt-3 space-y-1.5 text-xs">
            {[
              ['Termos inequívocos', r.termosFortes, 'text-emerald-800 dark:text-emerald-400'],
              ['Termos ambíguos', r.termosFracos, 'muted'],
              ['Contextos que desqualificam', r.exclusoes, 'text-red-800 dark:text-red-400'],
            ].filter(([, v]) => v?.length).map(([k, v, cor]) => (
              <div key={k} className="flex flex-wrap gap-1.5">
                <dt className="muted">{k}:</dt>
                <dd className={`font-mono font-semibold ${cor}`}>{v.join(', ')}</dd>
              </div>
            ))}
            {r.relevante && (
              <div className="flex gap-1.5">
                <dt className="muted">Classificação:</dt>
                <dd className="font-semibold">
                  {r.classificacao.categoria} · urgência {r.classificacao.urgencia}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  )
}
