import { useState } from 'react'
import { Scale, Download, ExternalLink, Info, AlertTriangle, Database, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import ErrorBoundary from '../components/system/ErrorBoundary'
import { useResource } from '../hooks/useResource'
import { economia } from '../services'
import { INDICADORES, formatarIndicador } from '../data/reference'
import { exportCSV } from '../utils/exportUtils'

const OPCOES = Object.entries(INDICADORES).map(([code, m]) => ({ code, rotulo: m.rotulo }))

// -----------------------------------------------------------------------------
// BALANÇA MILITAR REGIONAL
//
// Brasil × vizinhos, nas MESMAS séries do World Bank: mesma fonte, mesmo
// método, mesmo indicador.
//
// A ressalva que a tela precisa fazer: o World Bank publica com defasagem
// DIFERENTE por país. Comparar o número de 2023 do Brasil com o de 2021 do
// Peru não é comparação, é ilusão — por isso o ano aparece em cada linha e a
// tela avisa quando os anos divergem.
// -----------------------------------------------------------------------------
export default function MilitaryBalance() {
  const [indicador, setIndicador] = useState('MS.MIL.XPND.GD.ZS')
  const { data, loading, error, refetch } = useResource(
    () => economia.comparacao(indicador),
    [indicador],
    { keepPreviousData: true }
  )

  const itens = data?.items || []
  const brasil = itens.find((i) => i.code === 'BRA')
  const posicao = brasil ? itens.indexOf(brasil) + 1 : null

  const exportar = () => {
    exportCSV(
      itens.map((i, idx) => ({
        'Posição': idx + 1,
        'País': i.country,
        Indicador: data.label,
        Valor: i.value,
        'Valor formatado': formatarIndicador(i.value, indicador),
        'Ano de referência': i.period || '',
        Fonte: 'World Bank Open Data',
      })),
      `balanca-militar-${indicador}-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${itens.length} país(es) exportado(s)`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Scale}
        title="Balança Militar Regional"
        description="Brasil e vizinhos sul-americanos nas mesmas séries oficiais do World Bank."
        help="Todos os números vêm da mesma base e do mesmo indicador. O ano aparece em cada país porque a defasagem de publicação varia."
        breadcrumb={[{ label: 'Dados públicos' }, { label: 'Balança Militar' }]}
        meta={data ? [{ label: 'Fonte', value: data.provider }] : []}
        actions={
          <button onClick={exportar} disabled={!itens.length} className="btn-ghost text-sm">
            <Download size={15} /> CSV
          </button>
        }
      />

      <section className="card p-5">
        <label htmlFor="mb-ind" className="mb-1 block text-xs font-medium muted">Indicador comparado</label>
        <select id="mb-ind" className="input" value={indicador} onChange={(e) => setIndicador(e.target.value)}>
          {OPCOES.map((o) => <option key={o.code} value={o.code}>{o.rotulo}</option>)}
        </select>
        <p className="mt-2 text-xs leading-relaxed muted">
          Gasto em <strong>% do PIB</strong> mede esforço relativo; em <strong>US$</strong> mede volume
          absoluto. Um país pequeno pode liderar no primeiro e ficar em último no segundo — são
          perguntas diferentes, e trocá-las é o erro mais comum ao ler este tipo de tabela.
        </p>
      </section>

      <DataState loading={loading && !data} error={error} onRetry={refetch} skeletonCount={3}>
        {itens.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Sem dados comparáveis para este indicador"
            hint="O World Bank não retornou valores para estes países. Tente outro indicador."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={Trophy}
                label="Brasil na região"
                value={posicao ? `${posicao}º de ${itens.length}` : '—'}
                hint={brasil ? formatarIndicador(brasil.value, indicador) : 'sem dado'}
                accent="green"
              />
              <MetricCard icon={Scale} label="Países comparados" value={String(itens.length)} hint="com dado disponível" accent="brand" />
              <MetricCard
                icon={Info}
                label="Ano de referência"
                value={data.periodos?.length === 1 ? data.periodos[0] : `${data.periodos?.[0]}–${data.periodos?.at(-1)}`}
                hint={data.periodosDistintos ? 'anos divergentes' : 'mesmo ano para todos'}
                accent={data.periodosDistintos ? 'amber' : 'green'}
              />
              <MetricCard
                icon={Trophy}
                label="Líder regional"
                value={itens[0] ? `${itens[0].flag} ${itens[0].country}` : '—'}
                hint={itens[0] ? formatarIndicador(itens[0].value, indicador) : ''}
                accent="gold"
              />
            </div>

            {data.periodosDistintos && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm leading-relaxed">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  Os países desta comparação têm <strong>anos de referência diferentes</strong>
                  {' '}({data.periodos.join(', ')}). O World Bank publica com defasagem distinta por
                  país — leia o ranking com essa ressalva.
                </span>
              </p>
            )}

            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                {data.label}
                <InfoTooltip text="Série oficial do World Bank. Passe o cursor sobre a barra para ver o valor exato e o ano." />
              </h2>
              <p className="mb-4 text-sm muted">Comparação entre {itens.length} países da região</p>

              <ErrorBoundary variant="inline" scope="Balança militar">
                <div style={{ height: Math.max(220, itens.length * 46) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={itens} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="country" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={82} />
                      <Tooltip
                        cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                        contentStyle={{ background: '#232a33', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, fontSize: 12, color: '#f1f5f9' }}
                        formatter={(v, _n, e) => [`${formatarIndicador(v, indicador)} (${e?.payload?.period || 's/ ano'})`, data.label]}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {itens.map((i) => <Cell key={i.code} fill={i.code === 'BRA' ? '#caa733' : '#475569'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ErrorBoundary>
            </section>

            <section className="card overflow-x-auto p-0">
              <table className="w-full min-w-[480px] text-sm">
                <caption className="px-4 pt-4 text-left text-xs muted">
                  Valores exatos, com o ano de referência de cada país.
                </caption>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide muted dark:border-white/10">
                    <th scope="col" className="px-4 py-3 font-semibold">#</th>
                    <th scope="col" className="px-4 py-3 font-semibold">País</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">{data.label}</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i, idx) => (
                    <tr key={i.code} className={`border-b border-gray-100 last:border-0 dark:border-white/[0.06] ${
                      i.code === 'BRA' ? 'bg-gold-500/10' : ''
                    }`}>
                      <td className="px-4 py-2.5 tabular-nums muted">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold">
                        <span aria-hidden="true">{i.flag}</span> {i.country}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                        {formatarIndicador(i.value, indicador)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums muted">{i.period || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </DataState>

      <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed muted">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          Séries do{' '}
          <a href="https://data.worldbank.org" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-brand-500 hover:underline dark:text-brand-400">
            World Bank Open Data <ExternalLink size={10} />
          </a>
          . Gasto militar e efetivo são estimativas do próprio organismo, sujeitas a revisão — não
          são declarações oficiais dos países.
        </span>
      </p>
    </div>
  )
}
