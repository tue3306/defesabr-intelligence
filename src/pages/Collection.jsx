import { useState } from 'react'
import {
  FlaskConical, Play, CheckCircle2, XCircle, Clock, Server, AlertCircle, Loader2,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// MÉTODO & COLETA — a tela do Analista
//
// Os três perfis estavam praticamente iguais porque o que os separava eram
// telas de conteúdo redigido, todas removidas. Esta existe para dar ao Analista
// um trabalho REAL e exclusivo: monitorar a coleta e auditar o filtro que
// decide o que entra no acervo.
//
// Tudo aqui vem de endpoints que exigem papel `analyst` no servidor:
//
//   GET  /system/method        a regra do filtro, com a amostra do que recusou
//   POST /system/method/test   aplica a regra a qualquer texto
//   GET  /system/runs          histórico de execuções dos coletores
//
// Um Usuário que digitar o endereço desta tela vê a parede de perfil; se
// contornar a interface e chamar o endpoint direto, recebe 403. É essa a
// diferença entre esconder um menu e controlar acesso.
// -----------------------------------------------------------------------------

const EXEMPLOS = [
  'Marinha do Brasil incorpora nova fragata da classe Tamandaré',
  'Operação Ágata apreende R$ 99 milhões na faixa de fronteira',
  'Ministro discursa em defesa do consumidor no Congresso',
  'Prefeitura entrega reforma de creche no bairro',
]

export default function Collection() {
  const metodo = useResource(() => request('GET /system/method'), [])
  const execucoes = useResource(() => request('GET /system/runs', { params: { limit: 20 } }), [])

  const [texto, setTexto] = useState(EXEMPLOS[0])
  const [resultado, setResultado] = useState(null)
  const [testando, setTestando] = useState(false)
  const [erro, setErro] = useState(null)

  const testar = async (valor) => {
    const alvo = (valor ?? texto).trim()
    if (!alvo) return
    setTestando(true); setErro(null)
    try {
      const { data } = await request('POST /system/method/test', { body: { text: alvo } })
      setResultado(data)
    } catch (e) {
      setErro(e?.userMessage || e?.message || 'Falha ao aplicar o filtro.')
      setResultado(null)
    } finally {
      setTestando(false)
    }
  }

  const m = metodo.data
  const runs = execucoes.data?.items || []
  const falhas = runs.filter((r) => !r.ok).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FlaskConical}
        title="Método & Coleta"
        description="A regra que decide o que entra no acervo, aplicável a qualquer texto, e o histórico das execuções dos coletores."
        help="Esta área é do perfil Analista. Os endpoints por trás dela exigem esse papel no servidor — não é o menu que a protege."
        breadcrumb={[{ label: 'Produção' }, { label: 'Método & Coleta' }]}
        badges={<Badge type={metodo.meta?.source === 'live' ? 'live' : 'demo'} />}
      />

      {/* ── O MÉTODO ── */}
      <DataState
        loading={metodo.loading}
        error={metodo.error}
        empty={!m}
        onRetry={metodo.refetch}
        emptyProps={{ icon: FlaskConical, title: 'Método indisponível', hint: 'O servidor não respondeu.' }}
      >
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            Como o filtro decide
            <InfoTooltip text="Um filtro cujo critério não se pode inspecionar é indistinguível de uma escolha editorial não declarada. Por isso a regra é exposta, e não apenas aplicada." />
          </h2>

          {m?.etapas?.length > 0 && (
            <ol className="mt-4 space-y-3">
              {m.etapas.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 font-mono text-xs font-bold text-brand-700 dark:text-brand-300">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed">
                    {typeof e === 'string' ? e : (
                      <>
                        <strong className="block text-gray-900 dark:text-white">{e.titulo}</strong>
                        <span className="muted">{e.texto}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Contador rotulo="Termos fortes" valor={m?.termosFortes} />
            <Contador rotulo="Termos fracos" valor={m?.termosFracos} />
            <Contador rotulo="Exclusões" valor={m?.exclusoes} />
            <Contador rotulo="Abertura (caracteres)" valor={m?.caracteresAbertura} />
          </div>

          {m?.regra && (
            <p className="mt-4 rounded-lg border-l-4 border-l-gold-500 bg-gold-500/5 px-3 py-2 text-sm">
              <strong>Regra:</strong> {m.regra}
            </p>
          )}

          {/* A metade que costuma ficar invisível. É ela que prova que o
              filtro filtra alguma coisa — e o Analista é quem a audita. */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Amostra
              titulo="Últimos aprovados"
              itens={m?.amostraAprovada?.map((x) => x.title)}
              vazio="Nada aprovado ainda."
              cor="emerald"
            />
            <Amostra
              titulo="Últimos recusados"
              itens={m?.amostraRecusada}
              vazio="Nada recusado ainda."
              cor="gray"
            />
          </div>
        </section>
      </DataState>

      {/* ── TESTE AO VIVO ── */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Play size={18} className="text-brand-400 dark:text-brand-300" /> Testar a regra
        </h2>
        <p className="mt-1 text-sm muted">
          Cole qualquer manchete e veja a decisão: quais termos casaram, se algum desqualificou o
          texto, e por quê. É a mesma função que roda na coleta.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex}
              onClick={() => { setTexto(ex); testar(ex) }}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs transition-colors hover:border-gold-500/50 hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/5"
            >
              {ex.slice(0, 44)}{ex.length > 44 ? '…' : ''}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            className="input flex-1 resize-y"
            placeholder="Cole um título ou parágrafo…"
            aria-label="Texto para testar o filtro"
          />
          <button onClick={() => testar()} disabled={testando} className="btn-primary shrink-0 self-start">
            {testando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Aplicar
          </button>
        </div>

        {erro && (
          <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {erro}
          </p>
        )}

        {resultado && (
          <div className={`mt-4 rounded-lg border-l-4 p-4 ${
            resultado.relevante
              ? 'border-l-military-green bg-emerald-500/5'
              : 'border-l-gray-400 bg-gray-500/5'
          }`}>
            <p className="flex items-center gap-2 text-base font-bold">
              {resultado.relevante
                ? <><CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400" /> Aprovado pelo filtro</>
                : <><XCircle size={18} className="text-gray-600 dark:text-gray-400" /> Recusado</>}
              <span className="ml-auto font-mono text-sm">{resultado.pontos} ponto(s)</span>
            </p>

            {resultado.porque && (
              <p className="mt-1.5 text-sm muted">{resultado.porque}</p>
            )}

            <div className="mt-3 space-y-2 text-xs">
              <Termos rotulo="Termos fortes" itens={resultado.termosFortes} cor="emerald" />
              <Termos rotulo="Termos fracos" itens={resultado.termosFracos} cor="amber" />
              <Termos rotulo="Exclusões acionadas" itens={resultado.exclusoes} cor="red" />
            </div>

            {resultado.classificacao && (
              <p className="mt-3 border-t border-gray-200 pt-2 text-xs muted dark:border-white/10">
                Classificado como <strong>{resultado.classificacao.categoria}</strong>,
                urgência <strong>{resultado.classificacao.urgencia}</strong>.
                {resultado.forteNaAbertura && ' Termo inequívoco na abertura do texto.'}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── EXECUÇÕES ── */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Server size={18} className="text-brand-400 dark:text-brand-300" /> Últimas execuções
          </h2>
          <div className="flex gap-3 text-xs">
            <span className="muted">{runs.length} registro(s)</span>
            {falhas > 0 && <span className="font-bold text-red-800 dark:text-red-300">{falhas} com falha</span>}
          </div>
        </div>

        <DataState
          loading={execucoes.loading}
          error={execucoes.error}
          empty={!runs.length}
          onRetry={execucoes.refetch}
          emptyProps={{ icon: Clock, title: 'Sem execuções registradas', hint: 'A primeira coleta ainda não ocorreu.' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                  <th className="py-2 pr-4 font-semibold">Quando</th>
                  <th className="py-2 pr-4 font-semibold">Coletor</th>
                  <th className="py-2 pr-4 font-semibold">Encontrados</th>
                  <th className="py-2 pr-4 font-semibold">Novos</th>
                  <th className="py-2 pr-4 font-semibold">Duração</th>
                  <th className="py-2 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                    <td className="py-2 pr-4 font-mono text-xs muted">{formatDateTimeBR(r.started_at)}</td>
                    <td className="py-2 pr-4 font-medium">{r.collector}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">{r.items_found ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">{r.items_new ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs tabular-nums muted">{r.duration_ms}ms</td>
                    <td className="py-2">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={11} /> ok
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300"
                          title={r.error || ''}
                        >
                          <XCircle size={11} /> falhou
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </section>
    </div>
  )
}

function Contador({ rotulo, valor }) {
  return (
    <div className="rounded-lg bg-gray-100 p-3 dark:bg-white/5">
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{rotulo}</p>
      <p className="mt-0.5 font-mono text-xl font-extrabold">{valor ?? '—'}</p>
    </div>
  )
}

function Amostra({ titulo, itens, vazio, cor }) {
  const borda = cor === 'emerald' ? 'border-l-military-green' : 'border-l-gray-400'
  return (
    <div className={`rounded-lg border-l-4 bg-gray-100 p-3 dark:bg-white/5 ${borda}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider muted">{titulo}</p>
      {itens?.length ? (
        <ul className="mt-2 space-y-1.5">
          {itens.map((t, i) => (
            <li key={i} className="text-xs leading-snug">{t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic muted">{vazio}</p>
      )}
    </div>
  )
}

function Termos({ rotulo, itens, cor }) {
  if (!itens?.length) return null
  const classes = {
    emerald: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    red: 'bg-red-500/15 text-red-800 dark:text-red-300',
  }[cor]
  return (
    <p className="flex flex-wrap items-center gap-1.5">
      <span className="font-semibold muted">{rotulo}:</span>
      {itens.map((t) => (
        <span key={t} className={`rounded px-1.5 py-0.5 font-mono ${classes}`}>{t}</span>
      ))}
    </p>
  )
}
