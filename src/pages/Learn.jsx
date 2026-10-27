import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Brain, Search, Shield, Globe2, LineChart, Cpu, ArrowRight,
  PlayCircle, Compass, Anchor, ShieldAlert, FileText, ExternalLink, Library, CheckCircle2, Circle, RotateCcw,
  BellRing, Link2, Lock, Scale } from 'lucide-react'
import Quiz from '../components/learn/Quiz'
import PageHeader from '../components/ui/PageHeader'
import {
  glossary, glossaryCategories, learnConcepts,
  videoLessons, learningPaths, structuringDocs,
} from '../data/learnData'
import { normalize } from '../utils/semanticSearch'

const ICONS = { Shield, Globe2, LineChart, Cpu, BellRing, Link2, Lock }
const PATH_ICONS = { Compass, Anchor, ShieldAlert, Scale }
// Com contraste nos dois temas: o `-300` sozinho sumia no fundo claro.
const LEVEL_CLR = {
  'Básico': 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  'Iniciante': 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  'Intermediário': 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  'Avançado': 'bg-red-500/15 text-red-800 dark:text-red-300',
}

// Quantos termos o glossário mostra antes de "Mostrar todos" (sem busca ativa).
const GLOSSARIO_INICIAL = 12

// Seções da página, na ordem em que aparecem — alimentam o "Nesta página".
const SECOES = [
  { id: 'trilhas', rotulo: 'Trilhas de estudo' },
  { id: 'conceitos', rotulo: 'Conceitos-chave' },
  { id: 'glossario', rotulo: 'Glossário' },
  { id: 'documentos', rotulo: 'Documentos oficiais' },
  { id: 'quiz', rotulo: 'Quiz' },
  { id: 'videos', rotulo: 'Para assistir' },
]

// O roteador usa hash (#/aprender), então a âncora rola via JS em vez de href.
function irPara(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function TituloSecao({ id, icon: Icon, children, descricao }) {
  return (
    <div className="mb-4">
      <h2 id={`titulo-${id}`} className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={20} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> {children}
      </h2>
      {descricao && <p className="mt-1 text-sm muted">{descricao}</p>}
    </div>
  )
}

// -----------------------------------------------------------------------------
// PROGRESSO DAS TRILHAS
//
// Guardado no navegador: aprender é um processo com continuidade, e perder a
// marcação a cada visita torna a trilha inútil. Chave própria, para não colidir
// com o estado das lojas do produto.
// -----------------------------------------------------------------------------
const PROGRESS_KEY = 'defesabr-learn-progress'

function useLearnProgress() {
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(done))
    } catch {
      /* modo privado: o progresso vale apenas para esta sessão */
    }
  }, [done])

  const toggle = useCallback((pathTitle, stepIndex) => {
    setDone((prev) => {
      const steps = prev[pathTitle] || []
      const next = steps.includes(stepIndex)
        ? steps.filter((i) => i !== stepIndex)
        : [...steps, stepIndex]
      return { ...prev, [pathTitle]: next }
    })
  }, [])

  const reset = useCallback((pathTitle) => {
    setDone((prev) => ({ ...prev, [pathTitle]: [] }))
  }, [])

  return { done, toggle, reset }
}

