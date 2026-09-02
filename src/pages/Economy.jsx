import {
  DollarSign, TrendingUp, Info, Database, ExternalLink, Clock, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import ErrorBoundary from '../components/system/ErrorBoundary'
import { useResource } from '../hooks/useResource'
import { economia } from '../services'
import { formatarIndicador } from '../data/reference'
import { timeAgo } from '../utils/dateUtils'

const TOOLTIP = {
  background: '#232a33', border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 10, fontSize: 12, color: '#f1f5f9',
}

// -----------------------------------------------------------------------------
// ECONOMIA & DEFESA
//
// Séries oficiais do World Bank e câmbio da AwesomeAPI. Duas naturezas opostas
// de dado, e a tela precisa tratá-las diferente:
//
//  • O World Bank tem DEFASAGEM: o dado mais recente costuma ser de um ou dois
//    anos atrás. Por isso o ano aparece junto de todo valor — apresentá-lo
//    como "hoje" seria falso.
//  • O câmbio é o oposto: muda ao longo do dia, então o que vale é a hora da
//    coleta.
// -----------------------------------------------------------------------------
export default function Economy() {
  const { data, loading, error, refetch } = useResource(() => economia.indicadores(), [])

  const indicadores = data?.indicators || []
  const cambio = data?.exchange || {}
  const temDado = indicadores.some((i) => i.latest)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={DollarSign}
        title="Economia & Defesa"
        description="Indicadores oficiais que condicionam o orçamento e a execução dos programas de defesa."
        help="Séries do World Bank Open Data e câmbio da AwesomeAPI. Cada valor guarda o período a que se refere e a data em que foi coletado."
        breadcrumb={[{ label: 'Dados públicos' }, { label: 'Economia' }]}
        meta={data ? [{ label: 'Provedores', value: (data.providers || []).join(' · ') }] : []}
        actions={
          <button onClick={refetch} className="btn-ghost text-sm">
            <RefreshCw size={15} /> Atualizar
          </button>
        }
      />

      <DataState loading={loading} error={error} onRetry={refetch} skeletonCount={4}>
        {!temDado ? (
          <EmptyState
            icon={Database}
            title="Indicadores ainda não coletados"
            hint="As séries do World Bank são buscadas na primeira execução do servidor. Se acabou de instalar, a coleta pode não ter terminado."
            action={{ label: 'Ver o status da coleta', to: '/status' }}
          />
        ) : (
          <>
            {/* CÂMBIO */}
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <TrendingUp size={17} className="text-brand-400" /> Câmbio
                <InfoTooltip text="Cotação de compra (bid) da AwesomeAPI. Muda ao longo do dia — por isso mostramos a hora da coleta." />
              </h2>
              <p className="mt-0.5 text-xs muted">
                {cambio.usd?.fetched_at ? `coletado ${timeAgo(cambio.usd.fetched_at)}` : 'sem coleta registrada'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {[['USD / BRL', cambio.usd], ['EUR / BRL', cambio.eur]].map(([rotulo, v]) => (
                  <div key={rotulo} className="rounded-lg bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider muted">{rotulo}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
                      {v?.value ? `R$ ${Number(v.value).toFixed(4)}` : '—'}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed muted">
                <Info size={12} className="mt-0.5 shrink-0" />
                Programas de defesa compram tecnologia em moeda estrangeira. Uma desvalorização não
                muda o valor aprovado no orçamento — muda o quanto esse valor compra.
              </p>
            </section>

            {/* INDICADORES */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {indicadores.map((ind) => (
                <MetricCard
                  key={ind.code}
                  label={ind.label}
                  value={formatarIndicador(ind.latest?.value, ind.code)}
                  hint={ind.latest?.period ? `dado de ${ind.latest.period}` : 'sem dado publicado'}
                  accent={ind.code === 'MS.MIL.XPND.GD.ZS' ? 'green' : 'brand'}
                />
              ))}
            </div>

            {/* A defasagem é parte do dado, não uma ressalva de rodapé. */}
            <p className="flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm leading-relaxed">
              <Clock size={15} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
              <span className="text-gray-700 dark:text-gray-300">
                {data.nota}
              </span>
            </p>

            {/* SÉRIES */}
            {indicadores.filter((i) => i.series?.length > 1).map((ind) => (
              <section key={ind.code} className="card p-5">
                <h2 className="mb-1 text-base font-bold tracking-tight">{ind.label}</h2>
                <p className="mb-4 text-sm muted">
                  Série histórica do Brasil · {ind.series.length} ano(s) · World Bank
                </p>
                <ErrorBoundary variant="inline" scope={ind.label}>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ind.series} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={58} />
                        <Tooltip
                          contentStyle={TOOLTIP}
                          formatter={(v) => [formatarIndicador(v, ind.code), ind.label]}
                          labelFormatter={(l) => `Ano ${l}`}
                        />
                        <Line type="monotone" dataKey="value" stroke="#caa733" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ErrorBoundary>
              </section>
            ))}
          </>
        )}
      </DataState>

      <section className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
          <Database size={14} /> Origem dos dados
        </h2>
        <ul className="space-y-2 text-sm">
          {[
            ['World Bank Open Data', 'https://data.worldbank.org', 'Gasto militar (% do PIB e US$), efetivo das forças armadas e PIB.'],
            ['AwesomeAPI', 'https://docs.awesomeapi.com.br', 'Cotação USD/BRL e EUR/BRL, atualizada ao longo do dia.'],
          ].map(([nome, url, nota]) => (
            <li key={nome} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong>{nome}</strong> — {nota}{' '}
                <a href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-brand-500 hover:underline dark:text-brand-400">
                  {url.replace('https://', '')} <ExternalLink size={11} />
                </a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
