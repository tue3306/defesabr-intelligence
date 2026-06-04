import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, Activity } from 'lucide-react'
import { fetchLastExchange } from '../../api/awesomeapi'
import { alertMeta } from '../../utils/textUtils'
import { useNewsStore } from '../../store/newsStore'

// Barra de indicadores em tempo real (atualiza a cada 60s).
export default function Ticker() {
  const [usd, setUsd] = useState('5.42')
  const [eur, setEur] = useState('5.89')
  const latest = useNewsStore((s) => s.notifications?.[0]?.title)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await fetchLastExchange()
      if (!active) return
      setUsd(Number(data.USDBRL?.bid).toFixed(2))
      setEur(Number(data.EURBRL?.bid).toFixed(2))
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const items = [
    { icon: TrendingUp, label: 'USD/BRL', value: `R$ ${usd}` },
    { icon: TrendingUp, label: 'EUR/BRL', value: `R$ ${eur}` },
    { icon: Activity, label: 'Índice de Alerta', value: `${alertMeta.ATENCAO.value}/100` },
    { icon: AlertTriangle, label: 'Nível de Tensão Global', value: 'MODERADO' },
    { icon: Activity, label: 'Última', value: latest || 'Atualizando…' },
  ]
  // Duplicado para loop contínuo
  const loop = [...items, ...items]

  return (
    <div className="overflow-hidden border-b border-gray-700/50 bg-military-dark">
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap py-1.5 pl-8 text-xs">
        {loop.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-gray-300">
            <it.icon size={13} className="text-brand-400" />
            <span className="muted">{it.label}:</span>
            <span className="font-semibold">{it.value}</span>
            <span className="ml-6 text-gray-600">•</span>
          </span>
        ))}
      </div>
    </div>
  )
}
