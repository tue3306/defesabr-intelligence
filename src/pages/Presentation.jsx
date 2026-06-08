import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import GaugeChart from '../components/charts/GaugeChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import SentimentChart from '../components/charts/SentimentChart'
import {
  militarySpendingBR, newsVolume14d, newsCategoriesKeys, alertIndex,
  southAmericaSpending, globalSpendingTreemap, categoryRadar,
} from '../data/mockData'
import { formatTime, formatFullDate } from '../utils/dateUtils'

const SLIDES = [
  { title: 'Gastos militares — Brasil', render: (h) => <MilitarySpendingChart data={militarySpendingBR} mode="dual" height={h} /> },
  { title: 'Gastos militares globais (US$ bi)', render: (h) => <BrazilDefenseBudget data={globalSpendingTreemap} height={h} /> },
  { title: 'América do Sul — % do PIB em defesa', render: (h) => <ComparisonBarChart data={southAmericaSpending} highlightCode="BR" height={h} /> },
  { title: 'Volume de notícias — 14 dias', render: (h) => <NewsVolumeChart data={newsVolume14d} keys={newsCategoriesKeys} height={h} /> },
  { title: 'Volume por categoria — semana', render: (h) => <SentimentChart data={categoryRadar} height={h} /> },
  { title: 'Índice de alerta nacional', render: (h) => <GaugeChart value={alertIndex} height={h} /> },
  { title: 'Mapa de calor de risco — foco Américas', render: (h) => <GlobalHeatmap height={h} withNews={false} /> },
]

const AUTOPLAY_MS = 9000

// Altura do gráfico conforme a largura da tela (mobile-first).
function chartHeightFor(width) {
  if (width < 640) return 260
  if (width < 1024) return 360
  return 440
}

export default function Presentation() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [now, setNow] = useState(formatTime())
  const [chartH, setChartH] = useState(() =>
    chartHeightFor(typeof window !== 'undefined' ? window.innerWidth : 1280)
  )

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), [])
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), [])

  // Relógio
  useEffect(() => {
    const clk = setInterval(() => setNow(formatTime()), 1000)
    return () => clearInterval(clk)
  }, [])

  // Altura responsiva
  useEffect(() => {
    const onResize = () => setChartH(chartHeightFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Autoplay (reinicia o timer quando o slide muda ou ao pausar/retomar)
  useEffect(() => {
    if (!playing) return
    const rot = setInterval(next, AUTOPLAY_MS)
    return () => clearInterval(rot)
  }, [playing, index, next])

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const slide = SLIDES[index]

  return (
    <div className="on-dark flex min-h-screen flex-col bg-military-darker p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 sm:h-11 sm:w-11">
            <Shield size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-2xl">
              DefesaBR Intelligence
            </h1>
            <p className="truncate text-xs muted sm:text-sm">{formatFullDate()}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-mono text-2xl font-bold text-brand-400 sm:text-3xl">{now}</span>
          <Link
            to="/"
            className="rounded-lg border border-gray-600/50 p-2 text-gray-400 hover:text-white"
            aria-label="Sair da apresentação"
          >
            <X size={20} />
          </Link>
        </div>
      </header>

      {/* SLIDE */}
      <div className="mt-4 flex flex-1 items-center justify-center sm:mt-6">
        <div className="relative w-full max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5 }}
              className="card p-4 sm:p-6 lg:p-8"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold tracking-tight sm:text-xl">{slide.title}</h2>
                <span className="shrink-0 text-xs muted">
                  {index + 1} / {SLIDES.length}
                </span>
              </div>
              {slide.render(chartH)}
            </motion.div>
          </AnimatePresence>

          {/* Setas (escondidas em telas muito pequenas) */}
          <button
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-gray-600/50 bg-military-card p-2 text-gray-300 shadow-lg hover:text-white sm:block lg:-left-5"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Próximo slide"
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-gray-600/50 bg-military-card p-2 text-gray-300 shadow-lg hover:text-white sm:block lg:-right-5"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="mt-4 flex items-center justify-center gap-4 sm:mt-6">
        <button
          onClick={prev}
          aria-label="Slide anterior"
          className="rounded-lg p-1.5 text-gray-400 hover:text-white sm:hidden"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir para o slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-8 bg-brand-500' : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pausar apresentação' : 'Retomar apresentação'}
          className="rounded-lg border border-gray-600/50 p-1.5 text-gray-300 hover:text-white"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          onClick={next}
          aria-label="Próximo slide"
          className="rounded-lg p-1.5 text-gray-400 hover:text-white sm:hidden"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
