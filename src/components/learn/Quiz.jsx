import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, Trophy, RotateCcw, Flame, ArrowRight, Layers } from 'lucide-react'
import { quizQuestions, quizCategories } from '../../data/learnData'

const BEST_KEY = 'defesabr-quiz-best'

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

const LEVEL_CLR = {
  'Básico': 'bg-emerald-500/15 text-emerald-300',
  'Intermediário': 'bg-amber-500/15 text-amber-300',
  'Avançado': 'bg-red-500/15 text-red-300',
}

export default function Quiz() {
  const [filter, setFilter] = useState('') // categoria selecionada ('' = todas)
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)
  const [best, setBest] = useState(loadBest)

  const questions = useMemo(
    () => (filter ? quizQuestions.filter((q) => q.category === filter) : quizQuestions),
    [filter]
  )

  const total = questions.length
  const q = questions[idx]
  const answered = picked !== null
  const correct = answered && q && picked === q.answer

  const start = (cat) => {
    setFilter(cat)
    setStarted(true)
    setIdx(0); setPicked(null); setScore(0); setStreak(0); setFinished(false)
  }

  const pick = (i) => {
    if (answered) return
    setPicked(i)
    if (i === q.answer) {
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
  }

  const next = () => {
    if (idx + 1 >= total) {
      if (score > best) {
        setBest(score)
        try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* ignore */ }
      }
      setFinished(true)
    } else {
      setIdx((i) => i + 1)
      setPicked(null)
    }
  }

  const restart = () => { setStarted(false); setFinished(false) }

  // TELA INICIAL — escolher trilha
  if (!started) {
    return (
      <div className="card p-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Layers size={16} className="text-brand-400" /> Escolha uma trilha
        </p>
        <p className="mt-1 text-sm muted">Responda por tema ou enfrente todas as {quizQuestions.length} questões.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => start('')} className="btn-primary">
            Todas as questões ({quizQuestions.length})
          </button>
          {quizCategories.map((c) => {
            const n = quizQuestions.filter((x) => x.category === c).length
            return (
              <button
                key={c}
                onClick={() => start(c)}
                className="rounded-lg border border-gray-600/50 px-3 py-2 text-sm font-semibold text-gray-300 hover:border-brand-500/50 hover:bg-white/5"
              >
                {c} <span className="muted">({n})</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (finished) {
    const pct = total ? Math.round((score / total) * 100) : 0
    const msg = pct >= 80 ? 'Excelente! Você domina o tema.' : pct >= 50 ? 'Bom trabalho — continue estudando!' : 'Continue praticando, você vai melhorar!'
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Trophy size={32} />
        </div>
        <h3 className="text-xl font-bold tracking-tight">Quiz concluído!</h3>
        <p className="mt-1 text-sm muted">{msg}{filter && <> · trilha <strong>{filter}</strong></>}</p>
        <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-3xl font-bold text-brand-400">{score}/{total}</p>
            <p className="text-xs muted">Sua pontuação</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-3xl font-bold text-amber-400">{best}</p>
            <p className="text-xs muted">Melhor recorde</p>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => start(filter)} className="btn-ghost">
            <RotateCcw size={16} /> Refazer trilha
          </button>
          <button onClick={restart} className="btn-primary">
            <Layers size={16} /> Outra trilha
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Progresso */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold muted">
          Pergunta {idx + 1} de {total}
          {q?.level && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLR[q.level] || 'bg-white/10'}`}>{q.level}</span>}
        </span>
        <span className="flex items-center gap-3">
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-400">
              <Flame size={15} /> {streak} seguidas
            </span>
          )}
          <span className="font-bold text-brand-400">{score} pts</span>
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-700/50">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      {/* Pergunta */}
      <h3 className="text-lg font-bold tracking-tight">{q.q}</h3>
      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer
          const isPicked = i === picked
          let cls = 'border-gray-600/50 hover:border-brand-500/50 hover:bg-white/5'
          if (answered && isAnswer) cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
          else if (answered && isPicked && !isAnswer) cls = 'border-red-500/60 bg-red-500/10 text-red-200'
          else if (answered) cls = 'border-gray-700/40 opacity-60'
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${cls}`}
            >
              <span>{opt}</span>
              {answered && isAnswer && <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
              {answered && isPicked && !isAnswer && <XCircle size={18} className="shrink-0 text-red-400" />}
            </button>
          )
        })}
      </div>

      {/* Explicação + avançar */}
      {answered && (
        <div className="mt-4 rounded-lg border-l-4 border-brand-500 bg-white/5 p-3 text-sm">
          <p className={`font-semibold ${correct ? 'text-emerald-300' : 'text-amber-300'}`}>
            {correct ? 'Correto!' : 'Quase lá.'}
          </p>
          <p className="mt-1 text-gray-300">{q.explain}</p>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <button onClick={restart} className="text-xs font-medium text-gray-400 hover:text-gray-200">Trocar trilha</button>
        {answered && (
          <button onClick={next} className="btn-primary">
            {idx + 1 >= total ? 'Ver resultado' : 'Próxima'} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
