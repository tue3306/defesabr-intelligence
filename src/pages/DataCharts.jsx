import { textoSobre } from '../utils/textUtils'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3, RefreshCw, Lock, FileSpreadsheet, Layers, Wallet, Globe2, ShieldAlert,
  TrendingUp, TrendingDown, Minus, Anchor, ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import DataState from '../components/ui/DataState'
import { SkeletonChart } from '../components/ui/Skeleton'
import ErrorBoundary from '../components/system/ErrorBoundary'
import { TensionBoard } from '../components/tension/TensionPanel'
import Sparkline from '../components/charts/Sparkline'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import SentimentChart from '../components/charts/SentimentChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import GaugeChart from '../components/charts/GaugeChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useResource } from '../hooks/useResource'
import { useGate } from '../auth/useCan'
import { fetchBrazilMilitarySpending } from '../api/worldbank'
import { fetchDefensePortfolio } from '../api/alphavantage'
import {
  newsVolume14d, newsCategoriesKeys, categoryRadar, activeRegions,
  militarySpendingBR, globalSpendingTreemap, southAmericaSpending,
  militaryPctGdpComparison, defenseStocks, alertIndex, countryActivity,
} from '../data/mockData'
import { geocorrenteBulletins } from '../data/geocorrenteData'
import { exportCSV } from '../utils/exportUtils'

// -----------------------------------------------------------------------------
// DADOS & GRÁFICOS — as séries da plataforma organizadas por TEMA.
// Abas evitam a "parede de gráficos": cada aba responde a uma pergunta.
// -----------------------------------------------------------------------------

const TABS = [
  { id: 'volume', label: 'Volume & Categorias', icon: Layers },
  { id: 'gastos', label: 'Gastos militares', icon: Wallet },
  { id: 'internacional', label: 'Comparação internacional', icon: Globe2 },
  { id: 'risco', label: 'Risco por país', icon: ShieldAlert },
]

// A série real cobre 14 dias; janelas maiores são PROJEÇÃO demonstrativa.
const VOLUME_PERIODS = [
  { id: '14d', days: 14, projected: false },
  { id: '30d', days: 30, projected: true },
  { id: '90d', days: 90, projected: true },
]

const DAY_MS = 86_400_000
// Último dia coberto pela série demonstrativa de 14 dias.
const VOLUME_ANCHOR = new Date('2026-06-04T00:00:00')

/**
 * Estende a série de volume para trás de forma DETERMINÍSTICA: os 14 dias mais
 * recentes são os reais; os anteriores repetem o ciclo observado com uma
 * modulação senoidal fixa. Sem aleatoriedade — o mesmo período gera o mesmo
 * gráfico em qualquer render.
 */
function buildVolumeSeries(days) {
  const volume = useNewsVolume(14)
  const base = volume.data
  if (days <= base.length) return base.slice(-days)

  const rows = []
  for (let i = days - 1; i >= 0; i--) {
    const seed = base[base.length - 1 - (i % base.length)]
    if (i < base.length) {
      rows.push(seed)
      continue
    }
    const d = new Date(VOLUME_ANCHOR.getTime() - i * DAY_MS)
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const factor = 0.78 + 0.32 * Math.abs(Math.sin(i / 4.5))
    const row = { date: label }
    let total = 0
    newsCategoriesKeys.forEach((c) => {
      const v = Math.max(1, Math.round(seed[c] * factor))
      row[c] = v
      total += v
    })
    row.total = total
    rows.push(row)
  }
  return rows
}

/** Exportação de uma série em CSV — capacidade `reports.export`. */
function ExportCSVButton({ rows, filename, label }) {
  const gate = useGate('reports.export')

  if (!gate.allowed) {
    return (
      <Link
        to="/planos"
        className="chip transition-colors hover:border-gold-500/40 hover:text-gold-600 dark:hover:text-gold-400"
        aria-label={`Exportar ${label} em CSV requer plano com exportação de relatórios`}
      >
        <Lock size={12} /> CSV
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => exportCSV(rows, filename)}
      className="chip transition-colors hover:border-gold-500/40 hover:text-gold-600 dark:hover:text-gold-400"
      aria-label={`Exportar ${label} em CSV`}
    >
      <FileSpreadsheet size={12} /> CSV
    </button>
  )
}

