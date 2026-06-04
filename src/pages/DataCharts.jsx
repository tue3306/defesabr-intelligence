import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import Badge from '../components/ui/Badge'
import ExportButton from '../components/ui/ExportButton'
import { SkeletonChart } from '../components/ui/Skeleton'
import Sparkline from '../components/charts/Sparkline'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import ExchangeAreaChart from '../components/charts/ExchangeAreaChart'
import SentimentChart from '../components/charts/SentimentChart'
import GaugeChart from '../components/charts/GaugeChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { fetchBrazilMilitarySpending } from '../api/worldbank'
import { fetchUsdBrlSeries } from '../api/awesomeapi'
import { fetchDefensePortfolio } from '../api/alphavantage'
import {
  globalSpendingTreemap,
  southAmericaSpending,
  categoryRadar,
  alertIndex,
  militarySpendingBR,
} from '../data/mockData'
import { formatTime } from '../utils/dateUtils'
import { exportCSV, exportJSON } from '../utils/exportUtils'

// Cada período define a janela das séries temporais: `days` recorta o câmbio
// (diário) e `years` recorta a evolução de gastos (anual).
const PERIODS = [
  { id: '7d', days: 7, years: 5 },
  { id: '30d', days: 30, years: 8 },
  { id: '90d', days: 90, years: 10 },
  { id: '1a', days: 365, years: 12 },
  { id: '5a', days: 365, years: 15 },
]

function Panel({ title, subtitle, badge, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs muted">{subtitle}</p>}
        </div>
        {badge && <Badge type={badge} />}
      </div>
      {children}
    </div>
  )
}

export default function DataCharts() {
  const [loading, setLoading] = useState(true)
  const [spending, setSpending] = useState(militarySpendingBR)
  const [exchange, setExchange] = useState([])
  const [stocks, setStocks] = useState([])
  const [sources, setSources] = useState({})
  const [mode, setMode] = useState('dual')
  const [period, setPeriod] = useState('5a')
  const [updatedAt, setUpdatedAt] = useState(formatTime())
  const [countdown, setCountdown] = useState(300)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [sp, ex, st] = await Promise.all([
      fetchBrazilMilitarySpending(),
      fetchUsdBrlSeries(360),
      fetchDefensePortfolio(),
    ])
    setSpending(sp.data)
    setExchange(ex.data)
    setStocks(st.data)
    setSources({ spending: sp.source, exchange: ex.source, stocks: st.source })
    setUpdatedAt(formatTime())
    setCountdown(300)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Auto-refresh do câmbio a cada 5 min (countdown regressivo)
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchUsdBrlSeries(360).then((r) => setExchange(r.data))
          setUpdatedAt(formatTime())
          return 300
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Recorta as séries conforme o período selecionado.
  const cfg = PERIODS.find((p) => p.id === period) || PERIODS[PERIODS.length - 1]
  const visibleSpending = spending.slice(-cfg.years)
  const visibleExchange = exchange.slice(-cfg.days)
  const mmss = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      {/* HEADER / CONTROLES */}
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dados &amp; Gráficos</h1>
          <p className="text-sm muted">Visualizações ao vivo com fallback demonstrativo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium muted sm:inline">Período:</span>
            <div className="flex rounded-lg border border-gray-600/50 p-0.5" role="group" aria-label="Janela de tempo">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  aria-pressed={period === p.id}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    period === p.id ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p.id}
                </button>
              ))}
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs muted">
            <Clock size={13} /> {updatedAt}
          </span>
          <button onClick={loadAll} className="btn-ghost">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <ExportButton
            onCSV={() => exportCSV(spending, 'gastos-militares-br.csv')}
            onJSON={() => exportJSON({ spending, exchange, stocks }, 'dados-defesabr.json')}
          />
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Gastos militares globais" subtitle="US$ bilhões (mais recente)" badge="demo">
          <BrazilDefenseBudget data={globalSpendingTreemap} />
        </Panel>

        <Panel
          title="Evolução — Brasil"
          subtitle={`Gasto e % do PIB · últimos ${visibleSpending.length} anos`}
          badge={sources.spending === 'live' ? 'live' : 'demo'}
        >
          <div className="mb-2 flex gap-1.5">
            {['dual', 'usd', 'pctGdp'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  mode === m ? 'bg-brand-500/20 text-brand-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'dual' ? 'R$ + %PIB' : m === 'usd' ? 'US$' : '% PIB'}
              </button>
            ))}
          </div>
          {loading ? <SkeletonChart /> : <MilitarySpendingChart data={visibleSpending} mode={mode} />}
        </Panel>

        <Panel title="América do Sul" subtitle="% do PIB em defesa" badge="demo">
          <ComparisonBarChart data={southAmericaSpending} highlightCode="BR" />
        </Panel>

        <Panel
          title="Câmbio USD/BRL"
          subtitle={`Últimos ${visibleExchange.length} dias · atualiza em ${mmss}`}
          badge={sources.exchange === 'live' ? 'live' : 'demo'}
        >
          {loading ? <SkeletonChart /> : <ExchangeAreaChart data={visibleExchange} />}
        </Panel>

        <Panel title="Volume por categoria" subtitle="Semana atual x anterior" badge="demo">
          <SentimentChart data={categoryRadar} />
        </Panel>

        <Panel title="Índice de alerta" subtitle="Escala 0–100" badge="demo">
          <GaugeChart value={alertIndex} height={300} />
        </Panel>

        <Panel title="Ações do setor de defesa" subtitle="Cotações (demonstrativas)" badge="demo" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(stocks.length ? stocks : []).map((s) => (
              <div key={s.ticker} className="rounded-lg border border-gray-700/40 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{s.ticker}</span>
                  <span className={`text-xs font-semibold ${s.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.change >= 0 ? '+' : ''}{s.change}%
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] muted">{s.name}</p>
                <p className="mt-1 font-mono text-lg font-bold">{s.price}</p>
                <Sparkline values={s.spark} color={s.change >= 0 ? '#4ade80' : '#f87171'} height={32} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Mapa de calor global" subtitle="Intensidade de eventos por país" badge="demo" className="lg:col-span-2">
          <GlobalHeatmap />
        </Panel>
      </div>
    </div>
  )
}
