import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Scale, AlertTriangle, ShieldAlert, Activity, Link2, Filter, Layers, Globe2, Clock,
  ChevronDown, Info, CheckCircle2, XCircle, Eye, BellRing, Newspaper, Search, ArrowDown,
} from 'lucide-react'
import DataState from '../components/ui/DataState'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { urgencyMeta } from '../utils/textUtils'

// -----------------------------------------------------------------------------
// COMO A PLATAFORMA DECIDE — a página que explica cada número da tela
//
// A plataforma classifica o mundo: esta matéria é CRÍTICA, este incidente é
// grave, o período está em ATENÇÃO, esta ligação tem força 4. Cada uma dessas
// réguas existia escrita no código e publicada em alguma rota — só que em
// rotas que exigem conta de administrador, ou sessão. Quem VIA o selo não
// tinha como chegar à régua.
//
// Um selo "CRÍTICO" que ninguém pode contestar é decoração. Esta página é
// pública e mostra os valores REAIS, lidos de `/api/metodo`: os pesos do
// índice de alerta, os degraus da criticidade, as sete regras de correlação
// com a força de cada uma, o vocabulário da urgência.
//
// ESCRITA PARA QUEM NUNCA VIU O ASSUNTO. Cada bloco começa com uma frase em
// linguagem de todo dia ("Em palavras simples"), e só depois vem a regra
// técnica. Termo de jargão que aparece uma vez é explicado ali mesmo. Se a
// pessoa parar de ler no primeiro parágrafo, ela já entendeu o essencial.
//
// E cada escala diz o que ela NÃO significa. É a parte que mais importa num
// produto de inteligência: "volume de cobertura" não é risco, "urgência" não é
// gravidade, "correlação" não é causa.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// O GUIA DOS NÍVEIS — em linguagem de todo dia, antes de qualquer régua
//
// A página explicava COMO cada nível é calculado, com a lista de palavras. O
// que faltava era o que qualquer pessoa pergunta primeiro: "recebi um alerta
// ALTO — e agora?". Cada nível responde a quatro perguntas: o que significa,
// quanta atenção pede, que tipo de fato o produz, e o que fazer ao recebê-lo.
//
// Os nomes são os que o sistema já usa (CRÍTICO, ALTO, MÉDIO, BAIXO) — não
// uma escala nova inventada para esta página. Os exemplos marcados como
// "do acervo" são manchetes reais coletadas pela plataforma; os demais são
// ilustrativos, e dizem isso.
// -----------------------------------------------------------------------------
const GUIA = [
  {
    nivel: 'CRITICO',
    significa: 'A notícia narra um acontecimento violento que acabou de acontecer: ataque, invasão, bombardeio, explosão, aeronave abatida, mortos.',
    atencao: 'Máxima — leia agora.',
    exemplos: [
      { texto: 'Rússia diz que lançou ataque massivo contra Kiev, Zaporizhia e Odessa', real: true },
      { texto: 'Caças da Otan abatem drone que invadiu o espaço aéreo da Lituânia', real: true },
    ],
    fazer: 'É o único nível que abre um aviso na tela. Abra a matéria e confira a fonte: a primeira notícia de um ataque costuma ser incompleta, e os números mudam nas horas seguintes.',
  },
  {
    nivel: 'ALTO',
    significa: 'Um assunto sério em andamento, que pede acompanhamento: guerra, crise, confronto, operação, ameaça, investigação, sanções.',
    atencao: 'Alta — acompanhe nas próximas horas ou dias.',
    exemplos: [
      { texto: 'Guerra no Irã já custou R$ 224 bilhões aos EUA, diz Pentágono', real: true },
      { texto: 'Equador decreta emergência em 8 províncias por violência do narcotráfico', real: true },
    ],
    fazer: 'O cenário merece atenção, mas o título não narra um fato violento novo. Leia quando puder e volte ao tema se ele subir para crítico.',
  },
  {
    nivel: 'MEDIO',
    significa: 'Uma decisão ou movimento relevante do setor: acordo, contrato, exercício militar, visita oficial, entrega de equipamento. Também fica aqui o texto histórico ou de análise que usa palavras fortes.',
    atencao: 'Moderada — acompanhamento de rotina.',
    exemplos: [
      { texto: 'Marinha recebe novo navio-patrulha', real: false },
      { texto: 'Brasil e país vizinho assinam acordo de cooperação em defesa', real: false },
    ],
    fazer: 'Nada urgente. É a informação que ajuda a entender para onde o setor está indo — compras, parcerias, prioridades.',
  },
  {
    nivel: 'BAIXO',
    significa: 'Informação de contexto: perfil, efeméride, curiosidade, matéria que só cita o tema de passagem.',
    atencao: 'Baixa — leitura opcional.',
    exemplos: [
      { texto: 'Museu reabre exposição sobre a história da aviação militar', real: false },
    ],
    fazer: 'Nada a fazer. Está no acervo porque trata de defesa, não porque peça ação.',
  },
]

