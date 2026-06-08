import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Brain, Search, Shield, Globe2, LineChart, Cpu, ArrowRight,
  PlayCircle, Clock, Compass, Anchor, ShieldAlert, FileText, ExternalLink, Library,
} from 'lucide-react'
import Quiz from '../components/learn/Quiz'
import {
  glossary, glossaryCategories, learnConcepts,
  videoLessons, learningPaths, structuringDocs,
} from '../data/learnData'
import { normalize } from '../utils/semanticSearch'

const ICONS = { Shield, Globe2, LineChart, Cpu }
const PATH_ICONS = { Compass, Anchor, ShieldAlert }
const LEVEL_CLR = {
  'Básico': 'bg-emerald-500/15 text-emerald-300',
  'Iniciante': 'bg-emerald-500/15 text-emerald-300',
  'Intermediário': 'bg-amber-500/15 text-amber-300',
  'Avançado': 'bg-red-500/15 text-red-300',
}

export default function Learn() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  const terms = useMemo(() => {
    const nq = normalize(q)
    return glossary.filter((g) => {
      const matchCat = !cat || g.category === cat
      const matchQ = !nq || normalize(`${g.term} ${g.definition}`).includes(nq)
      return matchCat && matchQ
    })
  }, [q, cat])

  return (
    <div className="space-y-10">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="on-dark bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <GraduationCap size={14} /> Centro Educacional
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Aprenda sobre Defesa e Inteligência</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            Trilhas guiadas, vídeo-aulas, glossário pesquisável, biblioteca oficial e um quiz interativo.
            Comece do zero e entenda como ler os dados da plataforma.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[`${glossary.length} termos`, `${videoLessons.length} vídeo-aulas`, `${learningPaths.length} trilhas`, 'Quiz por tema'].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1 font-semibold text-gray-200">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* TRILHAS DE ESTUDO */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Compass size={20} className="text-brand-400" /> Trilhas de estudo
        </h2>
        <p className="mb-4 text-sm muted">Caminhos guiados por nível — siga a ordem sugerida.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${p.color}22`, color: p.color }}>
                    <Icon size={20} />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLR[p.level] || 'bg-white/10'}`}>{p.level}</span>
                </div>
                <h3 className="mt-3 font-bold tracking-tight">{p.title}</h3>
                <p className="mt-1 text-sm muted">{p.summary}</p>
                <ol className="mt-3 space-y-1.5 text-sm">
                  {p.steps.map((s, j) => (
                    <li key={s} className="flex items-center gap-2 text-gray-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-brand-300">{j + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 flex items-center gap-1.5 text-xs muted"><Clock size={12} /> {p.duration}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* CONCEITOS */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <BookOpen size={20} className="text-brand-400" /> Conceitos-chave
        </h2>
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
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Icon size={20} />
                </span>
                <h3 className="font-bold tracking-tight">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{c.text}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* VÍDEO-AULAS */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <PlayCircle size={20} className="text-brand-400" /> Vídeo-aulas
        </h2>
        <p className="mb-4 text-sm muted">Materiais em vídeo de canais oficiais e educacionais (abre em nova aba).</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videoLessons.map((v) => (
            <a
              key={v.title}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="card group flex flex-col p-5 transition-colors hover:border-brand-500/40"
            >
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-military-darker to-brand-900/40 text-brand-300">
                <PlayCircle size={40} className="transition-transform group-hover:scale-110" />
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-bold ${LEVEL_CLR[v.level] || 'bg-white/10'}`}>{v.level}</span>
                <span className="inline-flex items-center gap-1 muted"><Clock size={11} /> {v.duration}</span>
              </div>
              <h3 className="mt-2 font-bold leading-snug tracking-tight">{v.title}</h3>
              <p className="mt-1 flex-1 text-sm muted">{v.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-400">
                {v.source} <ExternalLink size={12} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* GLOSSÁRIO */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Search size={20} className="text-brand-400" /> Glossário de termos e siglas ({terms.length})
        </h2>
        <div className="card mb-4 space-y-3 p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar termo ou sigla (ex.: SISFRON, dissuasão)…"
              aria-label="Buscar termo no glossário"
              className="input pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCat('')}
              aria-pressed={cat === ''}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${cat === '' ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'}`}
            >
              Todas
            </button>
            {glossaryCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c === cat ? '' : c)}
                aria-pressed={cat === c}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${cat === c ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {terms.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Search size={28} className="text-gray-500" />
            <p className="font-semibold">Nenhum termo encontrado</p>
            <p className="text-sm muted">Tente outra palavra ou remova o filtro de categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {terms.map((g) => (
              <div key={g.term} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold tracking-tight">{g.term}</h3>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{g.category}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{g.definition}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BIBLIOTECA DE DOCUMENTOS ESTRUTURANTES */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Library size={20} className="text-brand-400" /> Biblioteca — documentos estruturantes
        </h2>
        <p className="mb-4 text-sm muted">Os pilares oficiais que orientam a Defesa Nacional. Clique para abrir a fonte.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {structuringDocs.map((d) => (
            <a key={d.sigla} href={d.url} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-5 transition-colors hover:border-brand-500/40">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                <FileText size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold tracking-tight">{d.sigla}</h3>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{d.tier}</span>
                </div>
                <p className="text-sm font-medium text-gray-200">{d.title}</p>
                <p className="mt-1 text-sm muted">{d.desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-400">Abrir documento <ExternalLink size={12} /></span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* QUIZ */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Brain size={20} className="text-brand-400" /> Teste seus conhecimentos
        </h2>
        <p className="mb-4 text-sm muted">Escolha uma trilha, responda e bata seu recorde.</p>
        <Quiz />
      </section>

      {/* CTA */}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-bold tracking-tight">Pronto para explorar dados reais?</h3>
          <p className="text-sm muted">Veja os indicadores e gráficos da plataforma em ação.</p>
        </div>
        <Link to="/dados" className="btn-primary shrink-0">
          Explorar dados <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