/**
 * Moldura padrão de um gráfico: título, subtítulo (o QUE mostra), metodologia
 * em tooltip, selo de origem e exportação. O conteúdo fica dentro de um
 * ErrorBoundary para que uma falha de gráfico não derrube a aba inteira.
 */
function ChartPanel({
  title, subtitle, method, badge = 'demo', rows, filename, controls, footnote, className = '', children,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className={`card p-5 ${className}`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
            {title}
            {method && <InfoTooltip text={method} label={`Metodologia — ${title}`} />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge type={badge} />
          {rows?.length > 0 && <ExportCSVButton rows={rows} filename={filename} label={title} />}
        </div>
      </header>

      {controls && <div className="mb-4">{controls}</div>}

      <ErrorBoundary variant="inline" scope={title}>{children}</ErrorBoundary>

      {footnote && <p className="mt-3 text-[11px] leading-relaxed muted">{footnote}</p>}
    </motion.section>
  )
}

/** Grupo de botões de alternância (período, modo de exibição). */
function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold muted">{label}</span>
      <div className="flex rounded-lg border border-gray-300 p-0.5 dark:border-white/10" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              value === o.id
                ? 'bg-gold-500 text-military-darker'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DataCharts() {
  const [tab, setTab] = useState('volume')
  const [volumePeriod, setVolumePeriod] = useState('14d')
  const [spendingMode, setSpendingMode] = useState('dual')

  // Gasto militar do Brasil: World Bank com fallback demonstrativo.
  const spending = useResource(
    async () => {
      const r = await fetchBrazilMilitarySpending()
      return { data: r.data, meta: { source: r.source } }
    },
    [],
    { initialData: militarySpendingBR }
  )

  // Portfólio de ações do setor (hoje sempre demonstrativo — limite de cota).
  const stocks = useResource(
    async () => {
      const r = await fetchDefensePortfolio()
      return { data: r.data, meta: { source: r.source } }
    },
    [],
    { initialData: defenseStocks }
  )

  const periodCfg = VOLUME_PERIODS.find((p) => p.id === volumePeriod) || VOLUME_PERIODS[0]
  const volumeSeries = useMemo(() => buildVolumeSeries(periodCfg.days), [periodCfg.days])

  // Cruza % do PIB com o gasto absoluto para a tabela internacional.
  const internationalRows = useMemo(
    () =>
      militaryPctGdpComparison
        .map((c) => ({
          pais: c.country,
          pctPib: c.pctGdp,
          gastoUSDbi: globalSpendingTreemap.find((g) => g.name === c.country)?.value ?? 0,
        }))
        .sort((a, b) => b.gastoUSDbi - a.gastoUSDbi),
    []
  )

  const activityRows = useMemo(
    () => Object.entries(countryActivity).map(([iso3, intensidade]) => ({ iso3, intensidade })),
    []
  )

  const stockRows = (stocks.data || []).map(({ ticker, name, price, change }) => ({ ticker, name, price, change }))
  const spendingBadge = spending.source === 'live' ? 'live' : 'demo'

  const refreshAll = () => {
    spending.refetch()
    stocks.refetch()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Dados & Gráficos"
        description="As séries que sustentam a leitura de conjuntura: volume noticioso, esforço orçamentário e exposição a risco. Cada gráfico declara o que mostra e de onde vem."
        help="Séries ao vivo (World Bank) quando disponíveis; caso contrário, a plataforma exibe a série demonstrativa equivalente e marca o selo de origem."
        breadcrumb={[{ label: 'Painel', to: '/painel' }, { label: 'Dados & Gráficos' }]}
        badges={<Badge type={spendingBadge} />}
        meta={[
          { label: 'Origem', value: spending.source === 'live' ? 'World Bank' : 'Demonstrativa' },
          { label: 'Referência', value: 'ago/2026' },
        ]}
        actions={
          <button type="button" onClick={refreshAll} className="btn-ghost" aria-label="Recarregar as séries de dados">
            <RefreshCw size={15} className={spending.loading || stocks.loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        }
      >
        <nav className="-mb-1 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10" role="tablist" aria-label="Temas de dados">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border-gold-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
      </PageHeader>

      {/* ── VOLUME & CATEGORIAS ── */}
      {tab === 'volume' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            className="xl:col-span-2"
            title="Volume de notícias por categoria"
            subtitle="Quantas matérias monitoradas entraram por dia, empilhadas por tema."
            method="Contagem diária de itens capturados pelos coletores e classificados por categoria. Os 14 dias mais recentes são a série demonstrativa base; janelas de 30 e 90 dias são projetadas a partir dela por repetição do ciclo observado."
            rows={volumeSeries}
            filename={`volume-noticias-${periodCfg.id}.csv`}
            controls={
              <div className="flex flex-wrap items-center gap-3">
                <ToggleGroup
                  label="Período"
                  options={VOLUME_PERIODS.map((p) => ({ id: p.id, label: p.id }))}
                  value={volumePeriod}
                  onChange={setVolumePeriod}
                />
                {periodCfg.projected && (
                  <span className="chip border-gold-500/40 text-gold-600 dark:text-gold-400">
                    Projeção demonstrativa
                  </span>
                )}
              </div>
            }
            footnote={
              periodCfg.projected
                ? `Os ${periodCfg.days} dias exibidos estendem a série base de 14 dias por repetição do ciclo — servem para demonstrar a leitura da tendência, não para medir o passado.`
                : 'Série base da demonstração: 14 dias corridos, seis categorias de monitoramento.'
            }
          >
            <NewsVolumeChart data={volumeSeries} keys={newsCategoriesKeys} height={340} />
          </ChartPanel>

          <ChartPanel
            title="Volume por categoria — semana"
            subtitle="Compara o tema desta semana com a anterior; o descolamento indica o que está esquentando."
            method="Radar com a contagem semanal por categoria. A área 'atual' cobrindo a 'anterior' indica aumento de cobertura no tema."
            rows={categoryRadar}
            filename="volume-por-categoria.csv"
          >
            <SentimentChart data={categoryRadar} height={320} />
          </ChartPanel>

          <ChartPanel
            title="Regiões mais ativas"
            subtitle="Eventos de segurança registrados no período, com a direção dos últimos 30 dias."
            method="Contagem de eventos de segurança por recorte geográfico. A seta compara com a média móvel de 30 dias: alta, estável ou queda."
            rows={activeRegions}
            filename="regioes-mais-ativas.csv"
          >
            <div className="space-y-2.5">
              {activeRegions.map((r) => {
                const TrendIcon = r.trend === 'up' ? TrendingUp : r.trend === 'down' ? TrendingDown : Minus
                const trendColor =
                  r.trend === 'up' ? 'text-red-500 dark:text-red-400'
                    : r.trend === 'down' ? 'text-emerald-800 dark:text-emerald-400'
                      : 'muted'
                return (
                  <div key={r.region} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 truncate text-sm font-medium sm:w-44">{r.region}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full bg-gold-500"
                        style={{ width: `${(r.events / activeRegions[0].events) * 100}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right font-mono text-xs font-bold">{r.events}</span>
                    <TrendIcon size={14} className={`shrink-0 ${trendColor}`} aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          </ChartPanel>
        </div>
      )}

      {/* ── GASTOS MILITARES ── */}
      {tab === 'gastos' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            className="xl:col-span-2"
            title="Evolução do gasto militar — Brasil"
            subtitle="Quanto o país destinou à defesa ao longo dos anos, em reais, dólares e proporção do PIB."
            method="Série histórica de despesa militar. Os valores em US$ vêm do indicador MS.MIL.XPND.CD (World Bank) quando a consulta responde; R$ e % do PIB são da base demonstrativa."
            badge={spendingBadge}
            rows={spending.data || []}
            filename="gasto-militar-brasil.csv"
            controls={
              <ToggleGroup
                label="Exibir"
                options={[
                  { id: 'dual', label: 'R$ + %PIB' },
                  { id: 'usd', label: 'US$' },
                  { id: 'pctGdp', label: '% do PIB' },
                ]}
                value={spendingMode}
                onChange={setSpendingMode}
              />
            }
            footnote="Proporção do PIB é a métrica comparável entre países e ao longo do tempo — valores nominais escondem inflação e câmbio."
          >
            <DataState
              loading={spending.loading}
              error={spending.error}
              onRetry={spending.refetch}
              skeleton={<SkeletonChart className="h-80" />}
              errorTitle="Não foi possível carregar a série de gastos"
            >
              <MilitarySpendingChart data={spending.data || []} mode={spendingMode} height={340} />
            </DataState>
          </ChartPanel>

          <ChartPanel
            title="Gasto militar global"
            subtitle="Como os maiores orçamentos do mundo se distribuem, em US$ bilhões."
            method="Treemap dos maiores orçamentos militares no ano de referência. A área de cada bloco é proporcional ao gasto absoluto."
            rows={globalSpendingTreemap}
            filename="gasto-militar-global.csv"
          >
            <BrazilDefenseBudget data={globalSpendingTreemap} height={340} />
          </ChartPanel>

          <ChartPanel
            title="Ações do setor de defesa"
            subtitle="Termômetro de mercado das principais fabricantes acompanhadas."
            method="Fechamento diário e variação percentual das empresas do portfólio de defesa. No modo demonstração, os preços são ilustrativos e não servem para decisão de investimento."
            badge={stocks.source === 'live' ? 'live' : 'demo'}
            rows={stockRows}
            filename="acoes-defesa.csv"
            footnote="Conteúdo informativo. Não constitui recomendação de investimento."
          >
            <DataState
              loading={stocks.loading}
              error={stocks.error}
              onRetry={stocks.refetch}
              skeleton={<SkeletonChart className="h-40" />}
              errorTitle="Não foi possível carregar as cotações"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(stocks.data || []).map((s) => (
                  <div key={s.ticker} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{s.ticker}</span>
                      <span className={`text-xs font-semibold ${s.change >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {s.change >= 0 ? '+' : ''}{s.change}%
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] muted">{s.name}</p>
                    <p className="mt-1 font-mono text-lg font-bold">{s.price}</p>
                    <Sparkline values={s.spark} color={s.change >= 0 ? '#2e7d46' : '#c0392b'} height={32} />
                  </div>
                ))}
              </div>
            </DataState>
          </ChartPanel>
        </div>
      )}

      {/* ── COMPARAÇÃO INTERNACIONAL ── */}
      {tab === 'internacional' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            title="América do Sul — % do PIB em defesa"
            subtitle="O esforço de defesa dos vizinhos na única métrica que permite comparar economias de tamanhos diferentes."
            method="Despesa militar dividida pelo PIB de cada país no ano de referência. O Brasil aparece destacado para leitura imediata da posição relativa."
            rows={southAmericaSpending}
            filename="america-do-sul-pct-pib.csv"
          >
            <ComparisonBarChart data={southAmericaSpending} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            title="Potências militares — % do PIB"
            subtitle="Onde o Brasil se posiciona diante das maiores forças armadas do mundo."
            method="Mesma métrica (% do PIB) aplicada às sete maiores referências acompanhadas. A meta da OTAN, de 2% do PIB, é o parâmetro internacional mais citado."
            rows={militaryPctGdpComparison}
            filename="potencias-pct-pib.csv"
            footnote="Referência: a meta da OTAN recomenda ao menos 2% do PIB — o Brasil opera bem abaixo desse patamar."
          >
            <ComparisonBarChart data={militaryPctGdpComparison} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            className="xl:col-span-2"
            title="Esforço relativo x gasto absoluto"
            subtitle="Duas leituras do mesmo país: a fatia do PIB dedicada à defesa e o volume de recursos que isso representa."
            method="Cruzamento do indicador de % do PIB com o gasto absoluto em US$ bilhões. Um país pode ter esforço relativo alto e volume baixo — e o inverso também ocorre."
            rows={internationalRows}
            filename="comparacao-internacional.csv"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <caption className="sr-only">Comparação internacional: percentual do PIB e gasto absoluto em defesa</caption>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th scope="col" className="py-2 pr-4">País</th>
                    <th scope="col" className="py-2 pr-4">% do PIB</th>
                    <th scope="col" className="py-2 pr-4">Gasto (US$ bi)</th>
                    <th scope="col" className="py-2">Proporção do maior</th>
                  </tr>
                </thead>
                <tbody>
                  {internationalRows.map((r) => (
                    <tr key={r.pais} className="border-b border-gray-100 dark:border-white/[0.06]">
                      <td className={`py-2 pr-4 font-medium ${r.pais === 'Brasil' ? 'text-gold-600 dark:text-gold-400' : ''}`}>{r.pais}</td>
                      <td className="py-2 pr-4 font-mono">{r.pctPib}%</td>
                      <td className="py-2 pr-4 font-mono">{r.gastoUSDbi}</td>
                      <td className="py-2">
                        <span className="block h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(r.gastoUSDbi / internationalRows[0].gastoUSDbi) * 100}%`,
                              background: r.pais === 'Brasil' ? '#caa733' : '#2e7d46',
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartPanel>
        </div>
      )}

      {/* ── RISCO POR PAÍS ── */}
      {tab === 'risco' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            className="xl:col-span-2"
            title="Mapa de calor de risco"
            subtitle="Intensidade da atividade de segurança monitorada por país — foco nas Américas."
            method="Índice 0–100 por país, derivado do volume e da gravidade dos eventos capturados no período. Passe o cursor sobre um país para ver as notícias associadas."
            rows={activityRows}
            filename="atividade-por-pais.csv"
          >
            <GlobalHeatmap height={420} />
          </ChartPanel>

          <ChartPanel
            title="Índice de alerta nacional"
            subtitle="Resumo de 0 a 100 da tensão de segurança do Brasil no momento."
            method="Combina o volume de eventos, a gravidade atribuída e a concentração geográfica das ocorrências das últimas duas semanas. É um resumo, não um veredito."
            rows={[{ indicador: 'Índice de alerta nacional', valor: alertIndex, escala: '0–100' }]}
            filename="indice-de-alerta.csv"
          >
            <GaugeChart value={alertIndex} height={300} />
          </ChartPanel>

          <ErrorBoundary variant="inline" scope="Nível de tensão por região">
            <TensionBoard />
          </ErrorBoundary>

          <ChartPanel
            className="xl:col-span-2"
            title="Boletim Geocorrente (EGN)"
            subtitle="Leitura geopolítica do ambiente marítimo, no formato dos boletins da Escola de Guerra Naval."
            method="Sínteses regionais com relevância atribuída por analista. Reproduz o formato editorial do boletim Geocorrente da EGN; os textos aqui são demonstrativos."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {geocorrenteBulletins.map((b) => {
                const relColor = b.relevance === 'Alta' ? '#c0392b' : b.relevance === 'Média' ? '#caa733' : '#2e7d46'
                return (
                  <article key={b.id} className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono font-semibold text-gold-600 dark:text-gold-400">{b.edition}</span>
                      <span className="muted">· {b.date}</span>
                      <span className="chip">{b.region}</span>
                      <span className="ml-auto rounded-full px-2 py-0.5 font-bold" style={{ background: relColor, color: textoSobre(relColor) }}>
                        {b.relevance}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold tracking-tight">{b.title}</h3>
                    <p className="mt-1 text-xs muted">{b.theme}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{b.summary}</p>
                  </article>
                )
              })}
            </div>
            <a
              href="https://www.marinha.mil.br/egn/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400"
            >
              <Anchor size={13} /> Fonte de referência: Escola de Guerra Naval (EGN) <ExternalLink size={13} />
            </a>
          </ChartPanel>
        </div>
      )}

      <p className="text-center text-xs muted">
        Dados ilustrativos, exceto onde marcado como “Ao vivo”. Use como demonstração de leitura analítica, não como fonte oficial.
      </p>
    </div>
  )
}
