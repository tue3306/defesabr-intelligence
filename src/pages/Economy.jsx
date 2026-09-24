import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Euro, Percent, Landmark, Activity, Globe2, Vault, CalendarDays, CalendarClock,
  CalendarRange, Info, ArrowRight, Scale,
} from 'lucide-react'
import SeriesBcb, { formatar, diferenca } from '../components/charts/SeriesBcb'
import ComparisonBarChart from '../components/charts/ComparisonBarChart'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import PageHeader from '../components/ui/PageHeader'
import ErrorBoundary from '../components/system/ErrorBoundary'
import {
  useComparacaoPIB, useGastoGlobal, useIndicadoresBcb, usePib,
} from '../hooks/useDadosReais'

// -----------------------------------------------------------------------------
// ECONOMIA & DEFESA
//
// A tela tinha um selo "AO VIVO" no cabeçalho e outro em cada gráfico,
// inclusive nos do World Bank — dado ANUAL, publicado com um a dois anos de
// atraso. E mostrava a "Selic (mês)" de um mês pela metade, comparada com o
// mês cheio anterior: uma queda que não aconteceu.
//
// Agora cada número diz de quando é e de quanto em quanto tempo muda:
//
//   DIÁRIO  — o Banco Central publica todo dia útil (câmbio, meta da Selic,
//             reservas). A tela relê o servidor a cada minuto.
//   MENSAL  — publicado uma vez por mês (IPCA, IGP-M). O valor de hoje é o do
//             último mês fechado.
//   ANUAL   — World Bank. Série histórica, com o ano escrito ao lado.
//
// Nada aqui é estimado ou simulado. O único valor inventado da tela — o
// contrato de US$ 100 milhões — é declarado como exemplo, e o que ele ilustra
// (a cotação) é real.
// -----------------------------------------------------------------------------

const ICONE = {
  usd: DollarSign, eur: Euro, selicMeta: Landmark, ipca12: Percent, ipca: Percent,
  igpm: Percent, reservas: Vault, selicAno: Landmark,
}

// Os cartões, na ordem de quem lê jornal: câmbio e juros primeiro.
const CARTOES = ['usd', 'eur', 'selicMeta', 'ipca12', 'ipca', 'igpm', 'reservas', 'selicAno']

// O mesmo conjunto no seletor do gráfico. A "Selic acumulada no mês" (4390)
// fica de fora: a anualizada (4189) conta a mesma história numa unidade que
// se compara com a meta.
const NO_GRAFICO = ['usd', 'eur', 'selicMeta', 'selicAno', 'ipca12', 'ipca', 'igpm', 'reservas']

// Para inflação, cair é bom; para o resto, depende de quem lê.
const CAIR_EH_BOM = new Set(['ipca', 'ipca12', 'igpm'])

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-08-01" → "ago/2026" (mensal) ou "01/08/2026" (diária). */
function referencia(periodo, frequencia) {
  const p = String(periodo || '')
  const m = p.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return p
  return frequencia === 'mensal' ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`
}

const FREQ = {
  diaria: { rotulo: 'Diário', Icone: CalendarDays, classe: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' },
  mensal: { rotulo: 'Mensal', Icone: CalendarClock, classe: 'bg-brand-500/15 text-brand-700 dark:text-brand-300' },
  anual: { rotulo: 'Anual', Icone: CalendarRange, classe: 'bg-gold-500/15 text-gold-600 dark:text-gold-400' },
}

function Frequencia({ tipo }) {
  const f = FREQ[tipo]
  if (!f) return null
  const { Icone } = f
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${f.classe}`}>
      <Icone size={11} aria-hidden="true" /> {f.rotulo}
    </span>
  )
}

