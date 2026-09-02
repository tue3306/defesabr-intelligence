import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, AlertTriangle, Activity, ShieldAlert, Target } from 'lucide-react'
import { fetchLastExchange } from '../../api/awesomeapi'
import { alertMeta } from '../../utils/textUtils'
import { useNewsStore } from '../../store/newsStore'

// -----------------------------------------------------------------------------
// FAIXA DE INDICADORES — leitura rápida do estado do produto.
//
// Todos os valores vêm de dados reais do projeto (stores e repositórios), não de
// constantes soltas: se o analista mudar o nível de tensão, a faixa acompanha.
// O câmbio é a única fonte externa (com fallback silencioso).
// -----------------------------------------------------------------------------
export default function Ticker() {
  const [rates, setRates] = useState({ usd: null, eur: null })
  const latest = useNewsStore((s) => s.notifications?.[0]?.title)
  const latestClipping = useNewsStore((s) => s.latestClipping)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data } = await fetchLastExchange()
        if (!active) return
        setRates({
          usd: Number(data?.USDBRL?.bid).toFixed(2),
          eur: Number(data?.EURBRL?.bid).toFixed(2),
        })
      } catch {
        // A faixa nunca deve quebrar por indisponibilidade de câmbio.
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const items = useMemo(() => {
    const alert = alertMeta[latestClipping?.alert_level] || alertMeta.ATENCAO

    return [
      { icon: TrendingUp, label: 'USD/BRL', value: rates.usd ? `R$ ${rates.usd}` : '—' },
      { icon: TrendingUp, label: 'EUR/BRL', value: rates.eur ? `R$ ${rates.eur}` : '—' },
      { icon: Activity, label: 'Nível de alerta', value: `${alert.label} · ${alert.value}/100`, to: '/painel' },
      { icon: Activity, label: 'Última ocorrência', value: latest || 'Monitoramento em curso' },
    ]
  }, [rates, latest, latestClipping, regions])

  // Duplicado para o laço contínuo da marquise.
  const loop = [...items, ...items]

  return (
    <div
      className="overflow-hidden border-b border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-military-dark"
      aria-label="Indicadores em destaque"
    >
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap py-1.5 pl-8 text-xs">
        {loop.map((it, i) => {
          const content = (
            <>
              <it.icon size={13} className="text-gold-600 dark:text-gold-400" />
              <span className="muted">{it.label}:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{it.value}</span>
              <span className="ml-6 text-gray-400 dark:text-gray-600">•</span>
            </>
          )
          return it.to ? (
            <Link
              key={i}
              to={it.to}
              className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
              tabIndex={i < items.length ? 0 : -1}
              aria-hidden={i >= items.length}
            >
              {content}
            </Link>
          ) : (
            <span key={i} className="inline-flex items-center gap-1.5" aria-hidden={i >= items.length}>
              {content}
            </span>
          )
        })}
      </div>
    </div>
  )
}
