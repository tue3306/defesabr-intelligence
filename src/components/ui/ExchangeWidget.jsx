import { useEffect, useState } from 'react'
import { DollarSign, Euro } from 'lucide-react'
import Badge from './Badge'
import Sparkline from '../charts/Sparkline'
import { fetchUsdBrlSeries, fetchLastExchange } from '../../api/awesomeapi'

export default function ExchangeWidget() {
  const [series, setSeries] = useState([])
  const [last, setLast] = useState(null)
  const [source, setSource] = useState('demo')

  useEffect(() => {
    let active = true
    ;(async () => {
      const s = await fetchUsdBrlSeries(30)
      const l = await fetchLastExchange()
      if (!active) return
      setSeries(s.data)
      setLast(l.data)
      setSource(s.source === 'live' && l.source === 'live' ? 'live' : 'demo')
    })()
    return () => {
      active = false
    }
  }, [])

  const usd = last?.USDBRL
  const eur = last?.EURBRL
  const usdValues = series.map((d) => d.value)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide muted">Câmbio</h3>
        <Badge type={source === 'live' ? 'live' : 'demo'} />
      </div>

      <div className="space-y-3">
        <Rate icon={DollarSign} label="USD / BRL" rate={usd} />
        <Rate icon={Euro} label="EUR / BRL" rate={eur} />
      </div>

      <div className="mt-3">
        <Sparkline values={usdValues} height={48} />
      </div>
      <p className="mt-2 text-xs muted">Impacto direto nas aquisições de defesa em USD/EUR.</p>
    </div>
  )
}

function Rate({ icon: Icon, label, rate }) {
  const change = Number(rate?.pctChange ?? 0)
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        <Icon size={16} className="text-brand-400" /> {label}
      </span>
      <span className="text-right">
        <span className="block font-mono font-semibold">
          R$ {rate ? Number(rate.bid).toFixed(3) : '—'}
        </span>
        <span className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </span>
      </span>
    </div>
  )
}
