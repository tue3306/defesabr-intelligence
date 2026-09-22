import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Scale, AlertTriangle, ShieldAlert, Activity, Link2, Filter, Layers, Globe2, Clock,
  ChevronDown, Info, CheckCircle2, XCircle,
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

export default function Methodology() {
  const r = useResource(() => request('GET /metodo'), [])
  const m = r.data

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
                        ? <>Palavras como <em>{n.exemplos.slice(0, 6).join(', ')}</em>{' '}
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
