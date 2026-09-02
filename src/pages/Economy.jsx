import { Link } from 'react-router-dom'
import {
  DollarSign, TrendingUp, Percent, Shield, Landmark, Activity, Globe2,
  ArrowRightLeft, ShieldAlert, ChevronRight, Info,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import ExchangeWidget from '../components/ui/ExchangeWidget'
import Sparkline from '../components/charts/Sparkline'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import PageHeader from '../components/ui/PageHeader'
import ErrorBoundary from '../components/system/ErrorBoundary'
import {
  brazilIndicators, southAmericaEconomy, brazilInflation, defenseBudgetBreakdown,
} from '../data/economyData'
import { strategicPrograms } from '../data/strategicPrograms'
import { riskMatrix, RISK_SEVERITY } from '../data/riskMatrix'

const IND_ICON = { pib: DollarSign, cambio: TrendingUp, inflacao: Percent, defesa: Shield, selic: Landmark, risco: Activity }

export default function Economy() {
  // Mapeia o campo para o ComparisonBarChart (espera `pctGdp`).
  const pctGdpData = southAmericaEconomy.map((d) => ({ ...d, pctGdp: d.militaryPctGdp }))
  const maxDef = Math.max(...southAmericaEconomy.map((d) => d.defenseUSD))
  const inflationVals = brazilInflation.map((i) => i.value)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Economia & Defesa"
        description="Indicadores macroeconômicos que condicionam o orçamento de defesa brasileiro, o comparativo regional e o efeito do câmbio sobre os programas estratégicos."
        help="Orçamento de defesa é decisão política, mas sua execução real depende de câmbio, inflação e espaço fiscal — por isso estes indicadores aparecem aqui."
        breadcrumb={[{ label: 'Dados & Relatórios' }, { label: 'Economia & Defesa' }]}
        badges={<Badge type="demo" />}
      />

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
          <ErrorBoundary variant="inline" scope="Câmbio ao vivo">
            <ExchangeWidget />
          </ErrorBoundary>
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            Inflação (IPCA)
            <InfoTooltip text="Índice de Preços ao Consumidor Amplo — mede a inflação oficial do Brasil, em % ao ano." />
          </h2>
          <p className="mt-1 text-3xl font-bold">{brazilInflation.at(-1).value}%</p>
          <p className="text-xs muted">acumulado 12 meses</p>
          <div className="mt-3">
            <ErrorBoundary variant="inline" scope="Série de inflação">
              <Sparkline values={inflationVals} color="#caa733" height={48} />
            </ErrorBoundary>
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
          <ErrorBoundary variant="inline" scope="Comparativo regional de gasto militar">
            <ComparisonBarChart data={pctGdpData} highlightCode="BR" height={300} />
          </ErrorBoundary>
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
                    style={{ width: `${(d.defenseUSD / maxDef) * 100}%`, background: d.code === 'BR' ? '#caa733' : '#1f8a4c' }}
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
      {/* COMO O CÂMBIO AFETA OS PROGRAMAS */}
      <ExchangeImpactSection />

    </div>
  )
}

// -----------------------------------------------------------------------------
// CÂMBIO x PROGRAMAS ESTRATÉGICOS
//
// Programas de longo ciclo compram tecnologia em moeda estrangeira. Uma
// desvalorização não aparece no orçamento aprovado — aparece no cronograma,
// meses depois. Este bloco liga o indicador ao risco correspondente.
// -----------------------------------------------------------------------------

// Participação estimada de componente importado por programa (ILUSTRATIVA).
// Deriva do parceiro internacional declarado em cada programa.
const IMPORT_SHARE = { prosub: 55, fx2: 60, tamandare: 45, sgdc: 70, guarani: 30 }

function ExchangeImpactSection() {
  const risk = riskMatrix.find((r) => r.id === 'risk-orcamento')
  const sev = risk ? RISK_SEVERITY[risk.severity] : {}

  const exposed = strategicPrograms
    .filter((p) => IMPORT_SHARE[p.id])
    .map((p) => ({ ...p, importShare: IMPORT_SHARE[p.id] }))
    .sort((a, b) => b.importShare - a.importShare)
    .slice(0, 3)

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <ArrowRightLeft size={18} className="text-brand-400 dark:text-brand-300" /> Como o câmbio afeta os programas
      </h2>
      <p className="mt-1 max-w-2xl text-sm muted">
        Programas estratégicos compram tecnologia em moeda estrangeira. Uma desvalorização não muda
        o valor aprovado no orçamento — muda o quanto esse valor compra, e o efeito aparece no
        cronograma físico meses depois.
      </p>

      <div className="mt-5 space-y-3">
        {exposed.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold tracking-tight">
                {p.name}
                <span className="ml-2 text-xs font-normal muted">{p.partner}</span>
              </span>
              <span className="font-mono text-sm font-bold tabular-nums">
                ~{p.importShare}%
                <span className="ml-1 text-[10px] font-normal muted">componente importado</span>
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <span className="h-full bg-military-red/70" style={{ width: `${p.importShare}%` }} title="Exposto ao câmbio" />
              <span className="h-full bg-military-green/70" style={{ width: `${100 - p.importShare}%` }} title="Conteúdo nacional" />
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] muted">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-military-red/70" />exposto ao câmbio</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-military-green/70" />nacionalizado</span>
              <span className="ml-auto">investimento previsto: R$ {p.budgetBRL?.toFixed(1)} bi</span>
            </p>
          </div>
        ))}
      </div>

      {risk && (
        <div className="mt-4 rounded-lg border-l-4 p-3" style={{ borderLeftColor: sev.color, background: `${sev.color}10` }}>
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold tracking-tight">
            <ShieldAlert size={15} style={{ color: sev.color }} />
            {risk.title}
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sev.classes || ''}`}>
              {sev.label}
            </span>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{risk.impactBR}</p>
          <Link to="/riscos" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
            Ver na matriz de riscos <ChevronRight size={13} />
          </Link>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed muted">
        <Info size={12} className="mt-0.5 shrink-0" />
        Participações de componente importado são estimativas ilustrativas derivadas do parceiro
        internacional de cada programa — não são dados contratuais.
      </p>
    </section>
  )
}