// Palavras com acento, para a tela: as listas do servidor são guardadas sem
// acento ("colisao", "invasao") porque é assim que a comparação é feita — e
// escritas assim na tela pareciam erro de digitação.
const PALAVRAS = {
  CRITICO: 'ataque, invasão, bombardeio, explosão, abatido, sequestro, mortos',
  ALTO: 'guerra, crise, confronto, emergência, operação, ameaça, investigação, sanções',
  MEDIO: 'acordo, contrato, exercício, visita, entrega, licitação, parceria',
}

export default function Methodology() {
  const r = useResource(() => request('GET /metodo'), [])
  const m = r.data
  const { hash } = useLocation()

  // Chegando por "/metodologia#niveis" (o link do painel e do aviso crítico),
  // a página abre na seção pedida — o App leva toda troca de rota ao topo.
  useEffect(() => {
    if (!hash) return undefined
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300">
            <Scale size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Como a plataforma decide</h1>
            <p className="text-sm muted">Cada número da tela, explicado — e a régua que o produziu</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Esta plataforma lê notícias e dados públicos e coloca rótulos neles: <strong>urgência</strong> de
          uma matéria, <strong>criticidade</strong> de um ataque, <strong>nível de alerta</strong> do
          período, <strong>força</strong> de uma ligação entre dois fatos. Esta página mostra, em
          linguagem simples, o que cada rótulo quer dizer, como ele é calculado e — o mais importante —
          o que ele <em>não</em> quer dizer.
        </p>
        <p className="mt-3 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <strong>A regra que vale para tudo:</strong> a plataforma mede <strong>o que foi publicado</strong>,
          não o mundo. Ela conta palavras em textos de fontes públicas, com listas escritas à mão que
          qualquer pessoa pode conferir. Não há inteligência artificial, não há adivinhação e não há
          opinião de editor em nenhuma das contas.
        </p>
      </header>

      {/* ── ÍNDICE RÁPIDO ── */}
      <nav aria-label="Nesta página" className="flex flex-wrap gap-2 text-xs">
        <a href="#niveis" onClick={(e) => { e.preventDefault(); document.getElementById('niveis')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn-ghost px-3 py-1.5 text-xs"><ArrowDown size={13} aria-hidden="true" /> Os níveis, em palavras simples</a>
        <a href="#reguas" onClick={(e) => { e.preventDefault(); document.getElementById('reguas')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn-ghost px-3 py-1.5 text-xs"><ArrowDown size={13} aria-hidden="true" /> As quatro réguas</a>
        <a href="#correlacao" onClick={(e) => { e.preventDefault(); document.getElementById('correlacao')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn-ghost px-3 py-1.5 text-xs"><ArrowDown size={13} aria-hidden="true" /> Como a correlação funciona</a>
      </nav>

      {/* ── OS NÍVEIS, EM PALAVRAS SIMPLES ── */}
      <section id="niveis" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="titulo-niveis">
        <h2 id="titulo-niveis" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <BellRing size={19} className="shrink-0 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          Os níveis de urgência, em palavras simples
        </h2>
        <p className="mt-1 text-sm muted">
          Toda notícia recebe um destes quatro níveis. Eles aparecem como etiqueta na matéria, no sino de
          alertas e no aviso que se abre na tela quando o nível é crítico.
        </p>
        <ol className="mt-4 space-y-3">
          {GUIA.map((g) => (
            <li key={g.nivel} className="rounded-xl border-l-4 bg-gray-500/5 p-4 dark:bg-white/5" style={{ borderLeftColor: `var(--nivel-${g.nivel.toLowerCase()})` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${urgencyMeta[g.nivel]?.classes || ''}`}>
                  {urgencyMeta[g.nivel]?.label || g.nivel}
                </span>
                <span className="text-sm font-semibold">Atenção: {g.atencao}</span>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[9.5rem_1fr]">
                <dt className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200"><Info size={14} aria-hidden="true" /> O que significa</dt>
                <dd className="text-gray-700 dark:text-gray-300">{g.significa}</dd>
                <dt className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200"><Newspaper size={14} aria-hidden="true" /> Exemplos</dt>
                <dd className="text-gray-700 dark:text-gray-300">
                  <ul className="space-y-0.5">
                    {g.exemplos.map((e) => (
                      <li key={e.texto}>
                        “{e.texto}” <span className="text-[11px] muted">({e.real ? 'manchete do acervo' : 'exemplo ilustrativo'})</span>
                      </li>
                    ))}
                  </ul>
                </dd>
                <dt className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200"><Eye size={14} aria-hidden="true" /> Ao receber</dt>
                <dd className="text-gray-700 dark:text-gray-300">{g.fazer}</dd>
              </dl>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg bg-brand-500/10 p-3 text-xs leading-relaxed text-gray-800 dark:text-gray-200">
          <strong>Lembre sempre:</strong> o nível sai das palavras que a imprensa escreveu no título. Ele diz
          o quanto a notícia pede atenção — não mede o tamanho real do fato nem prevê o que vai acontecer.
          A regra exata, com as listas de palavras, está mais abaixo.
        </p>
      </section>

      {/* ── AS QUATRO RÉGUAS ── */}
      <section id="reguas" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="titulo-reguas">
        <h2 id="titulo-reguas" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <Scale size={19} className="shrink-0 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          Quatro réguas diferentes — não confunda
        </h2>
        <p className="mt-1 text-sm muted">
          Algumas usam as mesmas palavras (“crítico”, “alto”), mas medem coisas diferentes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">As quatro escalas da plataforma, o que cada uma mede e onde aparece</caption>
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th scope="col" className="py-2 pr-3">Régua</th>
                <th scope="col" className="py-2 pr-3">Níveis</th>
                <th scope="col" className="py-2 pr-3">O que mede</th>
                <th scope="col" className="py-2">Onde aparece</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">Urgência</th>
                <td className="py-2 pr-3">Crítico · Alto · Médio · Baixo</td>
                <td className="py-2 pr-3">Quanto UMA notícia pede atenção agora</td>
                <td className="py-2">Clipping, alertas, aviso na tela</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">Criticidade</th>
                <td className="py-2 pr-3">Crítico · Alto · Médio · Baixo</td>
                <td className="py-2 pr-3">Quanto a organização atacada por hackers importa para o Brasil</td>
                <td className="py-2">Incidentes no Brasil</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">Nível de alerta</th>
                <td className="py-2 pr-3">Normal · Atenção · Alerta · Crítico (0 a 100)</td>
                <td className="py-2 pr-3">O resumo de TODAS as notícias do período</td>
                <td className="py-2">Painel, modo apresentação</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-3 text-left font-semibold">Força da correlação</th>
                <td className="py-2 pr-3">1 a 5</td>
                <td className="py-2 pr-3">Quão direta é a ligação entre dois fatos — não o perigo</td>
                <td className="py-2">Correlações</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── CORRELAÇÃO, EM PALAVRAS SIMPLES ── */}
      <section id="correlacao" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="titulo-correlacao">
        <h2 id="titulo-correlacao" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <Link2 size={19} className="shrink-0 text-brand-400 dark:text-brand-300" aria-hidden="true" />
          Como a correlação funciona
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Quando diferentes fatos relacionados são identificados, o sistema pode correlacioná-los para
          indicar que existe uma <strong>possível relação</strong> entre eles. Na prática:
        </p>
        <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <li className="rounded-lg bg-gray-500/5 p-3 text-sm dark:bg-white/5">
            <span className="text-xs font-bold uppercase tracking-wider muted">1. A notícia cita um nome</span>
            <p className="mt-1 text-gray-700 dark:text-gray-300">Por exemplo, uma empresa estatal, um grupo hacker, uma cidade ou um estado.</p>
          </li>
          <li className="rounded-lg bg-gray-500/5 p-3 text-sm dark:bg-white/5">
            <span className="text-xs font-bold uppercase tracking-wider muted">2. O nome já está no acervo</span>
            <p className="mt-1 text-gray-700 dark:text-gray-300">O mesmo nome, ou o mesmo endereço de site, aparece na lista de organizações brasileiras divulgadas por grupos de extorsão.</p>
          </li>
          <li className="rounded-lg bg-gray-500/5 p-3 text-sm dark:bg-white/5">
            <span className="text-xs font-bold uppercase tracking-wider muted">3. A ligação aparece, com a prova</span>
            <p className="mt-1 text-gray-700 dark:text-gray-300">A tela mostra a evidência literal (“domínio x = domínio x”) e uma força de 1 a 5: 5 é o mesmo site; 2 é só o mesmo setor.</p>
          </li>
        </ol>
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={15} aria-hidden="true" /> Correlação não é confirmação</p>
          <p className="mt-1">
            Uma correlação <strong>não</strong> afirma que a notícia fala do ataque, que um fato causou o
            outro, nem que existe perigo. Ela é uma <strong>pista para investigar</strong>, identificada
            automaticamente por coincidência de nomes — a conclusão é sempre de quem lê.
          </p>
        </div>
        <Link to="/correlacoes" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
          <Search size={14} aria-hidden="true" /> Ver as correlações encontradas agora
        </Link>
      </section>

      <h2 className="pt-2 text-sm font-bold uppercase tracking-wider muted">A régua exata de cada escala</h2>

      <DataState loading={r.loading} error={r.error} empty={!r.loading && !m} onRetry={r.refetch}>
        {m && (
          <>
            <Secao
              icon={AlertTriangle}
              titulo="Urgência de uma notícia"
              simples="É o quanto a notícia pede atenção AGORA. Sai das palavras que o jornalista usou no título: “ataque” e “morte” pesam mais que “acordo” e “visita”."
              onde="Aparece como etiqueta colorida em cada matéria do Clipping, da busca e da pasta."
            >
              <div className="space-y-2">
                {(m.urgencia?.niveis || []).map((n) => (
                  <div key={n.nivel} className="flex flex-col gap-1.5 rounded-lg bg-gray-500/5 p-3 sm:flex-row sm:items-center sm:gap-3 dark:bg-white/5">
                    <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${urgencyMeta[n.nivel]?.classes || ''}`}>
                      {urgencyMeta[n.nivel]?.label || n.nivel}
                    </span>
                    <p className="min-w-0 text-sm text-gray-700 dark:text-gray-300">
                      {n.exemplos?.length
                        ? <>Palavras como <em>{PALAVRAS[n.nivel] || n.exemplos.slice(0, 6).join(', ')}</em>{' '}
                          <span className="muted">({n.termos} no total)</span></>
                        : 'Nenhuma das palavras acima aparece no texto.'}
                    </p>
                  </div>
                ))}
              </div>
              <Regra texto={m.urgencia?.regra} />
              <NaoQuerDizer texto={m.urgencia?.ressalva} />
            </Secao>

            <Secao
              icon={ShieldAlert}
              titulo="Criticidade de um ataque cibernético"
              simples="Quando um grupo criminoso divulga que atacou uma organização, a plataforma pergunta: o quanto isso importa para o Brasil? Um ministério pesa mais que uma loja."
              onde="Aparece em Incidentes no Brasil e na página de cada país."
            >
              <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">{m.criticidade?.pergunta}</p>
              <div className="space-y-2">
                {(m.criticidade?.degraus || []).map((d) => (
                  <div key={d.nivel} className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${urgencyMeta[d.nivel]?.classes || ''}`}>
                      {urgencyMeta[d.nivel]?.label || d.nivel}
                    </span>
                    <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{d.criterio}</p>
                    {d.exemplos?.length > 0 && (
                      <p className="mt-1 text-xs muted">{d.exemplos.join(' · ')}</p>
                    )}
                  </div>
                ))}
              </div>
              {m.criticidade?.foraDaConta?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold">O que fica de fora da conta, de propósito</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {m.criticidade.foraDaConta.map((t) => (
                      <li key={t} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <XCircle size={15} className="mt-0.5 shrink-0 text-gray-400" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <NaoQuerDizer texto={m.criticidade?.ressalva} />
            </Secao>

            <Secao
              icon={Activity}
              titulo="Nível de alerta do período"
              simples="Um número de 0 a 100 que resume o quanto o período foi agitado. É a média das urgências de todas as matérias aprovadas — não de uma seleção."
              onde="Aparece no Painel, na faixa de indicadores do topo e no modo apresentação."
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(m.alerta?.faixas || []).map((f) => (
                  <div key={f.nivel} className="rounded-lg bg-gray-500/5 p-3 text-center dark:bg-white/5">
                    <p className="font-mono text-sm font-bold tabular-nums">{f.de}–{f.ate}</p>
                    <p className="mt-0.5 text-xs font-semibold">{f.rotulo}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                Cada matéria entra na média com um peso:{' '}
                {Object.entries(m.alerta?.pesos || {}).map(([k, v], i, arr) => (
                  <span key={k}>
                    <strong>{urgencyMeta[k]?.label || k}</strong> vale {v}{i < arr.length - 1 ? ', ' : '.'}
                  </span>
                ))}{' '}
                Dez matérias, metade críticas e metade baixas, dariam{' '}
                <strong className="font-mono">
                  {Math.round(((m.alerta?.pesos?.CRITICO ?? 0) + (m.alerta?.pesos?.BAIXO ?? 0)) / 2)}
                </strong>.
              </p>
              <Regra texto={m.alerta?.regra} />
              <NaoQuerDizer texto={m.alerta?.semDado} />
            </Secao>

            <Secao
              icon={Link2}
              titulo="Força de uma correlação (1 a 5)"
              simples="A plataforma liga uma notícia a um ataque já registrado quando encontra o MESMO nome, o mesmo endereço de site ou a mesma cidade. A força diz o quanto essa ligação é firme: 5 é o mesmo endereço; 2 é só o mesmo setor."
              onde="Aparece na tela de Correlações e nos cartões de matéria com ligação."
            >
              <div className="space-y-2">
                {(m.correlacao?.regras || []).slice().sort((a, b) => b.forca - a.forca).map((g) => (
                  <div key={g.id} className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{g.titulo}</p>
                      <span className="shrink-0 rounded-full bg-gold-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-gold-700 dark:text-gold-300">
                        força {g.forca}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{g.criterio}</p>
                  </div>
                ))}
              </div>
              {m.correlacao?.guardas?.length > 0 && (
                <Recolhivel titulo="As travas contra ligação errada">
                  <ul className="space-y-2">
                    {m.correlacao.guardas.map((t) => (
                      <li key={t} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Recolhivel>
              )}
              <NaoQuerDizer texto={m.correlacao?.ressalva} />
            </Secao>

            <Secao
              icon={Filter}
              titulo="O filtro: por que uma notícia entra ou não"
              simples="As fontes publicam de tudo — futebol, celebridade, economia. Só entra no acervo o texto que tem palavra inequívoca de defesa, e ela precisa aparecer logo no começo."
              onde="Cada matéria guarda os termos que a aprovaram; o botão “por que está aqui?” mostra a decisão."
            >
              <Regra texto={m.relevancia?.regra} />
              <div className="mt-3 space-y-2">
                {(m.relevancia?.etapas || []).map((e) => (
                  <div key={e.titulo} className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                    <p className="text-sm font-semibold">{e.titulo}</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{e.texto}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs muted">
                {m.relevancia?.termosFortes} termos inequívocos · {m.relevancia?.termosFracos} ambíguos ·{' '}
                {m.relevancia?.exclusoes} exclusões
              </p>
            </Secao>

            <Secao
              icon={Layers}
              titulo="Por que a mesma notícia aparece uma vez só"
              simples="Cinco jornais cobrem o mesmo fato com títulos diferentes. A plataforma junta os cinco num evento só e mostra quantos veículos cobriram — porque isso é informação, e cinco linhas parecidas são ruído."
              onde="Clipping Diário, na visão por eventos."
            >
              <Regra texto={m.eventos?.regra} />
            </Secao>

            <Secao
              icon={Globe2}
              titulo="A lente do mundo e os teatros de conflito"
              simples="O filtro principal é sobre a defesa DO BRASIL. Para acompanhar guerras e a política de defesa de outros países existe uma segunda régua, que aprova segurança internacional em português e inglês."
              onde="Área Mundo & Conflitos."
            >
              <Regra texto={m.mundo?.regra} />
              {m.mundo?.teatros?.length > 0 && (
                <Recolhivel titulo={`Os ${m.mundo.teatros.length} teatros acompanhados`}>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {m.mundo.teatros.map((t) => (
                      <li key={t.id} className="rounded-lg bg-gray-500/5 p-2.5 dark:bg-white/5">
                        <p className="text-sm font-semibold">{t.nome}</p>
                        <p className="text-xs muted">{t.regiao}</p>
                      </li>
                    ))}
                  </ul>
                </Recolhivel>
              )}
              <NaoQuerDizer texto="Um teatro com zero matérias não está em paz: está sem cobertura no acervo do período." />
            </Secao>

            <Secao
              icon={Clock}
              titulo="De onde vem o dado, e de quanto em quanto tempo"
              simples="Um servidor lê as fontes sozinho, de tempos em tempos. Nada aqui é digitado à mão."
              onde="O painel do administrador mostra cada execução da coleta, com duração e erro."
            >
              <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                <li>• <strong>{m.coleta?.fontes}</strong> fontes cadastradas, sendo{' '}
                  <strong>{m.coleta?.fontesEmIngles}</strong> em inglês (marcadas <span className="chip text-[10px]">EN</span> nas telas).
                </li>
                <li>• Notícias: a cada <strong>{m.coleta?.intervaloMinutos} minutos</strong>.</li>
                <li>• Fontes que mudam devagar têm espaçamento próprio: Câmara e Banco Central a cada{' '}
                  {m.coleta?.cadenciaPorColetor?.camara} min, World Bank a cada{' '}
                  {Math.round((m.coleta?.cadenciaPorColetor?.worldbank || 0) / 60)} h.
                </li>
                <li>• Cobertura internacional fica <strong>{m.coleta?.retencaoMundoDias} dias</strong> no acervo,
                  menos o que alguém guardou na pasta.
                </li>
              </ul>
            </Secao>

            <div className="card border-l-4 border-gold-500 p-5">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                <Info size={18} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
                <span>{m.ressalvaGeral}</span>
              </p>
              <p className="mt-3 text-sm muted">
                Quer ver isto aplicado?{' '}
                <Link to="/clipping" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
                  Abra o Clipping
                </Link>{' '}
                e clique em “por que está aqui?” numa matéria, ou veja a{' '}
                <Link to="/privacidade" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
                  política de privacidade
                </Link>{' '}
                para saber que dados a plataforma guarda sobre você.
              </p>
            </div>
          </>
        )}
      </DataState>
    </div>
  )
}

/** Um bloco: o que é em linguagem simples, onde aparece, e a régua. */
function Secao({ icon: Icon, titulo, simples, onde, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <Icon size={19} className="shrink-0 text-brand-400 dark:text-brand-300" />
        {titulo}
      </h2>
      <p className="mt-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
        <strong>Em palavras simples:</strong> {simples}
      </p>
      {onde && <p className="mt-2 text-xs muted"><strong>Onde você vê isso:</strong> {onde}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Regra({ texto }) {
  if (!texto) return null
  return (
    <p className="mt-3 border-l-2 border-gray-300 pl-3 text-sm leading-relaxed text-gray-700 dark:border-gray-600 dark:text-gray-300">
      <strong>A regra exata:</strong> {texto}
    </p>
  )
}

function NaoQuerDizer({ texto }) {
  if (!texto) return null
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-500/5 p-3 text-sm leading-relaxed muted dark:bg-white/5">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span><strong>O que isso NÃO quer dizer:</strong> {texto}</span>
    </p>
  )
}

/** Detalhe técnico que não pode atrapalhar quem só quer o essencial. */
function Recolhivel({ titulo, children }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mt-3">
      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-500/5 px-3 py-2 text-left text-sm font-semibold hover:bg-gray-500/10 dark:bg-white/5 dark:hover:bg-white/10"
      >
        {titulo}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && <div className="mt-2">{children}</div>}
    </div>
  )
}