export default function Economy() {
  const vizinhanca = useComparacaoPIB('vizinhanca')
  const gastoGlobal = useGastoGlobal()
  // ATUALIZA SOZINHA. O Banco Central publica dólar e euro em dias úteis e os
  // índices uma vez por mês; o servidor relê a cada hora. A tela relê a cada
  // minuto para que o valor mostrado nunca seja o de quando a aba foi aberta —
  // e cada cartão diz a data de referência, para não virar promessa de tempo
  // real que a fonte não faz.
  const [recarga, setRecarga] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setRecarga((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const bcb = useIndicadoresBcb(recarga)
  const pib = usePib()
  const potencias = useComparacaoPIB('potencias')
  const series = bcb.series

  const nomesVizinhos = new Set(vizinhanca.data.map((d) => d.country))
  const orcamento = gastoGlobal.data
    .filter((g) => nomesVizinhos.has(g.name))
    .map((g) => ({ country: g.name, defenseUSD: g.value, period: g.period }))
    .sort((a, b) => b.defenseUSD - a.defenseUSD)
  const maxDef = Math.max(...orcamento.map((d) => d.defenseUSD), 1)
  const anoComparacao = vizinhanca.data[0]?.period
  const anoOrcamento = orcamento[0]?.period
  const anoPib = pib.data[0]?.period

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Economia & Defesa"
        description="Câmbio, juros, inflação e reservas do Banco Central, e o gasto em defesa comparado entre países pelo World Bank. Cada número diz de quando é."
        help="Orçamento de defesa é decisão política, mas sua execução real depende de câmbio, inflação e espaço fiscal — por isso estes indicadores aparecem aqui."
        breadcrumb={[{ label: 'Estratégico' }, { label: 'Economia & Defesa' }]}
        badges={<Badge type={series ? 'live' : 'sem-dado'} cadencia={series ? 'atualização automática' : undefined} />}
      />

      {/* COMO LER — antes de qualquer número */}
      <section className="card p-4" aria-labelledby="como-ler-economia">
        <h2 id="como-ler-economia" className="flex items-center gap-2 text-sm font-bold">
          <Info size={15} className="text-brand-500 dark:text-brand-300" aria-hidden="true" /> Como ler esta tela
        </h2>
        <ul className="mt-2 grid grid-cols-1 gap-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300 sm:grid-cols-3">
          <li className="flex items-start gap-2"><Frequencia tipo="diaria" /> <span>O Banco Central publica um valor novo todo dia útil. É o mais atual que existe.</span></li>
          <li className="flex items-start gap-2"><Frequencia tipo="mensal" /> <span>Publicado uma vez por mês. O valor de hoje é o do último mês fechado.</span></li>
          <li className="flex items-start gap-2"><Frequencia tipo="anual" /> <span>Série histórica do World Bank, com um a dois anos de atraso. O ano aparece ao lado.</span></li>
        </ul>
        <p className="mt-2 text-[11px] muted">
          Nenhum número desta tela é estimado ou simulado. A página confere o servidor a cada minuto;
          o servidor consulta o Banco Central a cada hora.
        </p>
      </section>

      {/* INDICADORES BRASIL — Banco Central */}
      <section aria-labelledby="indicadores-bcb">
        <h2 id="indicadores-bcb" className="mb-3 text-base font-bold tracking-tight">Indicadores do Brasil — Banco Central</h2>
        {series ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARTOES.map((id) => series[id] && <Indicador key={id} s={series[id]} />)}
          </div>
        ) : (
          <p className="rounded-lg border border-gray-200 p-4 text-sm muted dark:border-white/10" role="status">
            {bcb.carregando
              ? 'Consultando o Banco Central…'
              : 'Indicadores do Banco Central indisponíveis — o servidor de coleta não respondeu. Nenhum valor é mostrado no lugar.'}
          </p>
        )}
      </section>

      {/* POR QUE ISTO IMPORTA — o câmbio aplicado a um exemplo */}
      {series?.usd && <PorQueImporta usd={series.usd} eur={series.eur} />}

      {/* SÉRIES DO BANCO CENTRAL — a história por trás de cada cartão */}
      {series && (
        <section className="card p-5" aria-labelledby="series-bcb">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="series-bcb" className="text-base font-bold tracking-tight">Séries do Banco Central</h2>
            <span className="text-[11px] muted">relê sozinha a cada minuto</span>
          </div>
          <p className="mb-3 text-sm muted">
            O mesmo dado dos cartões, ao longo do tempo. Escolha a série: a linha tracejada é a média
            do período, para dizer se o valor de hoje é alto ou baixo para ele.
          </p>
          <ErrorBoundary variant="inline" scope="Séries do Banco Central">
            <SeriesBcb series={series} ordem={NO_GRAFICO} />
          </ErrorBoundary>
        </section>
      )}

      {/* COMPARATIVO INTERNACIONAL — World Bank, anual */}
      <section aria-labelledby="comparativo-wb" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="comparativo-wb" className="text-base font-bold tracking-tight">Defesa comparada entre países</h2>
          <Frequencia tipo="anual" />
          <span className="text-xs muted">World Bank Open Data — dado anual, publicado com atraso</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                Gasto militar (% do PIB){anoComparacao ? ` — ${anoComparacao}` : ''}
                <InfoTooltip text="Quanto da riqueza produzida pelo país num ano (o PIB) foi gasto com defesa. A referência da OTAN para seus membros é 2%." />
              </h3>
              <Badge type={vizinhanca.aoVivo ? 'live' : 'sem-dado'} cadencia={vizinhanca.aoVivo ? 'anual' : undefined} />
            </div>
            <p className="mb-2 text-xs muted">Brasil e vizinhos da América do Sul.</p>
            <ErrorBoundary variant="inline" scope="Comparativo regional de gasto militar">
              {vizinhanca.data.length ? (
                <ComparisonBarChart data={vizinhanca.data} highlightCode="BR" height={280} />
              ) : (
                <p className="py-10 text-center text-sm muted" role="status">
                  {vizinhanca.carregando ? 'Carregando a série do World Bank…' : 'Sem dado do World Bank nesta instalação.'}
                </p>
              )}
            </ErrorBoundary>
          </div>

          <div className="card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                Orçamento de defesa (US$ bilhões){anoOrcamento ? ` — ${anoOrcamento}` : ''}
                <InfoTooltip text="O valor total gasto com defesa no ano, convertido para dólares. Mostra o tamanho do orçamento; o gráfico ao lado mostra o esforço em relação à economia." />
              </h3>
              <Badge type={gastoGlobal.aoVivo ? 'live' : 'sem-dado'} cadencia={gastoGlobal.aoVivo ? 'anual' : undefined} />
            </div>
            <p className="mb-3 text-xs muted">Os mesmos países, em valor absoluto.</p>
            <ul className="space-y-2.5">
              {orcamento.map((d) => (
                <li key={d.country} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-sm font-medium">{d.country}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-700/30" aria-hidden="true">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(d.defenseUSD / maxDef) * 100}%`, background: d.country === 'Brasil' ? '#caa733' : '#1f8a4c' }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-sm font-bold">
                    {d.defenseUSD.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </span>
                </li>
              ))}
            </ul>
            {!orcamento.length && (
              <p className="text-sm muted" role="status">
                {gastoGlobal.carregando || vizinhanca.carregando ? 'Carregando a série do World Bank…' : 'Sem dado do World Bank nesta instalação.'}
              </p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
            PIB e esforço de defesa
            <InfoTooltip text="PIB é o valor de tudo o que o país produz num ano. A segunda coluna diz quanto dele vai para a defesa." />
          </h3>
          {/* OS DOIS ANOS, ESCRITOS. O World Bank publica o PIB antes do gasto
              militar: nesta coleta, PIB de 2025 e defesa de 2024. O título
              dizia "2025" para as duas colunas. */}
          <p className="mb-3 text-xs muted">
            Brasil, vizinhos e potências, em bilhões de dólares correntes.
            {anoPib && <> PIB de <strong>{anoPib}</strong></>}
            {anoComparacao && <>{anoPib ? '; ' : ' '}gasto militar de <strong>{anoComparacao}</strong></>}
            {anoPib && anoComparacao && anoPib !== anoComparacao && ' — o World Bank publica o gasto militar depois do PIB'}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">PIB em bilhões de dólares e gasto militar em porcentagem do PIB, por país</caption>
              <thead>
                <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
                  <th scope="col" className="py-2 pr-4">País</th>
                  <th scope="col" className="py-2 pr-4">PIB (US$ bi)</th>
                  <th scope="col" className="py-2">Defesa (% do PIB)</th>
                </tr>
              </thead>
              <tbody>
                {/* As duas colunas saem do mesmo endpoint e do mesmo ano de
                    referência — antes vinham de um array escrito à mão, com PIB
                    e percentual de anos diferentes na mesma linha. */}
                {pib.data.map((d) => {
                  const pct = vizinhanca.data.find((v) => v.country === d.country)
                    || potencias.data.find((v) => v.country === d.country)
                  return (
                    <tr key={d.country} className={`border-b border-gray-700/30 ${d.country === 'Brasil' ? 'font-semibold' : ''}`}>
                      <th scope="row" className="py-2 pr-4 text-left font-medium">
                        {d.country}{d.country === 'Brasil' && <span className="sr-only"> (destacado)</span>}
                      </th>
                      <td className="py-2 pr-4 font-mono">{d.gdpBi.toLocaleString('pt-BR')}</td>
                      <td className="py-2 font-mono">
                        {pct ? `${pct.pctGdp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p className="text-center text-xs muted">
        Fontes: Banco Central do Brasil (Sistema Gerenciador de Séries Temporais, SGS) e World Bank
        Open Data. Veja também{' '}
        <Link to="/dados" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Séries e indicadores</Link>{' '}
        e a{' '}
        <Link to="/industria" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Base Industrial</Link>{' '}
        (exportações do setor, pelo Comex Stat).
      </p>
    </div>
  )
}

/** Um cartão de indicador: valor, frequência, data de referência e o que mudou. */
function Indicador({ s }) {
  const Icone = ICONE[s.id] || Activity
  const v = s.ultimo?.value
  const anterior = s.pontos?.[s.pontos.length - 2]?.value
  let mudanca = null
  let rotuloMudanca = ''
  if (s.ultimaMudanca) {
    mudanca = diferenca(s.ultimaMudanca.de, s.ultimaMudanca.para, s.unit)
    rotuloMudanca = `na última decisão do Copom, em vigor desde ${referencia(s.ultimaMudanca.desde, 'diaria')}`
  } else if (s.variacao != null && anterior != null) {
    mudanca = diferenca(anterior, v, s.unit)
    rotuloMudanca = s.frequencia === 'mensal' ? 'em relação ao mês anterior' : 'em relação ao dia útil anterior'
  }
  const subiu = mudanca?.startsWith('+')
  const caiu = mudanca?.startsWith('−')
  const bom = CAIR_EH_BOM.has(s.id) ? (caiu ? true : subiu ? false : null) : null

  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider muted">
          {s.label}
          {s.descricao && <InfoTooltip text={s.descricao} label={`O que é ${s.label}?`} size={13} />}
        </h3>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-300" aria-hidden="true">
          <Icone size={17} />
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{formatar(v, s.unit)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <Frequencia tipo={s.frequencia} />
        <span className="muted">ref. {referencia(s.ultimo?.period, s.frequencia)}</span>
        {s.parcial && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-800 dark:text-amber-300">
            mês em curso — parcial
          </span>
        )}
      </div>
      {mudanca && (
        <p className="mt-2 text-xs">
          <span
            className={`font-semibold ${
              bom === true ? 'text-emerald-700 dark:text-emerald-400'
                : bom === false ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {subiu ? '▲ subiu' : caiu ? '▼ caiu' : '● estável'} {mudanca.replace(/^[+−]/, '')}
          </span>{' '}
          <span className="muted">{rotuloMudanca}</span>
        </p>
      )}
    </article>
  )
}

/**
 * O câmbio aplicado a um exemplo: quanto um contrato em moeda estrangeira
 * custa em reais agora, contra o começo da série. É a ponte entre "o dólar
 * subiu 0,5%" e o que isso significa para um programa que compra fora.
 */
function PorQueImporta({ usd, eur }) {
  const pontos = usd.pontos || []
  const inicio = pontos[0]
  const fim = pontos[pontos.length - 1]
  if (!inicio || !fim) return null
  const CONTRATO = 100_000_000
  const reais = (cot) => (CONTRATO * cot).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const dif = CONTRATO * (fim.value - inicio.value)
  return (
    <section className="card border-l-4 border-gold-500 p-5" aria-labelledby="por-que-importa">
      <h2 id="por-que-importa" className="flex items-center gap-2 text-base font-bold tracking-tight">
        <Scale size={17} className="text-gold-600 dark:text-gold-400" aria-hidden="true" /> Por que isso importa para a defesa?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        Caças, submarinos e radares costumam ser comprados em dólar ou euro, mas o orçamento é
        aprovado em reais. Quando a moeda estrangeira sobe, o mesmo contrato passa a custar mais —
        sem que ninguém tenha aprovado gasto novo.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider muted">Em {referencia(inicio.period, 'diaria')}</p>
          <p className="mt-1 font-mono text-lg font-bold">{reais(inicio.value)}</p>
          <p className="text-[11px] muted">dólar a {formatar(inicio.value, 'R$')}</p>
        </div>
        <div className="flex items-center justify-center" aria-hidden="true">
          <ArrowRight className="hidden text-gray-400 sm:block" size={22} />
        </div>
        <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider muted">Em {referencia(fim.period, 'diaria')}</p>
          <p className="mt-1 font-mono text-lg font-bold">{reais(fim.value)}</p>
          <p className="text-[11px] muted">dólar a {formatar(fim.value, 'R$')}</p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        Um contrato de <strong>US$ 100 milhões</strong> ficou{' '}
        <strong>{dif >= 0 ? 'mais caro' : 'mais barato'} em {Math.abs(dif).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</strong>{' '}
        nesse intervalo, só pela variação do câmbio.
        {eur?.ultimo && <> Com o euro a {formatar(eur.ultimo.value, 'R$')}, a mesma conta vale para compras europeias.</>}
      </p>
      <p className="mt-2 text-[11px] muted">
        O valor do contrato é um exemplo redondo, só para ilustrar; as cotações são as do Banco Central
        (PTAX de venda) nas datas indicadas.
      </p>
    </section>
  )
}
