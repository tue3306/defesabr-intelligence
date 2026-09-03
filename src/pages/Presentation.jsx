import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, X, ChevronLeft, ChevronRight, Pause, Play, ShieldAlert, Activity, Target } from 'lucide-react'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import GaugeChart from '../components/charts/GaugeChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import SentimentChart from '../components/charts/SentimentChart'
import { useNewsVolume } from '../hooks/useNewsVolume'
import {
  useGastoMilitar, useComparacaoSulAmericana, useGastoGlobal,
  useRadarCategorias, useIndiceDeAlerta,
} from '../hooks/useDadosReais'
import { alertMeta } from '../utils/textUtils'
import { formatTime, formatFullDate } from '../utils/dateUtils'

// Slides de CONTEXTO — poucos elementos, grandes, legíveis a distância. Vêm
// antes dos gráficos porque uma apresentação começa pela situação, não pelo dado.
function PostureSlide() {
  // Era `alertMeta.ATENCAO` — uma constante. O primeiro slide da apresentação
  // dizia "ATENÇÃO · 42/100" em qualquer cenário, todos os dias.
  const a = useIndiceDeAlerta(7)
  const alert = alertMeta[a.level] || alertMeta.NORMAL
  return (
    <div className="flex flex-col items-center py-6 text-center sm:py-10">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold-400">Postura nacional</span>
      <p className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl" style={{ color: '#caa733' }}>
        {a.value != null ? alert.label : '—'}
      </p>
      <p className="mt-2 font-mono text-xl muted sm:text-2xl">{a.value ?? '—'}/100</p>
      <div className="mt-6 h-3 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${a.value ?? 0}%` }} />
      </div>
      <div className="mt-2 flex w-full max-w-xl justify-between text-xs uppercase tracking-wide muted">
        <span>Normal</span><span>Crítico</span>
      </div>
    </div>
  )
}




// O slide de volume precisa de hook, e o array de slides é de módulo — daí o
// componente. Mostra a série REAL de notícias coletadas por dia e categoria; se
// a API estiver fora, cai na série de demonstração e o rodapé diz qual das duas
// está em tela, porque numa apresentação essa distinção é a única que importa.
function VolumeSlide({ height }) {
  const volume = useNewsVolume(14)
  return (
    <div className="flex h-full flex-col">
      <NewsVolumeChart data={volume.data} keys={volume.keys} height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {volume.aoVivo
          ? 'Notícias coletadas pelo servidor, agrupadas por dia e categoria.'
          : 'Série de demonstração — servidor de coleta indisponível.'}
      </p>
    </div>
  )
}

// Os slides abaixo dependem de hooks, e o array de slides é de módulo — daí
// cada um virar componente. Todos seguem a mesma regra: usam a série real
// quando o servidor responde, caem no acervo local quando não, e dizem no
// rodapé qual das duas está em tela. Numa apresentação essa distinção é a
// única que o público não pode deduzir sozinho.
function GastoSlide({ height }) {
  const g = useGastoMilitar()
  return (
    <div className="flex h-full flex-col">
      {/* O World Bank publica em dólares; a série em reais não existe do lado
          dele, e converter dólar de 2010 pelo câmbio de hoje daria uma curva
          historicamente falsa. Com dado real o gráfico mostra US$ e % do PIB. */}
      <MilitarySpendingChart data={g.data} mode={g.aoVivo ? 'usd' : 'dual'} height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {g.aoVivo
          ? 'World Bank Open Data — gasto militar em US$ e % do PIB.'
          : 'Série de demonstração — servidor indisponível.'}
      </p>
    </div>
  )
}

function GlobalSlide({ height }) {
  const g = useGastoGlobal()
  return (
    <div className="flex h-full flex-col">
      <BrazilDefenseBudget data={g.data} height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {g.aoVivo
          ? `World Bank Open Data · ${g.data[0]?.period || ''} — gasto militar em US$ bilhões.`
          : 'Série de demonstração — servidor indisponível.'}
      </p>
    </div>
  )
}