export default function Learn() {
  const progress = useLearnProgress()
  // `?termo=` chega da busca global: o glossário abre já filtrado no termo,
  // em vez de deixar o leitor no topo da página procurando de novo.
  const [params] = useSearchParams()
  const termoInicial = params.get('termo') || ''
  const [q, setQ] = useState(termoInicial)
  const [cat, setCat] = useState('')
  const [verTodos, setVerTodos] = useState(false)

  useEffect(() => {
    if (!termoInicial) return
    setQ(termoInicial)
    document.getElementById('glossario')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [termoInicial])

  const terms = useMemo(() => {
    const nq = normalize(q)
    return glossary.filter((g) => {
      const matchCat = !cat || g.category === cat
      const matchQ = !nq || normalize(`${g.term} ${g.definition}`).includes(nq)
      return matchCat && matchQ
    })
  }, [q, cat])

  const filtrando = Boolean(q.trim() || cat)
  const termosVisiveis = filtrando || verTodos ? terms : terms.slice(0, GLOSSARIO_INICIAL)

  return (
    <div className="space-y-10">
      <PageHeader
        icon={GraduationCap}
        title="Centro Educacional"
        description="Comece do zero: trilhas de estudo, conceitos-chave, um glossário de termos e siglas, documentos oficiais e um quiz para testar o que aprendeu."
        breadcrumb={[{ label: 'Ajuda e método' }, { label: 'Centro Educacional' }]}
      >
        <nav aria-label="Nesta página" className="flex flex-wrap gap-2">
          {SECOES.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={(e) => { e.preventDefault(); irPara(sec.id) }}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              {sec.rotulo}
            </a>
          ))}
        </nav>
      </PageHeader>

      {/* TRILHAS DE ESTUDO */}
      <section id="trilhas" className="scroll-mt-24" aria-labelledby="titulo-trilhas">
        <TituloSecao id="trilhas" icon={Compass} descricao="Caminhos guiados por nível. Marque os passos que já concluiu: o progresso fica salvo neste navegador.">
          Trilhas de estudo
        </TituloSecao>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {learningPaths.map((p, i) => {
            const Icon = PATH_ICONS[p.icon] || Compass
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card flex flex-col p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${p.color}22`, color: p.color }} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLR[p.level] || 'bg-white/10'}`}>{p.level}</span>
                </div>
                <h3 className="mt-3 font-bold tracking-tight">{p.title}</h3>
                <p className="mt-1 text-sm muted">{p.summary}</p>
                <ol className="mt-3 space-y-1 text-sm">
                  {p.steps.map((step, j) => {
                    const checked = (progress.done[p.title] || []).includes(j)
                    return (
                      <li key={step}>
                        <button
                          type="button"
                          onClick={() => progress.toggle(p.title, j)}
                          aria-pressed={checked}
                          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                          {checked
                            ? <CheckCircle2 size={16} className="shrink-0" style={{ color: p.color }} aria-hidden="true" />
                            : <Circle size={16} className="shrink-0 text-gray-400" aria-hidden="true" />}
                          <span className={checked ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                            {step}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>

                {/* Progresso da trilha */}
                {(() => {
                  const doneCount = (progress.done[p.title] || []).length
                  const pct = Math.round((doneCount / p.steps.length) * 100)
                  return (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="muted">{doneCount} de {p.steps.length} concluídos</span>
                        <span className="font-mono font-bold tabular-nums text-gray-800 dark:text-gray-200">{pct}%</span>
                      </div>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                      </span>
                    </div>
                  )
                })()}

                {(progress.done[p.title] || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => progress.reset(p.title)}
                    className="mt-3 inline-flex items-center gap-1 self-end text-[11px] font-semibold muted hover:text-brand-500 dark:hover:text-brand-300"
                    aria-label={`Reiniciar progresso da trilha ${p.title}`}
                  >
                    <RotateCcw size={11} aria-hidden="true" /> Reiniciar
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* CONCEITOS */}
      <section id="conceitos" className="scroll-mt-24" aria-labelledby="titulo-conceitos">
        <TituloSecao id="conceitos" icon={BookOpen} descricao="As ideias básicas para entender o que a plataforma mostra.">
          Conceitos-chave
        </TituloSecao>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {learnConcepts.map((c, i) => {
            const Icon = ICONS[c.icon] || BookOpen
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card p-5"
              >
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 dark:text-brand-300" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h3 className="font-bold tracking-tight">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{c.text}</p>
                {c.link && (
                  <Link to={c.link} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                    Saiba mais<span className="sr-only"> sobre {c.title.toLowerCase()}</span> <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* GLOSSÁRIO */}
      <section id="glossario" className="scroll-mt-24" aria-labelledby="titulo-glossario">
        <TituloSecao id="glossario" icon={Search} descricao={`${glossary.length} termos e siglas do setor, explicados em poucas palavras. Busque ou filtre por categoria.`}>
          Glossário de termos e siglas
        </TituloSecao>
        <div className="card mb-4 space-y-3 p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar termo ou sigla (ex.: SISFRON, dissuasão)…"
              aria-label="Buscar termo no glossário"
              className="input pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
            <button
              type="button"
              onClick={() => setCat('')}
              aria-pressed={cat === ''}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${cat === '' ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600/50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'}`}
            >
              Todas
            </button>
            {glossaryCategories.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCat(c === cat ? '' : c)}
                aria-pressed={cat === c}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${cat === c ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600/50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {terms.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Search size={28} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <p className="font-semibold" role="status">Nenhum termo encontrado</p>
            <p className="text-sm muted">Tente outra palavra ou remova o filtro de categoria.</p>
            {filtrando && (
              <button type="button" onClick={() => { setQ(''); setCat('') }} className="btn-ghost mt-1 text-sm">
                Limpar busca e filtro
              </button>
            )}
          </div>
        ) : (
          <>
            {filtrando && (
              <p className="mb-3 text-xs muted" role="status">
                {terms.length === 1 ? '1 termo encontrado' : `${terms.length} termos encontrados`}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {termosVisiveis.map((g) => (
                <div key={g.term} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold tracking-tight">{g.term}</h3>
                    <span className="shrink-0 rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{g.category}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{g.definition}</p>
                </div>
              ))}
            </div>
            {!filtrando && terms.length > GLOSSARIO_INICIAL && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setVerTodos((v) => !v)} className="btn-ghost text-sm" aria-expanded={verTodos}>
                  {verTodos ? 'Mostrar menos termos' : `Mostrar todos os ${terms.length} termos`}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* BIBLIOTECA DE DOCUMENTOS ESTRUTURANTES */}
      <section id="documentos" className="scroll-mt-24" aria-labelledby="titulo-documentos">
        <TituloSecao id="documentos" icon={Library} descricao="Os documentos oficiais que orientam a Defesa Nacional. Cada um abre na fonte original, em nova aba.">
          Documentos oficiais
        </TituloSecao>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {structuringDocs.map((d) => (
            <a key={d.sigla} href={d.url} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-5 transition-colors hover:border-brand-500/40">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300" aria-hidden="true">
                <FileText size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold tracking-tight">{d.sigla}</h3>
                  <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{d.tier}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.title}</p>
                <p className="mt-1 text-sm muted">{d.desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">Abrir documento <ExternalLink size={12} aria-hidden="true" /><span className="sr-only">(abre em nova aba)</span></span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* QUIZ */}
      <section id="quiz" className="scroll-mt-24" aria-labelledby="titulo-quiz">
        <TituloSecao id="quiz" icon={Brain} descricao="Escolha uma trilha, responda às perguntas e tente bater seu recorde.">
          Teste seus conhecimentos
        </TituloSecao>
        <Quiz />
      </section>

      {/* PARA ASSISTIR — buscas externas, por isso por último */}
      <section id="videos" className="scroll-mt-24" aria-labelledby="titulo-videos">
        <TituloSecao id="videos" icon={PlayCircle} descricao="Buscas sugeridas no YouTube, uma por tema. Abrem em nova aba; os resultados são do YouTube, não uma seleção desta plataforma.">
          Para assistir
        </TituloSecao>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videoLessons.map((v) => (
            <li key={v.title}>
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="card group flex h-full items-start gap-3 p-4 transition-colors hover:border-brand-500/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 dark:text-brand-300" aria-hidden="true">
                  <PlayCircle size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLR[v.level] || 'bg-gray-500/10'}`}>{v.level}</span>
                  <span className="mt-1.5 font-bold leading-snug tracking-tight">{v.title}</span>
                  <span className="mt-1 flex-1 text-sm muted">{v.desc}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
                    {v.source} <ExternalLink size={12} aria-hidden="true" /><span className="sr-only">(abre em nova aba)</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>


      {/* CTA */}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-bold tracking-tight">Pronto para explorar dados reais?</h3>
          <p className="text-sm muted">Veja os indicadores e gráficos da plataforma em ação.</p>
        </div>
        <Link to="/dados" className="btn-primary shrink-0">
          Explorar dados <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
