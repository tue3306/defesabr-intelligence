import { useState } from 'react'
import { CheckCircle2, XCircle, Trophy, RotateCcw, Flame, ArrowRight, Layers, Shuffle, BookOpen } from 'lucide-react'
import { quizQuestions, quizCategories } from '../../data/learnData'

// O RECORDE É POR TRILHA. Era um número só para todas: acertar 25 de 30 em
// "Todas as questões" deixava "Melhor recorde 25" na tela de uma trilha de
// quatro perguntas, impossível de alcançar e sem sentido ao lado de "3/4".
const BEST_KEY = 'defesabr-quiz-recordes'

/** Quantas perguntas tem a rodada rápida. */
const RAPIDA = 10

function loadBests() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

// Cores com contraste nos dois temas: o `-300` sozinho sumia no fundo claro.
const LEVEL_CLR = {
  'Básico': 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  'Intermediário': 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  'Avançado': 'bg-red-500/15 text-red-800 dark:text-red-300',
}

/** Fisher–Yates: cópia embaralhada, sem tocar na original. */
function embaralhar(lista) {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// -----------------------------------------------------------------------------
// A RODADA É MONTADA NO CLIQUE DE INÍCIO
//
// As perguntas vinham sempre na mesma ordem e com as alternativas no mesmo
// lugar: na segunda tentativa, a pessoa lembrava a POSIÇÃO da resposta, não a
// resposta. E nas questões novas a certa é sempre a primeira no arquivo — sem
// embaralhar, o quiz seria "clique na primeira".
//
// Cada rodada guarda, por pergunta, a ordem em que as alternativas aparecem.
// A resposta escolhida é registrada pelo índice ORIGINAL, e é contra ele que
// a conferência é feita.
// -----------------------------------------------------------------------------
function montarRodada(trilha) {
  const base = trilha === 'rapida'
    ? embaralhar(quizQuestions).slice(0, RAPIDA)
    : trilha ? quizQuestions.filter((q) => q.category === trilha) : quizQuestions
  return base.map((q) => ({ ...q, ordem: embaralhar(q.options.map((_, i) => i)) }))
}

const nomeDaTrilha = (t) => (t === 'rapida' ? 'Rodada rápida' : t || 'Todas as questões')

export default function Quiz() {
  const [trilha, setTrilha] = useState(null) // null = tela inicial
  const [rodada, setRodada] = useState([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [erros, setErros] = useState([])
  const [finished, setFinished] = useState(false)
  const [bests, setBests] = useState(loadBests)
  const chaveTrilha = trilha || 'todas'
  const best = bests[chaveTrilha] || 0

  const total = rodada.length
  const q = rodada[idx]
  const answered = picked !== null
  const correct = answered && q && picked === q.answer

  const start = (t) => {
    setTrilha(t)
    setRodada(montarRodada(t))
    setIdx(0); setPicked(null); setScore(0); setStreak(0); setErros([]); setFinished(false)
  }

  const pick = (original) => {
    if (answered) return
    setPicked(original)
    if (original === q.answer) {
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
      setErros((e) => [...e, q])
    }
  }

  const next = () => {
    if (idx + 1 >= total) {
      if (score > best) {
        const novos = { ...bests, [chaveTrilha]: score }
        setBests(novos)
        try { localStorage.setItem(BEST_KEY, JSON.stringify(novos)) } catch { /* modo privado */ }
      }
      setFinished(true)
    } else {
      setIdx((i) => i + 1)
      setPicked(null)
    }
  }

  const restart = () => { setTrilha(null); setFinished(false) }

  // TELA INICIAL — escolher trilha
  if (trilha === null) {
    return (
      <div className="card p-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Layers size={16} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Escolha uma trilha
        </p>
        <p className="mt-1 text-sm muted">
          {quizQuestions.length} questões em {quizCategories.length} temas. Cada resposta vem com a explicação;
          no fim, você vê o que errou para revisar.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => start('rapida')} className="btn-primary">
            <Shuffle size={15} aria-hidden="true" /> Rodada rápida ({RAPIDA} sorteadas)
          </button>
          <button onClick={() => start('')} className="btn-ghost">
            Todas as questões ({quizQuestions.length})
          </button>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider muted">Por tema</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {quizCategories.map((c) => {
            const n = quizQuestions.filter((x) => x.category === c).length
            return (
              <button
                key={c}
                onClick={() => start(c)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand-500/50 hover:bg-gray-100 dark:border-gray-600/50 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {c} <span className="muted">({n})</span>
                {bests[c] ? <span className="ml-1 text-[11px] font-normal muted">· recorde {bests[c]}/{n}</span> : null}
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
      <div className="card p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Trophy size={32} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Quiz concluído!</h3>
          <p className="mt-1 text-sm muted">{msg} · <strong>{nomeDaTrilha(trilha)}</strong></p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-500/5 p-4 dark:bg-white/5">
              <p className="text-3xl font-bold text-brand-400 dark:text-brand-300">{score}/{total}</p>
              <p className="text-xs muted">Sua pontuação</p>
            </div>
            <div className="rounded-xl bg-gray-500/5 p-4 dark:bg-white/5">
              <p className="text-3xl font-bold">{pct}%</p>
              <p className="text-xs muted">de acerto</p>
            </div>
            <div className="rounded-xl bg-gray-500/5 p-4 dark:bg-white/5">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{Math.max(best, score)}/{total}</p>
              <p className="text-xs muted">Recorde</p>
            </div>
          </div>
        </div>

        {erros.length > 0 && (
          <div className="mt-6">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <BookOpen size={15} aria-hidden="true" /> Para revisar ({erros.length})
            </h4>
            <ul className="mt-2 space-y-2">
              {erros.map((e) => (
                <li key={e.q} className="rounded-lg bg-gray-500/5 p-3 text-sm dark:bg-white/5">
                  <p className="font-semibold">{e.q}</p>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 size={13} className="mr-1 inline" aria-hidden="true" />
                    Resposta certa: {e.options[e.answer]}
                  </p>
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{e.explain}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => start(trilha)} className="btn-ghost">
            <RotateCcw size={16} aria-hidden="true" /> {trilha === 'rapida' ? 'Nova rodada rápida' : 'Refazer trilha'}
          </button>
          <button onClick={restart} className="btn-primary">
            <Layers size={16} aria-hidden="true" /> Outra trilha
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Progresso */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold muted">
          Pergunta {idx + 1} de {total}
          {q?.level && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLR[q.level] || 'bg-gray-500/10'}`}>{q.level}</span>}
          {q?.category && <span className="text-[11px] font-normal">· {q.category}</span>}
        </span>
        <span className="flex items-center gap-3">
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <Flame size={15} aria-hidden="true" /> {streak} seguidas
            </span>
          )}
          <span className="font-bold text-brand-400 dark:text-brand-300">{score} pts</span>
        </span>
      </div>
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/50"
        role="progressbar"
        aria-label="Progresso no quiz"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={idx + (answered ? 1 : 0)}
      >
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      {/* Pergunta */}
      <h3 className="text-lg font-bold tracking-tight">{q.q}</h3>
      <div className="mt-4 space-y-2" role="group" aria-label="Alternativas">
        {q.ordem.map((original, pos) => {
          const opt = q.options[original]
          const isAnswer = original === q.answer
          const isPicked = original === picked
          let cls = 'border-gray-300 hover:border-brand-500/50 hover:bg-gray-50 dark:border-gray-600/50 dark:hover:bg-white/5'
          if (answered && isAnswer) cls = 'border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/60 dark:text-emerald-200'
          else if (answered && isPicked && !isAnswer) cls = 'border-red-600 bg-red-500/10 text-red-900 dark:border-red-500/60 dark:text-red-200'
          else if (answered) cls = 'border-gray-200 opacity-60 dark:border-gray-700/40'
          return (
            <button
              key={original}
              onClick={() => pick(original)}
              disabled={answered}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${cls}`}
            >
              <span>
                <span className="mr-2 font-mono text-xs muted">{String.fromCharCode(65 + pos)})</span>
                {opt}
              </span>
              {/* Ícone E texto: verde e vermelho sozinhos não chegam a quem
                  não distingue as duas cores. */}
              {answered && isAnswer && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={18} aria-hidden="true" /> certa
                </span>
              )}
              {answered && isPicked && !isAnswer && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300">
                  <XCircle size={18} aria-hidden="true" /> sua resposta
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Explicação + avançar */}
      <div aria-live="polite">
        {answered && (
          <div className="mt-4 rounded-lg border-l-4 border-brand-500 bg-gray-500/5 p-3 text-sm dark:bg-white/5">
            <p className={`flex items-center gap-1.5 font-semibold ${correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {correct ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
              {correct ? 'Correto!' : `Quase lá — a resposta é: ${q.options[q.answer]}`}
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{q.explain}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button onClick={restart} className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Trocar trilha</button>
        {answered && (
          <button onClick={next} className="btn-primary">
            {idx + 1 >= total ? 'Ver resultado' : 'Próxima'} <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
