import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Wallet,
  Globe2,
  ShieldAlert,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import DataState from '../components/ui/DataState'
import { SkeletonChart } from '../components/ui/Skeleton'
import ErrorBoundary from '../components/system/ErrorBoundary'
import SentimentChart from '../components/charts/SentimentChart'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import BrazilDefenseBudget from '../components/charts/BrazilDefenseBudget'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import GaugeChart, { LegendaAlerta } from '../components/charts/GaugeChart'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import { useNewsVolume } from '../hooks/useNewsVolume'
import {
  useGastoMilitar, useComparacaoPIB, useGastoGlobal, useVolumePorCategoria,
  useIndiceDeAlerta, useRegioesEstrategicas,
} from '../hooks/useDadosReais'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { exportCSV } from '../utils/exportUtils'

// -----------------------------------------------------------------------------
// DADOS & GRÁFICOS — as séries da plataforma organizadas por TEMA.
// Abas evitam a "parede de gráficos": cada aba responde a uma pergunta.
// -----------------------------------------------------------------------------

const fmtNum = (v, casas) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })

const TABS = [
  { id: 'volume', label: 'Volume & Categorias', icon: Layers },
  { id: 'gastos', label: 'Gastos militares', icon: Wallet },
  { id: 'internacional', label: 'Comparação internacional', icon: Globe2 },
  // Mede volume de cobertura, não risco (ver GlobalHeatmap).
  { id: 'risco', label: 'Cobertura por país', icon: ShieldAlert },
]

// Cabeçalhos do CSV em português: as linhas vêm com os nomes de campo da API.
// `null` tira a coluna (ex.: `trend`, que o hook fixa em 'flat').
const COLUNAS_CSV = {
  category: 'Categoria', atual: 'Últimos 30 dias', anterior: '30 dias anteriores',
  region: 'Região', events: 'Notícias', share: 'Participação (%)', trend: null,
  year: 'Ano', usd: 'Gasto (US$ bi)', pctGdp: '% do PIB', pctPib: '% do PIB',
  name: 'País', value: 'Gasto (US$ bi)', period: 'Ano',
  country: 'País', code: 'Código', pais: 'País', gastoUSDbi: 'Gasto (US$ bi)', mencoes: 'Menções',
  indicador: 'Indicador', valor: 'Valor', escala: 'Escala',
}

const paraCsv = (rows) => rows.map((linha) => Object.fromEntries(
  Object.entries(linha)
    .filter(([k]) => COLUNAS_CSV[k] !== null)
    .map(([k, v]) => [COLUNAS_CSV[k] || k, v]),
))

/** Exportação de uma série em CSV. A tela exige sessão, e toda conta exporta. */
function ExportCSVButton({ rows, filename, label }) {
  return (
    <button
      type="button"
      onClick={() => exportCSV(paraCsv(rows), filename)}
      className="chip transition-colors hover:border-gold-500/40 hover:text-gold-600 dark:hover:text-gold-400"
      aria-label={`Exportar ${label} em CSV`}
    >
      <FileSpreadsheet size={12} aria-hidden="true" /> CSV
    </button>
  )
}

/**
 * Moldura padrão de um gráfico: título, subtítulo (o QUE mostra), metodologia
 * em tooltip, selo de origem e exportação. O conteúdo fica dentro de um
 * ErrorBoundary para que uma falha de gráfico não derrube a aba inteira.
 */
