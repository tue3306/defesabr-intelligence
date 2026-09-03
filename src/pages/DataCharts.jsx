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
import Sparkline from '../components/charts/Sparkline'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import SentimentChart from '../components/charts/SentimentChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import GaugeChart from '../components/charts/GaugeChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { useNewsVolume } from '../hooks/useNewsVolume'
import {
  useGastoMilitar, useComparacaoPIB, useGastoGlobal, useRadarCategorias,
  useIndiceDeAlerta, useRegioesEstrategicas,
} from '../hooks/useDadosReais'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { useGate } from '../auth/useCan'
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
// Aqui viviam VOLUME_PERIODS, VOLUME_ANCHOR e buildVolumeSeries(): um seletor
// de 14/30/90 dias e uma funcao que, quando o periodo pedido excedia o dado
// disponivel, PREENCHIA os dias que faltavam repetindo o ciclo observado com
// uma modulacao senoidal fixa.
//
// A funcao ja tinha um guarda — com dado ao vivo, devolvia so o que existia —,
// e o proprio comentario dela dizia por que: "seria apresentar dia inventado
// ao lado de dia coletado, no mesmo grafico, sem distincao possivel para quem
// olha". Com o servidor no ar, ela nunca extrapolava.
//
// Estava morta de duas maneiras. O seletor de periodo nunca foi ligado
// (`setVolumePeriod` jamais era chamado, entao o grafico ficava preso em 14
// dias), e `volumeSeries` era calculado num useMemo e nunca renderizado.
//
// Saiu inteira. Codigo de fabricacao sem consumidor e pior que codigo de
// fabricacao em uso: ninguem o ve funcionando errado, e alguem o reimporta.
// O grafico consome `useNewsVolume(14)` direto, que e medido.


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
  const [spendingMode, setSpendingMode] = useState('dual')

  // Gasto militar do Brasil: World Bank com fallback demonstrativo.
  // Aqui viviam dois `useResource` que chamavam clientes de API do NAVEGADOR,
  // ambos com queda para `mockData`:
  //
  //   `spending` buscava os dólares reais no World Bank e os MESCLAVA com o
  //   `brl` e o `pctGdp` do mock — uma série metade coletada e metade
  //   inventada, sem marca dizendo qual coluna era qual. Falhando a consulta,
  //   virava mock inteiro. E o hook real `useGastoMilitar()`, que lê o mesmo
  //   indicador pelo SERVIDOR, já era chamado três linhas abaixo e descartado.
  //
  //   `stocks` era pior: `fetchDefensePortfolio()` não chegava a fazer
  //   requisição nenhuma. Retornava o portfólio escrito à mão direto, sempre,
  //   com a justificativa de poupar cota de uma API que nunca era consultada.
  //   Preços e variações de ações de fabricantes, inventados, numa tela de
  //   dados. O painel saiu inteiro: não há fonte pública gratuita para isso, e
  //   cotação inventada é a que mais parece verdadeira.
  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()
  const comparacao = useComparacaoPIB('vizinhanca')
  const potencias = useComparacaoPIB('potencias')
  const gastoGlobal = useGastoGlobal()
  const radar = useRadarCategorias(30)
  const alerta = useIndiceDeAlerta(7)
  const regioes = useRegioesEstrategicas(180)
  // A mesma consulta que o <GlobalHeatmap /> faz internamente, para que o CSV
  // exportado ao lado do mapa carregue os números que o mapa pinta.
  const paises = useResource(() => request('GET /news/countries', { params: { days: 365 } }), [])

  // Cruza % do PIB com o gasto absoluto para a tabela internacional.
  const internationalRows = useMemo(
    () =>
      potencias.data
        .map((c) => ({
          pais: c.country,
          pctPib: c.pctGdp,
          gastoUSDbi: gastoGlobal.data.find((g) => g.name === c.country)?.value ?? 0,
        }))
        .sort((a, b) => b.gastoUSDbi - a.gastoUSDbi),
    [potencias.data, gastoGlobal.data]
  )

  // Esta linha exportava `countryActivity`: catorze países com "intensidade"
  // de 0 a 100 digitada à mão. O mapa logo abaixo conta MENÇÕES reais por
  // país, e o CSV ao lado dele dizia outra coisa — quem baixasse os dois teria
  // duas respostas para a mesma pergunta.
  const activityRows = useMemo(
    () => (paises.data?.items || []).map((p) => ({ pais: p.nome, mencoes: p.total })),
    [paises.data]
  )

  const recarregar = () => { gasto.recarregar?.(); volume.recarregar?.() }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Dados & Gráficos"
        description="As séries que sustentam a leitura de conjuntura: volume noticioso, esforço orçamentário e exposição a risco. Cada gráfico declara o que mostra e de onde vem."
        help="Cada painel declara a sua fonte e o que ela mede. Quando o servidor não responde, o painel mostra a ausência — nenhuma série é substituída por valores de exemplo."
        breadcrumb={[{ label: 'Painel', to: '/painel' }, { label: 'Dados & Gráficos' }]}
        badges={<Badge type={gasto.aoVivo ? 'live' : 'demo'} />}
        meta={[
          { label: 'Origem', value: gasto.aoVivo ? 'World Bank, via servidor' : 'indisponível' },
        ]}
        actions={
          <button type="button" onClick={recarregar} className="btn-ghost" aria-label="Recarregar as séries de dados">
            <RefreshCw size={15} className={gasto.carregando ? 'animate-spin' : ''} /> Atualizar
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
            badge={radar.aoVivo ? 'live' : 'demo'}
            title="Volume por categoria — 30 dias"
            subtitle="Compara o tema desta semana com a anterior; o descolamento indica o que está esquentando."
            method="Radar com a contagem semanal por categoria. A área 'atual' cobrindo a 'anterior' indica aumento de cobertura no tema."
            rows={radar.data}
            filename="volume-por-categoria.csv"
          >
            <SentimentChart data={radar.data} height={320} />
          </ChartPanel>

          <ChartPanel
            badge={regioes.aoVivo ? 'live' : 'demo'}
            title="Regiões estratégicas mais citadas"
            subtitle="Quantas notícias coletadas citam cada região estratégica no período."
            method="Contagem de MENÇÕES a cada região no texto das notícias coletadas — não de eventos. Dez matérias sobre a mesma operação são dez menções e um evento; o número mede cobertura, não ocorrência."
            rows={regioes.data}
            filename="regioes-mais-ativas.csv"
          >
            <div className="space-y-2.5">
              {regioes.data.map((r) => {
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
                        style={{ width: `${(r.events / (regioes.data[0]?.events || 1)) * 100}%` }}
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
            subtitle="Quanto o país destinou à defesa ao longo dos anos, em dólares e proporção do PIB."
            method="Série histórica de despesa militar do Brasil, indicadores MS.MIL.XPND.CD (US$ correntes) e MS.MIL.XPND.GD.ZS (% do PIB) do World Bank, coletados pelo servidor. Não há série em reais: o World Bank não a publica, e convertê-la pelo câmbio de hoje inventaria um número."
            badge={gasto.aoVivo ? 'live' : 'demo'}
            rows={gasto.data}
            filename="gasto-militar-brasil.csv"
            controls={
              <ToggleGroup
                label="Exibir"
                // "R$ + %PIB" saiu junto com a série em reais, que era do mock.
                options={[
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
              loading={gasto.carregando}
              empty={!gasto.data.length}
              skeleton={<SkeletonChart className="h-80" />}
              emptyProps={{ title: 'Série indisponível', hint: 'O servidor não respondeu à consulta do World Bank.' }}
            >
              <MilitarySpendingChart data={gasto.data} mode={spendingMode} height={340} />
            </DataState>
          </ChartPanel>

          <ChartPanel
            title="Gasto militar global"
            subtitle="Como os maiores orçamentos do mundo se distribuem, em US$ bilhões."
            badge={gastoGlobal.aoVivo ? 'live' : 'demo'}
            method="Treemap dos maiores orçamentos militares no último ano publicado. Indicador MS.MIL.XPND.CD do World Bank, coletado pelo servidor; a área de cada bloco é proporcional ao gasto absoluto."
            rows={gastoGlobal.data}
            filename="gasto-militar-global.csv"
          >
            <BrazilDefenseBudget data={gastoGlobal.data} height={340} />
          </ChartPanel>

        </div>
      )}

      {/* ── COMPARAÇÃO INTERNACIONAL ── */}
      {tab === 'internacional' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            badge={comparacao.aoVivo ? 'live' : 'demo'}
            title="América do Sul — % do PIB em defesa"
            subtitle="O esforço de defesa dos vizinhos na única métrica que permite comparar economias de tamanhos diferentes."
            method="Despesa militar dividida pelo PIB de cada país no ano de referência. O Brasil aparece destacado para leitura imediata da posição relativa."
            rows={comparacao.data}
            filename="america-do-sul-pct-pib.csv"
          >
            <ComparisonBarChart data={comparacao.data} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            badge={potencias.aoVivo ? 'live' : 'demo'}
            title="Potências militares — % do PIB"
            subtitle="Onde o Brasil se posiciona diante das maiores forças armadas do mundo."
            method="Mesma métrica (% do PIB) aplicada às sete maiores referências acompanhadas. A meta da OTAN, de 2% do PIB, é o parâmetro internacional mais citado."
            rows={potencias.data}
            filename="potencias-pct-pib.csv"
            footnote="Referência: a meta da OTAN recomenda ao menos 2% do PIB — o Brasil opera bem abaixo desse patamar."
          >
            <ComparisonBarChart data={potencias.data} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            className="xl:col-span-2"
            badge={internationalRows.length ? 'live' : 'demo'}
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
            badge={paises.data?.items?.length ? 'live' : 'demo'}
            title="Cobertura por país"
            subtitle="Quantas notícias coletadas mencionam cada país — foco nas Américas."
            method="Quantas notícias coletadas mencionam cada país, normalizado de 0 a 100 pelo país mais citado. Mede volume de cobertura, não risco. Passe o cursor sobre um país para ver as manchetes."
            rows={activityRows}
            filename="atividade-por-pais.csv"
          >
            <GlobalHeatmap height={420} />
          </ChartPanel>

          <ChartPanel
            badge={alerta.aoVivo ? 'live' : 'demo'}
            title="Índice de alerta nacional"
            subtitle="Resumo de 0 a 100 da tensão de segurança do Brasil no momento."
            method="Combina o volume de eventos, a gravidade atribuída e a concentração geográfica das ocorrências das últimas duas semanas. É um resumo, não um veredito."
            rows={[{ indicador: 'Índice de alerta nacional', valor: alerta.value, escala: '0–100' }]}
            filename="indice-de-alerta.csv"
          >
            <GaugeChart value={alerta.value} height={300} />
          </ChartPanel>

          {/* Havia aqui um <TensionBoard />, componente que deixou de existir
              quando a loja de tensão saiu — a mesma remoção que deixou
              "regions is not defined" no Ticker. O nome sobreviveu em dois
              arquivos e teria quebrado esta página ao montar, exatamente como
              o outro quebrou a produção.

              Nada entra no lugar: o painel "Regiões estratégicas mais citadas",
              logo acima, já mostra a mesma dimensão com dado que existe —
              contagem de menções no acervo, e não um nível de tensão que
              ninguém media. */}


        </div>
      )}

      <p className="text-center text-xs muted">
        Fontes: acervo coletado (notícias e proposições), World Bank Open Data, Banco Central (SGS) e
        Comex Stat (MDIC). Cada painel declara a origem da sua série.
      </p>
    </div>
  )
}
