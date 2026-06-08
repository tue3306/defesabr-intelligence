import {
  DollarSign, TrendingUp, Percent, Shield, Landmark, Activity, Globe2,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import ExchangeWidget from '../components/ui/ExchangeWidget'
import Sparkline from '../components/charts/Sparkline'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  brazilIndicators, southAmericaEconomy, brazilInflation, defenseBudgetBreakdown,
} from '../data/economyData'

const IND_ICON = { pib: DollarSign, cambio: TrendingUp, inflacao: Percent, defesa: Shield, selic: Landmark, risco: Activity }

export default function Economy() {
  // Mapeia o campo para o ComparisonBarChart (espera `pctGdp`).
  const pctGdpData = southAmericaEconomy.map((d) => ({ ...d, pctGdp: d.militaryPctGdp }))
  const maxDef = Math.max(...southAmericaEconomy.map((d) => d.defenseUSD))
  const inflationVals = brazilInflation.map((i) => i.value)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Globe2 size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Economia & Defesa</h1>
            <p className="text-sm muted">Indicadores do Brasil e comparativo da América do Sul.</p>
          </div>
        </div>
      </div>

      {/* INDICADORES BRASIL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brazilIndicators.map((ind) => (
          <MetricCard
            key={ind.id}
            icon={IND_ICON[ind.id] || Activity}
            label={ind.label}
            value={ind.value}
            delta={ind.delta}
            deltaPositive={ind.positive}
            hint={ind.hint}
            accent={ind.id === 'defesa' ? 'green' : ind.id === 'inflacao' ? 'amber' : 'brand'}
          />
        ))}
      </div>

      {/* CÂMBIO + INFLAÇÃO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExchangeWidget />
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            Inflação (IPCA)
            <InfoTooltip text="Índice de Preços ao Consumidor Amplo — mede a inflação oficial do Brasil, em % ao ano." />
          </h2>
          <p className="mt-1 text-3xl font-bold">{brazilInflation.at(-1).value}%</p>
          <p className="text-xs muted">acumulado 12 meses</p>
          <div className="mt-3">
            <Sparkline values={inflationVals} color="#caa733" height={48} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] muted">
            {brazilInflation.map((i) => <span key={i.month}>{i.month}</span>)}
          </div>
        </div>
      </div>

      {/* COMPARATIVO AMÉRICA DO SUL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Gasto militar (% do PIB)</h2>
            <Badge type="demo" />
          </div>
          <ComparisonBarChart data={pctGdpData} highlightCode="BR" height={300} />
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Orçamento de defesa (US$ bi)</h2>
            <Badge type="demo" />
          </div>
          <div className="space-y-2.5">
            {[...southAmericaEconomy].sort((a, b) => b.defenseUSD - a.defenseUSD).map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-sm font-medium">{d.country}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-700/30">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(d.defenseUSD / maxDef) * 100}%`, background: d.code === 'BR' ? '#caa733' : '#2b6cb0' }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-sm font-bold">{d.defenseUSD}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PIB + ORÇAMENTO DE DEFESA BRASIL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-base font-bold tracking-tight">PIB — América do Sul (US$ bi)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
                  <th className="py-2 pr-4">País</th>
                  <th className="py-2 pr-4">PIB (US$ bi)</th>
                  <th className="py-2">Defesa (% PIB)</th>
                </tr>
              </thead>
              <tbody>
                {[...southAmericaEconomy].sort((a, b) => b.gdp - a.gdp).map((d) => (
                  <tr key={d.code} className="border-b border-gray-700/30">
                    <td className="py-2 pr-4 font-medium">{d.country}</td>
                    <td className="py-2 pr-4 font-mono">{d.gdp.toLocaleString('pt-BR')}</td>
                    <td className="py-2 font-mono">{d.militaryPctGdp}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-base font-bold tracking-tight">Composição do orçamento de defesa (Brasil)</h2>
          <div className="space-y-3">
            {defenseBudgetBreakdown.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="font-mono font-bold">{b.value}%</span>
                </div>
                <span className="block h-2 overflow-hidden rounded-full bg-gray-700/30">
                  <span className="block h-full rounded-full" style={{ width: `${b.value}%`, background: b.color }} />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs muted">Pessoal representa a maior fatia — padrão histórico no Brasil.</p>
        </div>
      </div>

      <p className="text-center text-xs muted">Valores demonstrativos para fins de visualização.</p>
    </div>
  )
}