function ComparacaoSlide({ height }) {
  const c = useComparacaoSulAmericana()
  return (
    <div className="flex h-full flex-col">
      <ComparisonBarChart data={c.data} highlightCode="BR" height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {c.aoVivo
          ? `World Bank Open Data · ${c.data[0]?.period || ''} — % do PIB em defesa.`
          : 'Série de demonstração — servidor indisponível.'}
      </p>
    </div>
  )
}

function RadarSlide({ height }) {
  const r = useRadarCategorias(30)
  return (
    <div className="flex h-full flex-col">
      <SentimentChart data={r.data} height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {r.aoVivo
          ? 'Notícias coletadas, por categoria: últimos 30 dias contra os 30 anteriores.'
          : 'Série de demonstração — servidor indisponível.'}
      </p>
    </div>
  )
}

function AlertaSlide({ height }) {
  const a = useIndiceDeAlerta(7)
  return (
    <div className="flex h-full flex-col">
      <GaugeChart value={a.value} height={height} />
      <p className="mt-2 text-center text-[11px] muted">
        {a.aoVivo && a.basis
          ? `Média ponderada das urgências — ${a.basis}.`
          : 'Valor de demonstração — servidor indisponível.'}
      </p>
    </div>
  )
}

const SLIDES = [
  { title: 'Postura nacional do período', icon: Activity, render: () => <PostureSlide /> },
  { title: 'Gastos militares — Brasil', render: (h) => <GastoSlide height={h} /> },
  { title: 'Gastos militares globais (US$ bi)', render: (h) => <GlobalSlide height={h} /> },
  { title: 'América do Sul — % do PIB em defesa', render: (h) => <ComparacaoSlide height={h} /> },
  { title: 'Volume de notícias — 14 dias', render: (h) => <VolumeSlide height={h} /> },
  { title: 'Volume por categoria — 30 dias', render: (h) => <RadarSlide height={h} /> },
  { title: 'Índice de alerta nacional', render: (h) => <AlertaSlide height={h} /> },
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
  const navigate = useNavigate()
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

  // Atalhos de teclado: setas navegam, espaco pausa, Esc sai.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key === 'Escape') navigate('/painel')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, navigate])

  const slide = SLIDES[index]

  return (
    <div className="on-dark flex min-h-screen flex-col bg-military-darker p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300 sm:h-11 sm:w-11">
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
          <span className="font-mono text-2xl font-bold text-brand-400 dark:text-brand-300 sm:text-3xl">{now}</span>
          <Link
            to="/painel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600/50 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
            aria-label="Sair da apresentação (Esc)"
            title="Sair da apresentação (Esc)"
          >
            <X size={16} /> <span className="hidden sm:inline">Sair</span>
          </Link>
        </div>
      </header>

      {/* SLIDE */}
      <div className="mt-4 flex flex-1 items-center justify-center sm:mt-6">
        <div className="relative w-full max-w-6xl">
          {/* SEM AnimatePresence, de propósito.
              Antes havia `<AnimatePresence mode="wait">`, que só monta o slide
              seguinte depois que a animação de SAÍDA do anterior termina. Se
              essa animação não completa — aba com requestAnimationFrame
              limitado, projetor, sistema com "reduzir movimento" — o deck
              congela: a barra de progresso continua andando e o índice
              continua mudando, mas o conteúdo fica parado no primeiro slide.
              Foi exatamente o que aconteceu em teste, e numa apresentação ao
              vivo não há como se recuperar disso.

              A troca por `key={index}` num motion.div simples remonta o slide a
              cada mudança e roda só a animação de ENTRADA. Não há saída para
              travar, e nada depende de a anterior terminar. */}
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="card p-4 sm:p-6 lg:p-8"
          >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold tracking-tight sm:text-xl">{slide.title}</h2>
                <span className="shrink-0 text-xs muted" aria-live="polite">
                  Slide {index + 1} de {SLIDES.length}
                </span>
              </div>
              {slide.render(chartH)}
          </motion.div>

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

      {/* PROGRESSO DA APRESENTAÇÃO */}
      <div className="mx-auto mt-4 h-1 w-full max-w-6xl overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gold-500 transition-all duration-500"
          style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
        />
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

      <p className="mt-3 text-center text-[11px] muted">
        ← → navegar · espaço pausa · Esc sai
      </p>
    </div>
  )
}
