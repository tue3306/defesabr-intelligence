import { useState } from 'react'
import { Scale, Users, DollarSign, Plane, Truck, Ship, Anchor, Info } from 'lucide-react'
import InfoTooltip from '../components/ui/InfoTooltip'
import { militaryBalance, balanceMetrics, balanceNote } from '../data/militaryBalance'

const METRIC_ICONS = { Users, DollarSign, Plane, Truck, Ship, Anchor }

export default function MilitaryBalance() {
  const [metricKey, setMetricKey] = useState('personnelK')
  const metric = balanceMetrics.find((m) => m.key === metricKey)
  const sorted = [...militaryBalance].sort((a, b) => b[metricKey] - a[metricKey])
  const max = Math.max(...militaryBalance.map((c) => c[metricKey]))

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Scale size={22} />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              Balança Militar Sul-Americana
              <InfoTooltip text="Comparativo de capacidades militares na América do Sul (estilo Order of Battle). Estimativas ilustrativas baseadas em fontes públicas como IISS e Global Firepower." />
            </h1>
            <p className="text-sm muted">Compare efetivo, orçamento e meios entre os países vizinhos. Brasil em destaque.</p>
          </div>
        </div>
      </div>

      {/* SELETOR DE MÉTRICA */}
      <div className="flex flex-wrap gap-2">
        {balanceMetrics.map((m) => {
          const Icon = METRIC_ICONS[m.icon] || Info
          return (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                metricKey === m.key ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} /> {m.label}
            </button>
          )
        })}
      </div>

      {/* GRÁFICO DE BARRAS */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">{metric.label}{metric.unit ? ` (${metric.unit})` : ''}</h2>
          <span className="text-xs muted">Ordenado do maior para o menor</span>
        </div>
        <div className="space-y-3">
          {sorted.map((c) => {
            const isBR = c.code === 'BR'
            return (
              <div key={c.code} className="flex items-center gap-3">
                <span className="flex w-28 shrink-0 items-center gap-2 text-sm">
                  <span>{c.flag}</span>
                  <span className={`truncate font-medium ${isBR ? 'font-bold text-brand-300' : ''}`}>{c.country}</span>
                </span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-gray-700/30">
                  <span
                    className="block h-full rounded-full transition-all"
                    style={{ width: `${(c[metricKey] / max) * 100}%`, background: isBR ? '#caa733' : '#2b6cb0' }}
                  />
                </span>
                <span className={`w-16 shrink-0 text-right font-mono text-sm ${isBR ? 'font-bold text-brand-200' : 'font-semibold'}`}>
                  {c[metricKey].toLocaleString('pt-BR')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* TABELA COMPLETA (ORDER OF BATTLE) */}
      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
          Quadro comparativo
          <InfoTooltip text="Índice de poder (estilo Global Firepower): quanto menor o valor, maior a capacidade relativa do país." />
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
                <th className="py-2 pr-3">País</th>
                <th className="py-2 pr-3 text-right">Efetivo (mil)</th>
                <th className="py-2 pr-3 text-right">Orç. (US$ bi)</th>
                <th className="py-2 pr-3 text-right">% PIB</th>
                <th className="py-2 pr-3 text-right">Aeronaves</th>
                <th className="py-2 pr-3 text-right">Blindados</th>
                <th className="py-2 pr-3 text-right">Navios</th>
                <th className="py-2 pr-3 text-right">Submar.</th>
                <th className="py-2 text-right">Índice</th>
              </tr>
            </thead>
            <tbody>
              {[...militaryBalance].sort((a, b) => a.pwrIndex - b.pwrIndex).map((c) => {
                const isBR = c.code === 'BR'
                return (
                  <tr key={c.code} className={`border-b border-gray-700/30 ${isBR ? 'bg-brand-500/5' : ''}`}>
                    <td className={`py-2 pr-3 font-medium ${isBR ? 'font-bold text-brand-300' : ''}`}>{c.flag} {c.country}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.personnelK}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.budgetUSD}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.pctGdp}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.aircraft}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.tanks}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.ships}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.submarines}</td>
                    <td className={`py-2 text-right font-mono ${isBR ? 'font-bold text-brand-200' : ''}`}>{c.pwrIndex.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEITURA */}
      <div className="card flex gap-3 p-5">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-400" />
        <div>
          <h3 className="text-sm font-bold">Como ler este quadro</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-300">{balanceNote}</p>
        </div>
      </div>

      <p className="text-center text-xs muted">Estimativas ilustrativas — não constituem dados oficiais.</p>
    </div>
  )
}
