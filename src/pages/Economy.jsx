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
  useComparacaoPIB, useGastoGlobal, useIndicadoresBcb, usePib,
} from '../hooks/useDadosReais'

// Chaves pelos ids das séries do Banco Central (ver server/src/collectors/bcb.js).
const IND_ICON = { usd: TrendingUp, ipca: Percent, selic: Landmark, igpm: Percent }

export default function Economy() {
  // Mapeia o campo para o ComparisonBarChart (espera `pctGdp`).
  // Os dois comparativos vinham de `southAmericaEconomy`, escrito à mão. O
  // servidor coleta as duas séries do World Bank — % do PIB e gasto absoluto —
  // para treze países, e é de lá que elas passam a sair.
  const vizinhanca = useComparacaoPIB('vizinhanca')
  const gastoGlobal = useGastoGlobal()
  const bcb = useIndicadoresBcb()
  const pib = usePib()
  const potencias = useComparacaoPIB('potencias')
  const potenciasPct = potencias.data

  const pctGdpData = vizinhanca.data
  // O gráfico de barras de orçamento usa os mesmos países da vizinhança, com
  // o valor absoluto. Cruzamos as duas respostas pelo nome do país.
  const nomesVizinhos = new Set(vizinhanca.data.map((d) => d.country))
  const orcamento = gastoGlobal.data
    .filter((g) => nomesVizinhos.has(g.name))
    .map((g) => ({ country: g.name, defenseUSD: g.value }))
    .sort((a, b) => b.defenseUSD - a.defenseUSD)
  const maxDef = Math.max(...orcamento.map((d) => d.defenseUSD), 1)
  const inflationVals = (bcb.series?.ipca?.pontos || []).map((p) => p.value)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Economia & Defesa"
        description="Indicadores do Banco Central atualizados no dia e o comparativo de gasto em defesa entre países, do World Bank."
        help="Orçamento de defesa é decisão política, mas sua execução real depende de câmbio, inflação e espaço fiscal — por isso estes indicadores aparecem aqui."
        breadcrumb={[{ label: 'Dados & Relatórios' }, { label: 'Economia & Defesa' }]}
        badges={<Badge type={vizinhanca.aoVivo ? 'live' : 'demo'} />}
      />

      {/* INDICADORES BRASIL — Banco Central, atualizados no dia */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bcb.series
          ? Object.values(bcb.series).map((s) => (
            <MetricCard
              key={s.id}
              icon={IND_ICON[s.id] || Activity}
              label={s.label}
              value={`${s.unit === 'R$' ? 'R$ ' : ''}${String(s.ultimo?.value ?? '—').replace('.', ',')}${s.unit === '%' ? '%' : ''}`}
              delta={s.variacao != null ? `${s.variacao > 0 ? '+' : ''}${String(s.variacao).replace('.', ',')}` : undefined}
              // Para inflação e juros, subir é ruim; para o dólar depende de
              // quem olha. Só marcamos como positivo o que é inequívoco.
              deltaPositive={s.id === 'ipca' || s.id === 'igpm' ? s.variacao < 0 : undefined}
              hint={s.ultimo?.period ? `referência ${s.ultimo.period}` : ''}
              accent={s.id === 'usd' ? 'brand' : s.id === 'ipca' ? 'amber' : 'green'}
            />
          ))
          : (
            <p className="col-span-full rounded-lg border border-gray-200 p-4 text-sm muted dark:border-white/10">
              {bcb.carregando
                ? 'Consultando o Banco Central…'
                : 'Indicadores do Banco Central indisponíveis — o servidor de coleta não respondeu.'}
            </p>
          )}
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
          <p className="mt-1 text-3xl font-bold">
            {bcb.series?.ipca?.ultimo?.value != null
              ? `${String(bcb.series.ipca.ultimo.value).replace('.', ',')}%`
              : '—'}
          </p>
          {/* Dizia "acumulado 12 meses" exibindo a variação MENSAL. A série do
              SGS é mensal; o rótulo passa a corresponder ao número. */}
          <p className="text-xs muted">
            variação do mês
            {bcb.series?.ipca?.ultimo?.period ? ` · ${bcb.series.ipca.ultimo.period}` : ''}
          </p>
          <div className="mt-3">
            <ErrorBoundary variant="inline" scope="Série de inflação">
              <Sparkline values={inflationVals} color="#caa733" height={48} />
            </ErrorBoundary>
          </div>
          <p className="mt-2 text-[11px] muted">
            Últimos {inflationVals.length} meses · Banco Central (SGS)
          </p>
        </div>
      </div>

      {/* COMPARATIVO AMÉRICA DO SUL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Gasto militar (% do PIB)</h2>
            <Badge type={vizinhanca.aoVivo ? 'live' : 'demo'} />
          </div>
          <ErrorBoundary variant="inline" scope="Comparativo regional de gasto militar">
            <ComparisonBarChart data={pctGdpData} highlightCode="BR" height={300} />
          </ErrorBoundary>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Orçamento de defesa (US$ bi)</h2>
            <Badge type={gastoGlobal.aoVivo ? 'live' : 'demo'} />
          </div>
          <div className="space-y-2.5">
            {orcamento.map((d) => (
              <div key={d.country} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-sm font-medium">{d.country}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-700/30">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(d.defenseUSD / maxDef) * 100}%`, background: d.country === 'Brasil' ? '#caa733' : '#1f8a4c' }}
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
                {/* As duas colunas vinham de um array escrito à mão. Agora saem
                    do mesmo endpoint e do mesmo ano de referência — o que antes
                    não era verdade: PIB e percentual eram de anos diferentes,
                    somados na mesma linha. */}
                {pib.data.map((d) => {
                  const pct = vizinhanca.data.find((v) => v.country === d.country)
                    || potenciasPct.find((v) => v.country === d.country)
                  return (
                    <tr key={d.country} className="border-b border-gray-700/30">
                      <td className="py-2 pr-4 font-medium">{d.country}</td>
                      <td className="py-2 pr-4 font-mono">{d.gdpBi.toLocaleString('pt-BR')}</td>
                      <td className="py-2 font-mono">
                        {pct ? `${String(pct.pctGdp).replace('.', ',')}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>


      </div>
      <p className="text-center text-xs muted">
        Fontes: Banco Central (SGS) para os indicadores do dia; World Bank Open Data para a
        comparação entre países. Nenhum número desta tela é estimado.
      </p>
      {/* COMO O CÂMBIO AFETA OS PROGRAMAS */}

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

