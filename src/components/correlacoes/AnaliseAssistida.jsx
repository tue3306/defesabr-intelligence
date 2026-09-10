import { useState } from 'react'
import { Sparkles, Check, Flag, AlertTriangle, ExternalLink, ListChecks, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useIa } from '../../hooks/useIa'
import { useResource } from '../../hooks/useResource'
import { request } from '../../services/client'
import { analisarMaterias } from '../../services/ia'
import { formatDateBR } from '../../utils/dateUtils'
import { normalize } from '../../utils/semanticSearch'
import { categoryColor } from '../../utils/textUtils'
import DataState from '../ui/DataState'
import InfoTooltip from '../ui/InfoTooltip'

// -----------------------------------------------------------------------------
// ANÁLISE ASSISTIDA — você escolhe as matérias, o modelo escreve a leitura
//
// As oito regras determinísticas encontram ligações literais e provam cada uma
// com a evidência. O que elas não conseguem é dizer se a ligação IMPORTA: "a
// matéria cita a Nuclep, que teve vazamento" é verdadeiro e pode ser só
// coincidência de nome. Esse salto é interpretativo, e é o que falta.
//
// Aqui a escolha é humana — até quinze matérias, selecionadas por quem lê — e o
// modelo escreve o Contexto no Brasil e o Impacto possível de cada uma, mais a
// leitura do conjunto.
//
// ─────────────────────────────────────────────────────────────────────────────
// O ÍNDICE DE VÍNCULO CONTINUA SENDO CONTADO, NÃO ESCRITO
//
// O pedido original incluía deixar o modelo produzir também o índice. Não dá,
// e a razão é a mesma que governa o resto do projeto: um número saído de um
// modelo é indistinguível de um número apurado, e quem lê não tem como saber
// qual dos dois está vendo. "78/100" escrito por máquina parece exatamente com
// "78/100" contado do catálogo de entidades.
//
// Então a divisão é: o modelo escreve a PROSA, a plataforma conta o NÚMERO. As
// duas coisas aparecem lado a lado e rotuladas, e quem lê pode conferir uma
// contra a outra.
//
// ─────────────────────────────────────────────────────────────────────────────
// E A RESPOSTA É CONFERIDA ANTES DE APARECER
//
// O modelo recebe, por matéria, a lista FECHADA de entidades brasileiras que o
// detector encontrou, e é instruído a citar apenas essas. Depois o servidor
// confere: o que ele nomear fora da lista é removido e contado. O painel de
// verificação mostra esse número — uma alucinação silenciosa vira visível.
// -----------------------------------------------------------------------------

const MAXIMO = 15

