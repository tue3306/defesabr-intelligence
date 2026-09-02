import { useState, useMemo } from 'react'
import {
  Scale, Users, DollarSign, Plane, Truck, Ship, Anchor, ArrowUpDown,
  Info, Download, GitCompareArrows, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import ErrorBoundary from '../components/system/ErrorBoundary'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { balanceNote } from '../data/militaryBalance'
import { exportCSV } from '../utils/exportUtils'

const METRIC_ICONS = { Users, DollarSign, Plane, Truck, Ship, Anchor }

const CHART_METRICS = [
  { key: 'budgetUSD', label: 'Orçamento de defesa (US$ bi)', format: (v) => `US$ ${v} bi` },
  { key: 'personnelK', label: 'Efetivo ativo (mil)', format: (v) => `${v} mil` },
  { key: 'aircraft', label: 'Aeronaves', format: (v) => String(v) },
  { key: 'ships', label: 'Meios navais', format: (v) => String(v) },
]

const BRAZIL = '#2e7d46'
const OTHER = '#5c616a'

// -----------------------------------------------------------------------------
// BALANÇA MILITAR SUL-AMERICANA
//
// Comparar capacidades não é ranquear países: é entender assimetrias que
// condicionam a diplomacia de defesa e o planejamento. Por isso a leitura
// padrão destaca o Brasil e oferece a comparação direta com cada vizinho.
// -----------------------------------------------------------------------------
export default function MilitaryBalance() {
  const { data, loading, error, refetch } = useResource(() => intelligenceService.militaryBalance(), [])

  const [sort, setSort] = useState({ key: 'budgetUSD', dir: 'desc' })
  const [chartMetric, setChartMetric] = useState('budgetUSD')
  const [compareWith, setCompareWith] = useState('CO')

  const countries = data?.countries || []
  const metrics = data?.metrics || []

  const brazil = countries.find((c) => c.code === 'BR')
  const rival = countries.find((c) => c.code === compareWith)

  const sorted = useMemo(() => {
    const list = [...countries]
    list.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv, 'pt-BR') : bv.localeCompare(av, 'pt-BR')
      }
      return sort.dir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [countries, sort])

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key
      ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { key, dir: 'desc' }))
  }

  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  const chartData = useMemo(() => {
    const meta = CHART_METRICS.find((m) => m.key === chartMetric)
    return [...countries]
      .sort((a, b) => b[chartMetric] - a[chartMetric])
      .map((c) => ({ name: c.country, code: c.code, valor: c[chartMetric], label: meta?.format(c[chartMetric]) }))
  }, [countries, chartMetric])

  const regionTotals = useMemo(() => {
    if (!countries.length) return null
    const budget = countries.reduce((a, c) => a + c.budgetUSD, 0)
    const personnel = countries.reduce((a, c) => a + c.personnelK, 0)
    return {
      budget: budget.toFixed(1),
      personnel,
      brShareBudget: brazil ? Math.round((brazil.budgetUSD / budget) * 100) : 0,
      brSharePersonnel: brazil ? Math.round((brazil.personnelK / personnel) * 100) : 0,
    }
  }, [countries, brazil])

  const exportBalance = () => {
    exportCSV(
      countries.map((c) => ({
        País: c.country,
        'Efetivo ativo (mil)': c.personnelK,
        'Reservas (mil)': c.reservesK,
        'Orçamento (US$ bi)': c.budgetUSD,
        '% do PIB': c.pctGdp,
        Blindados: c.tanks,
        Aeronaves: c.aircraft,
        'Meios navais': c.ships,
        Submarinos: c.submarines,
        Helicópteros: c.helicopters,
      })),
      `balanca-militar-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success('Balança militar exportada em CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Scale}
        title="Balança Militar Sul-Americana"
        description="Comparativo de capacidades entre os países da região — efetivo, orçamento, meios aéreos, terrestres e navais — com o Brasil como referência."
        help="Valores ilustrativos que aproximam fontes públicas (IISS, SIPRI, Global Firepower). Capacidade militar não se reduz a contagem de meios: doutrina, prontidão e logística pesam tanto quanto o inventário."
        breadcrumb={[{ label: 'Brasil Estratégico' }, { label: 'Balança Militar' }]}
        badges={<Badge type="demo" />}
        actions={
          <Can do="reports.export">
            <button onClick={exportBalance} className="btn-ghost text-sm" disabled={!countries.length}>
              <Download size={15} /> Exportar CSV
            </button>
          </Can>
        }
      />

      <DataState
        loading={loading}
        error={error}
        empty={!countries.length}
        onRetry={refetch}
        skeletonCount={4}
        emptyProps={{ icon: Scale, title: 'Dados indisponíveis', hint: 'A balança militar não pôde ser carregada.' }}
      >
        {/* POSIÇÃO DO BRASIL */}
        {brazil && regionTotals && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              icon={DollarSign}
              label="Orçamento do Brasil"
              value={`US$ ${brazil.budgetUSD} bi`}
              hint={`${regionTotals.brShareBudget}% do total regional`}
              accent="green"
            />
            <MetricCard
              icon={Users}
              label="Efetivo ativo"
              value={`${brazil.personnelK} mil`}
              hint={`${regionTotals.brSharePersonnel}% do efetivo regional`}
              accent="brand"
            />
            <MetricCard
              icon={Scale}
              label="% do PIB em defesa"
              value={`${brazil.pctGdp}%`}
              hint="referência OTAN: 2%"
              accent={brazil.pctGdp >= 2 ? 'green' : 'amber'}
            />
            <MetricCard
              icon={Anchor}
              label="Submarinos"
              value={String(brazil.submarines)}
              hint="PROSUB amplia a frota"
              accent="brand"
            />
          </div>
        )}

        {/* COMPARAÇÃO DIRETA */}
        {brazil && rival && (
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <GitCompareArrows size={18} className="text-brand-400 dark:text-brand-300" /> Brasil comparado a…
              </h2>
              <select
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
                className="input w-auto py-1.5 text-sm"
                aria-label="Escolher país para comparar com o Brasil"
              >
                {countries.filter((c) => c.code !== 'BR').map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.country}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {CHART_METRICS.map((m) => {
                const br = brazil[m.key]
                const other = rival[m.key]
                const ratio = other > 0 ? br / other : null
                const diffPct = other > 0 ? Math.round(((br - other) / other) * 100) : null
                const Icon = diffPct > 0 ? TrendingUp : diffPct < 0 ? TrendingDown : Minus
                const color = diffPct > 0
                  ? 'text-emerald-800 dark:text-emerald-400'
                  : diffPct < 0 ? 'text-red-800 dark:text-red-400' : 'muted'
                return (
                  <div key={m.key} className="rounded-lg bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider muted">{m.label}</p>
                    <p className="mt-1.5 text-sm font-bold tracking-tight">
                      {m.format(br)} <span className="muted">vs</span> {m.format(other)}
                    </p>
                    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
                      <Icon size={12} />
                      {diffPct === null ? '—'
                        : diffPct > 0 ? `+${diffPct}%`
                          : `${diffPct}%`}
                      {ratio && ratio >= 2 && <span className="muted">({ratio.toFixed(1)}×)</span>}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs muted">
              Diferença relativa do Brasil em relação a {rival.country}. Valores positivos indicam
              vantagem numérica brasileira — não vantagem operacional.
            </p>
          </section>
        )}

        {/* GRÁFICO COMPARATIVO */}
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Comparativo regional
              <InfoTooltip text="Barras horizontais ordenadas do maior para o menor. O Brasil é destacado em verde." />
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {CHART_METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  aria-pressed={chartMetric === m.key}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    chartMetric === m.key
                      ? 'bg-gold-500 text-military-darker'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  {m.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          <ErrorBoundary variant="inline" scope="Comparativo regional">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    contentStyle={{
                      background: '#232a33', border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: 10, fontSize: 12, color: '#f1f5f9',
                    }}
                    formatter={(value, _n, item) => [item.payload.label, CHART_METRICS.find((m) => m.key === chartMetric)?.label]}
                  />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.code} fill={entry.code === 'BR' ? BRAZIL : OTHER} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ErrorBoundary>
        </section>

        {/* TABELA ORDENÁVEL */}
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
            Ordem de batalha comparada
            <InfoTooltip text="Clique no cabeçalho de qualquer coluna para reordenar. A linha do Brasil fica destacada." />
          </h2>
          <p className="mb-4 text-sm muted">Clique em uma coluna para ordenar por ela.</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                  <SortHeader label="País" sortKey="country" sort={sort} onSort={toggleSort} ariaSort={ariaSort} align="left" />
                  {metrics.map((m) => (
                    <SortHeader
                      key={m.key}
                      label={m.label}
                      sortKey={m.key}
                      sort={sort}
                      onSort={toggleSort}
                      ariaSort={ariaSort}
                      icon={METRIC_ICONS[m.icon]}
                    />
                  ))}
                  <SortHeader label="% PIB" sortKey="pctGdp" sort={sort} onSort={toggleSort} ariaSort={ariaSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const isBR = c.code === 'BR'
                  return (
                    <tr
                      key={c.code}
                      className={`border-b border-gray-100 dark:border-white/[0.06] ${
                        isBR ? 'bg-military-green/10 font-semibold' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap py-2.5 pr-4">
                        <span className="mr-1.5">{c.flag}</span>{c.country}
                        {isBR && (
                          <span className="ml-2 rounded-full bg-military-green/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                            referência
                          </span>
                        )}
                      </td>
                      {metrics.map((m) => (
                        <td key={m.key} className="py-2.5 pr-4 text-right font-mono tabular-nums">
                          {c[m.key]}{m.unit ? <span className="ml-0.5 text-[10px] muted">{m.unit}</span> : null}
                        </td>
                      ))}
                      <td className="py-2.5 text-right font-mono tabular-nums">{c.pctGdp}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* NOTA METODOLÓGICA */}
        <section className="card border-l-4 border-gold-500 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
            <Info size={17} className="text-gold-600 dark:text-gold-400" /> Como ler estes números
          </h2>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{balanceNote}</p>
          <p className="mt-2 text-sm leading-relaxed muted">
            Contagem de meios não mede capacidade: prontidão, manutenção, doutrina, treinamento e
            logística determinam o que uma força consegue efetivamente empregar — e nenhum desses
            fatores aparece numa tabela de inventário.
          </p>
        </section>
      </DataState>

      <p className="text-center text-xs muted">
        Dados demonstrativos — aproximam fontes públicas, sem valor oficial.
      </p>
    </div>
  )
}

function SortHeader({ label, sortKey, sort, onSort, ariaSort, icon: Icon, align = 'right' }) {
  const active = sort.key === sortKey
  return (
    <th scope="col" aria-sort={ariaSort(sortKey)} className={`py-2 pr-4 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-gray-800 dark:hover:text-gray-200 ${
          active ? 'text-gold-600 dark:text-gold-400' : ''
        }`}
        aria-label={`Ordenar por ${label}`}
      >
        {Icon && <Icon size={12} />}
        {label}
        <ArrowUpDown size={11} className={active ? 'opacity-100' : 'opacity-30'} />
      </button>
    </th>
  )
}