function ChartPanel({
  title, subtitle, method, source, badge = 'sem-dado', rows, filename, controls, footnote, className = '', children,
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
          {subtitle && <p className="mt-0.5 max-w-2xl text-xs leading-relaxed muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* "Dado real" já aparece no cabeçalho da página; aqui, só a ausência. */}
          {badge !== 'live' && <Badge type={badge} />}
          {rows?.length > 0 && <ExportCSVButton rows={rows} filename={filename} label={title} />}
        </div>
      </header>

      {controls && <div className="mb-4">{controls}</div>}

      <ErrorBoundary variant="inline" scope={title}>{children}</ErrorBoundary>

      {(footnote || source) && (
        <p className="mt-3 text-[11px] leading-relaxed muted">
          {footnote}{footnote && source ? ' ' : ''}
          {source && <>Fonte: {source}.</>}
        </p>
      )}
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
  const [spendingMode, setSpendingMode] = useState('usd')

  // Todas as séries vêm do servidor; sem resposta, o painel mostra a ausência.
  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()
  const comparacao = useComparacaoPIB('vizinhanca')
  const potencias = useComparacaoPIB('potencias')
  const gastoGlobal = useGastoGlobal()
  const volumeCategoria = useVolumePorCategoria(30)
  const alerta = useIndiceDeAlerta(7)
  const regioes = useRegioesEstrategicas(180)
  // A mesma consulta que o <GlobalHeatmap /> faz internamente, para que o CSV
  // exportado ao lado do mapa carregue os números que o mapa pinta.
  // Acompanha o seletor de período do mapa.
  const [diasMapa, setDiasMapa] = useState(365)
  const paises = useResource(() => request('GET /news/countries', { params: { days: diasMapa } }), [diasMapa])

  // Cruza % do PIB com o gasto absoluto para a tabela internacional.
  const internationalRows = useMemo(
    () =>
      potencias.data
        .map((c) => ({
          pais: c.country,
          pctPib: c.pctGdp,
          gastoUSDbi: gastoGlobal.data.find((g) => g.name === c.country)?.value ?? null,
        }))
        .sort((a, b) => (b.gastoUSDbi ?? -1) - (a.gastoUSDbi ?? -1)),
    [potencias.data, gastoGlobal.data]
  )

  // O CSV do mapa carrega as mesmas contagens que o mapa pinta.
  const activityRows = useMemo(
    () => (paises.data?.items || []).map((p) => ({ pais: p.pt || p.nome, mencoes: p.total })),
    [paises.data]
  )

  const recarregar = () => { gasto.recarregar?.(); volume.recarregar?.() }

  // A origem mostrada no cabeçalho acompanha a aba aberta.
  const ORIGEM_DA_ABA = {
    volume: { texto: 'Acervo de notícias coletadas', vivo: volumeCategoria.aoVivo ?? volume.aoVivo, carregando: volumeCategoria.carregando },
    gastos: { texto: 'World Bank Open Data', vivo: gasto.aoVivo, carregando: gasto.carregando },
    internacional: { texto: 'World Bank Open Data', vivo: comparacao.aoVivo ?? gasto.aoVivo, carregando: comparacao.carregando },
    risco: { texto: 'Acervo de notícias coletadas', vivo: !!paises.data, carregando: paises.loading },
  }
  const origem = ORIGEM_DA_ABA[tab] || ORIGEM_DA_ABA.volume

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Séries e indicadores"
        description="Os gráficos da plataforma, organizados por tema: volume de notícias, gasto militar, comparação entre países e cobertura por país. Cada gráfico diz o que mostra e de onde vem o dado."
        help="Cada painel declara a sua fonte e o que ela mede. Quando o servidor não responde, o painel mostra a ausência — nenhuma série é substituída por valores de exemplo."
        breadcrumb={[{ label: 'Brasil em dados' }, { label: 'Séries e indicadores' }]}
        badges={<Badge type={origem.vivo ? 'live' : origem.carregando ? 'carregando' : 'sem-dado'} />}
        meta={[
          { label: 'Fonte', value: origem.vivo || origem.carregando ? origem.texto : `${origem.texto} — indisponível` },
        ]}
        actions={
          <button type="button" onClick={recarregar} className="btn-ghost" aria-label="Recarregar as séries de dados">
            <RefreshCw size={15} className={gasto.carregando ? 'animate-spin' : ''} /> Atualizar
          </button>
        }
      >
        <div className="-mb-1 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-white/10" role="tablist" aria-label="Temas de dados">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              id={`aba-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls="painel-dados"
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                e.preventDefault()
                const prox = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
                setTab(prox.id)
                document.getElementById(`aba-${prox.id}`)?.focus()
              }}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border-gold-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <t.icon size={16} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div id="painel-dados" role="tabpanel" aria-labelledby={`aba-${tab}`} className="space-y-6">

      {/* ── VOLUME & CATEGORIAS ── */}
      {tab === 'volume' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">


          <ChartPanel
            badge={volumeCategoria.aoVivo ? 'live' : 'sem-dado'}
            title="Volume por categoria — 30 dias"
            subtitle="Número de notícias de cada tema nos últimos 30 dias (barra grossa), comparado aos 30 dias anteriores (barra fina, cinza)."
            source="acervo de notícias coletadas pela plataforma"
            method="Contagem de matérias por categoria em duas janelas de 30 dias, ordenada por volume. O período anterior é a diferença entre a janela de 60 dias e a de 30 — a contagem, não uma estimativa. Mede COBERTURA, não ocorrência: dez matérias sobre a mesma operação são dez."
            rows={volumeCategoria.data}
            filename="volume-por-categoria.csv"
          >
            <SentimentChart data={volumeCategoria.data} height={320} />
          </ChartPanel>

          <ChartPanel
            badge={regioes.aoVivo ? 'live' : 'sem-dado'}
            title="Regiões estratégicas mais citadas"
            subtitle="Número de notícias que citam cada região estratégica nos últimos 180 dias."
            source="acervo de notícias coletadas pela plataforma"
            method="Contagem de MENÇÕES a cada região no texto das notícias coletadas — não de eventos. Dez matérias sobre a mesma operação são dez menções e um evento; o número mede cobertura, não ocorrência."
            rows={regioes.data}
            filename="regioes-mais-ativas.csv"
          >
            {regioes.data.length ? (
              <ul className="space-y-2.5" aria-label="Notícias por região estratégica">
                {regioes.data.map((r) => (
                  <li key={r.region} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm font-medium sm:w-44" title={r.region}>{r.region}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true">
                      <span
                        className="block h-full rounded-full bg-gold-500"
                        style={{ width: `${(r.events / (regioes.data[0]?.events || 1)) * 100}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono text-xs font-bold tabular-nums">
                      {r.events.toLocaleString('pt-BR')}<span className="sr-only"> notícias</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm muted" role="status">
                {regioes.carregando ? 'Carregando…' : 'Nenhuma notícia do período cita as regiões acompanhadas.'}
              </p>
            )}
          </ChartPanel>
        </div>
      )}

      {/* ── GASTOS MILITARES ── */}
      {tab === 'gastos' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            className="xl:col-span-2"
            title="Evolução do gasto militar — Brasil"
            subtitle="Quanto o Brasil gastou com defesa a cada ano. Use o botão para ver em dólares (US$ correntes) ou em porcentagem do PIB."
            source="World Bank Open Data"
            method="Série histórica de despesa militar do Brasil, indicadores MS.MIL.XPND.CD (US$ correntes) e MS.MIL.XPND.GD.ZS (% do PIB) do World Bank, coletados pelo servidor. Não há série em reais: o World Bank não a publica, e convertê-la pelo câmbio de hoje inventaria um número."
            badge={gasto.aoVivo ? 'live' : 'sem-dado'}
            rows={gasto.data}
            filename="gasto-militar-brasil.csv"
            controls={
              <ToggleGroup
                label="Exibir"
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
            className="xl:col-span-2"
            title="Gasto militar global"
            subtitle="Os maiores orçamentos militares do mundo no último ano publicado. Cada bloco é proporcional ao gasto, em bilhões de dólares (US$ bi)."
            source="World Bank Open Data"
            badge={gastoGlobal.aoVivo ? 'live' : 'sem-dado'}
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
            badge={comparacao.aoVivo ? 'live' : 'sem-dado'}
            title="América do Sul — % do PIB em defesa"
            subtitle="Quanto do PIB cada país da América do Sul gasta com defesa, em porcentagem. Comparar pela fatia do PIB permite pôr lado a lado economias de tamanhos diferentes."
            source="World Bank Open Data"
            method="Despesa militar dividida pelo PIB de cada país no ano de referência. O Brasil aparece destacado para leitura imediata da posição relativa."
            rows={comparacao.data}
            filename="america-do-sul-pct-pib.csv"
          >
            <ComparisonBarChart data={comparacao.data} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            badge={potencias.aoVivo ? 'live' : 'sem-dado'}
            title="Potências militares — % do PIB"
            subtitle="A mesma medida (% do PIB gasto com defesa) para o Brasil e as maiores potências militares."
            source="World Bank Open Data"
            method="Mesma métrica (% do PIB) aplicada às sete maiores referências acompanhadas. A meta da OTAN, de 2% do PIB, é o parâmetro internacional mais citado."
            rows={potencias.data}
            filename="potencias-pct-pib.csv"
            footnote="Referência: a OTAN pede aos países-membros ao menos 2% do PIB."
          >
            <ComparisonBarChart data={potencias.data} highlightCode="BR" height={340} />
          </ChartPanel>

          <ChartPanel
            className="xl:col-span-2"
            badge={internationalRows.length ? 'live' : 'sem-dado'}
            title="Esforço relativo x gasto absoluto"
            subtitle="Para cada potência, a fatia do PIB gasta com defesa (%) e o valor total em bilhões de dólares (US$ bi). Um país pode gastar uma fatia grande e um valor pequeno, e vice-versa."
            source="World Bank Open Data"
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
                    <th scope="col" className="py-2 pr-4 text-right">% do PIB</th>
                    <th scope="col" className="py-2 pr-4 text-right">Gasto (US$ bi)</th>
                    <th scope="col" className="py-2">Comparado ao maior gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {internationalRows.map((r) => (
                    <tr key={r.pais} className="border-b border-gray-100 dark:border-white/[0.06]">
                      <th scope="row" className={`py-2 pr-4 text-left font-medium ${r.pais === 'Brasil' ? 'text-gold-600 dark:text-gold-400' : ''}`}>{r.pais}</th>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{fmtNum(r.pctPib, 2)}%</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{r.gastoUSDbi == null ? '—' : fmtNum(r.gastoUSDbi, 1)}</td>
                      <td className="py-2">
                        <span className="block h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${((r.gastoUSDbi ?? 0) / (internationalRows[0].gastoUSDbi || 1)) * 100}%`,
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
            badge={paises.data?.items?.length ? 'live' : 'sem-dado'}
            title="Cobertura por país"
            subtitle="Quantas notícias coletadas no período escolhido citam cada país: quanto mais escuro, mais citações. O Brasil fica fora da escala de cor, porque aparece em quase toda notícia."
            source="acervo de notícias coletadas pela plataforma"
            method="Quantas notícias coletadas mencionam cada país, normalizado de 0 a 100 pelo país mais citado. Mede volume de cobertura, não risco. Passe o cursor sobre um país para ver as manchetes."
            rows={activityRows}
            filename="atividade-por-pais.csv"
          >
            <GlobalHeatmap height={420} onMudarDias={setDiasMapa} />
          </ChartPanel>

          <ChartPanel
            className="xl:col-span-2"
            badge={alerta.aoVivo ? 'live' : 'sem-dado'}
            title="Índice de alerta — 7 dias"
            subtitle="Um número de 0 a 100 que resume a urgência das notícias relevantes dos últimos 7 dias. Quanto maior, mais notícias urgentes."
            source="acervo de notícias coletadas pela plataforma"
            method="Cada matéria relevante do período pesa pela urgência atribuída pelo filtro: crítica 100, alta 70, média 40, baixa 15. O índice é a média. NORMAL abaixo de 35, ATENÇÃO até 59, ALERTA até 79, CRÍTICO a partir de 80. Mede a urgência do que foi noticiado, não o risco real."
            rows={[{ indicador: 'Índice de alerta nacional', valor: alerta.value, escala: '0–100' }]}
            filename="indice-de-alerta.csv"
          >
            <div className="mx-auto max-w-md">
              <GaugeChart value={alerta.value} height={300} />
              <LegendaAlerta />
            </div>
          </ChartPanel>

        </div>
      )}

      </div>

      <p className="text-center text-xs muted">
        Fontes: acervo coletado (notícias e proposições), World Bank Open Data, Banco Central (SGS) e
        Comex Stat (MDIC). Cada painel declara a origem da sua série.
      </p>
    </div>
  )
}
