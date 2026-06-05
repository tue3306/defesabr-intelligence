import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, BookOpen, Brain, Search, Shield, Globe2, LineChart, Cpu, ArrowRight } from 'lucide-react'
import Quiz from '../components/learn/Quiz'
import { glossary, glossaryCategories, learnConcepts } from '../data/learnData'
import { normalize } from '../utils/semanticSearch'

const ICONS = { Shield, Globe2, LineChart, Cpu }

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
    <div className="space-y-8">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <GraduationCap size={14} /> Centro Educacional
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Aprenda sobre Defesa e Inteligência</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            Conceitos, glossário e um quiz interativo para estudantes, pesquisadores e curiosos. Comece do
            zero e entenda como ler os dados da plataforma.
          </p>
        </div>
      </div>

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

      {/* GLOSSÁRIO */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Search size={20} className="text-brand-400" /> Glossário ({terms.length})
        </h2>
        <div className="card mb-4 space-y-3 p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar um termo…"
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
          <div className="card p-8 text-center muted">Nenhum termo encontrado.</div>
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

      {/* QUIZ */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Brain size={20} className="text-brand-400" /> Teste seus conhecimentos
        </h2>
        <p className="mb-4 text-sm muted">Responda ao quiz, acumule pontos e bata seu recorde.</p>
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