export default function AnaliseAssistida() {
  const ia = useIa()
  const [selecao, setSelecao] = useState([])
  const [resultado, setResultado] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [busca, setBusca] = useState('')

  const candidatas = useResource(
    () => request('GET /ia/candidatas', { params: { days: 14 } }),
    [],
    { enabled: ia.configurada },
  )

  // Sem modelo ligado o bloco não aparece. A tela de Configurações já explica o
  // recurso a quem quiser ligá-lo; repetir a oferta aqui seria propaganda
  // dentro do produto.
  if (!ia.configurada) return null

  const itens = candidatas.data?.items || []

  // ───────────────────────────────────────────────────────────────────────────
  // A BUSCA, E POR QUE ELA NÃO ESCONDE O QUE JÁ FOI ESCOLHIDO
  //
  // Escolher à mão numa lista de sessenta funciona enquanto se quer "as mais
  // relevantes". Não funciona quando se quer um ASSUNTO — submarino, fronteira,
  // ransomware —, e é justamente aí que a análise assistida vale mais: um
  // conjunto sobre um tema diz algo que a mesma quantidade de matérias soltas
  // não diz.
  //
  // O filtro casa sem acento e sem caixa, contra título, fonte e categoria. Sem
  // ele, procurar "análise" não encontraria "analise" e vice-versa.
  //
  // O QUE JÁ ESTÁ SELECIONADO NUNCA SOME. Sem essa regra, montar um conjunto de
  // dois temas seria impossível: ao buscar o segundo assunto, as escolhas do
  // primeiro sumiriam da tela e a pessoa perderia a noção do que já tem. Elas
  // ficam, marcadas, e a contagem no rodapé continua batendo com o que se vê.
  // ───────────────────────────────────────────────────────────────────────────
  const termo = normalize(busca.trim())
  const visiveis = termo
    ? itens.filter((m) => (
      selecao.includes(m.id)
      || normalize(`${m.titulo} ${m.fonte || ''} ${m.categoria || ''}`).includes(termo)
    ))
    : itens

  const alternar = (id) => setSelecao((s) => (
    s.includes(id) ? s.filter((x) => x !== id) : (s.length >= MAXIMO ? s : [...s, id])
  ))

  const analisar = async () => {
    setAnalisando(true)
    setResultado(null)
    try {
      setResultado(await analisarMaterias(selecao))
    } catch (e) {
      toast.error(e?.message || 'Não foi possível analisar.')
    } finally {
      setAnalisando(false)
    }
  }

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <ListChecks size={18} className="text-brand-500 dark:text-brand-300" />
        Análise assistida
        <InfoTooltip text="Você escolhe as matérias; o modelo escreve o contexto e o impacto de cada uma. O índice de vínculo com o Brasil continua sendo contado pela plataforma, não escrito pelo modelo." />
      </h2>
      <p className="mt-1 text-sm muted">
        Escolha até {MAXIMO} matérias dos últimos 14 dias. O modelo escreve o <strong>contexto no
        Brasil</strong> e o <strong>impacto possível</strong> de cada uma, e a leitura do conjunto.
        O <strong>índice de vínculo</strong> continua vindo da contagem de entidades — não do modelo.
      </p>

      {/* A busca fica FORA do DataState: some junto com a lista quando não há
        * matéria nenhuma, mas continua visível quando a busca não encontrou
        * nada — que é exatamente quando alguém precisa dela para corrigir o
        * termo. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[15rem] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <label htmlFor="busca-analise" className="sr-only">Buscar matéria por assunto, fonte ou categoria</label>
          <input
            id="busca-analise"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por assunto, fonte ou categoria — submarino, fronteira, ransomware…"
            className="w-full pl-9"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {termo && (
          <span className="text-xs muted">
            {visiveis.length} de {itens.length}
            {selecao.length > 0 && ' · selecionadas sempre visíveis'}
          </span>
        )}
      </div>

      <DataState
        loading={candidatas.loading}
        error={candidatas.error}
        empty={!itens.length}
        onRetry={candidatas.refetch}
        emptyProps={{ icon: Flag, title: 'Sem matérias no período', hint: 'A coleta roda a cada 30 minutos.' }}
      >
        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10">
          {visiveis.length === 0 ? (
            <p className="p-4 text-sm muted">
              Nenhuma matéria com <strong>{busca}</strong> nos últimos 14 dias. O acervo cobre o que
              a coleta trouxe — se o assunto não apareceu na imprensa monitorada, ele não está aqui.
            </p>
          ) : (
          <ul className="divide-y divide-gray-200 dark:divide-white/10">
            {visiveis.map((m) => {
              const marcada = selecao.includes(m.id)
              const cheio = selecao.length >= MAXIMO && !marcada
              return (
                <li key={m.id}>
                  <button
                    onClick={() => alternar(m.id)}
                    disabled={cheio}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors disabled:opacity-40 ${
                      marcada ? 'bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      marcada ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-400 dark:border-white/30'
                    }`}
                    >
                      {marcada && <Check size={11} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{m.titulo}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] muted">
                        <span>{m.fonte}</span>
                        <span>· {formatDateBR(m.publicadoEm)}</span>
                        {m.categoria && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: categoryColor(m.categoria) }}
                          >
                            {m.categoria}
                          </span>
                        )}
                        <span className="chip text-[10px]" title={m.brMotivo || 'Índice de vínculo com o Brasil'}>
                          vínculo {m.brScore ?? 0}
                        </span>
                        {m.ligacoes > 0 && <span className="chip text-[10px]">{m.ligacoes} ligação(ões)</span>}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={analisar} disabled={!selecao.length || analisando} className="btn-primary">
            <Sparkles size={15} /> {analisando ? 'Analisando…' : `Analisar ${selecao.length || ''}`}
          </button>
          {selecao.length > 0 && (
            <button onClick={() => setSelecao([])} className="btn-ghost text-sm">Limpar seleção</button>
          )}
          <span className="text-xs muted">{selecao.length} de {MAXIMO} selecionadas</span>
        </div>
      </DataState>

      {resultado && <Resultado r={resultado} />}
    </section>
  )
}

function Resultado({ r }) {
  const v = r.verificacao || {}
  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
          <Sparkles size={12} /> Escrito por máquina
        </span>
        <span className="chip font-mono text-[10px]">{r.modelo}</span>
        <span className="text-[11px] muted">{v.itensRespondidos} de {v.itensEnviados} matérias</span>
      </div>

      {/* ── O PAINEL DE CONFERÊNCIA ──
        * O número que importa não é quantas entidades o modelo citou, e sim
        * quantas ele citou que NÃO existiam. Zero é o resultado esperado;
        * qualquer outro valor é o aviso de que aquele texto merece leitura
        * mais atenta. */}
      <div className={`flex items-start gap-2 rounded-lg p-3 text-xs leading-relaxed ${
        v.entidadesDescartadas > 0
          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          : 'bg-military-green/10 text-emerald-800 dark:text-emerald-200'
      }`}
      >
        {v.entidadesDescartadas > 0
          ? <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          : <Check size={15} className="mt-0.5 shrink-0" />}
        <span>
          {v.entidadesDescartadas > 0 ? (
            <>
              <strong>{v.entidadesDescartadas} menção(ões) descartada(s).</strong> O modelo nomeou
              entidades que o detector não encontrou nas matérias enviadas, e elas foram removidas
              do texto acima. Leia o resto com atenção redobrada.
            </>
          ) : (
            <>
              <strong>Conferido.</strong> Toda entidade brasileira citada pelo modelo existe nas
              matérias enviadas, segundo o catálogo da plataforma.
            </>
          )}
        </span>
      </div>

      {r.leitura && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
          <p className="mb-2 text-sm font-bold">Leitura do conjunto</p>
          {String(r.leitura).split('\n').filter(Boolean).map((p, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p}</p>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {r.materias.map((m) => (
          <li key={m.id} className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
            <p className="text-sm font-semibold leading-snug">{m.titulo}</p>
            <p className="mt-0.5 text-[11px] muted">
              {m.fonte} · {formatDateBR(m.publicadoEm)}
              {m.url && (
                <>
                  {' · '}
                  <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    original <ExternalLink size={10} />
                  </a>
                </>
              )}
            </p>

            <dl className="mt-3 space-y-2.5">
              <Campo rotulo="Contexto no Brasil" texto={m.contexto} deMaquina />
              <Campo rotulo="Impacto possível" texto={m.impacto} deMaquina />
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider muted">
                  Índice de vínculo com o Brasil
                  <span className="rounded bg-gray-200 px-1 py-px text-[9px] font-bold normal-case tracking-normal text-gray-700 dark:bg-white/10 dark:text-gray-300">
                    contado
                  </span>
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed">
                  <span className="font-mono font-bold tabular-nums">{m.brScore ?? 0}</span>
                  <span className="muted">/100 — {m.brMotivo || 'sem vínculo medido'}</span>
                </dd>
              </div>
              {m.entidadesDetectadas?.length > 0 && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider muted">
                    Entidades reconhecidas no texto
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {m.entidadesDetectadas.map((e) => (
                      <span key={`${e.tipo}-${e.nome}`} className="chip text-[10px]">{e.nome}</span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed muted">{r.nota}</p>
    </div>
  )
}

function Campo({ rotulo, texto, deMaquina }) {
  if (!texto) return null
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider muted">
        {rotulo}
        {deMaquina && (
          <span className="rounded bg-brand-500/15 px-1 py-px text-[9px] font-bold normal-case tracking-normal text-brand-700 dark:text-brand-300">
            escrito por máquina
          </span>
        )}
      </dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{texto}</dd>
    </div>
  )
}
