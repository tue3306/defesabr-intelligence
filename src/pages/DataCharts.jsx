import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Database, Info, RefreshCw, Newspaper, AlertTriangle, Filter } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import ErrorBoundary from '../components/system/ErrorBoundary'
import { useResource } from '../hooks/useResource'
import { noticias } from '../services'
import { corDaCategoria, META_URGENCIA } from '../data/reference'
import { formatDateBR } from '../utils/dateUtils'

const TOOLTIP = {
  background: '#232a33', border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 10, fontSize: 12, color: '#f1f5f9',
}

// -----------------------------------------------------------------------------
// DADOS & GRÁFICOS
//
// Todo gráfico é uma AGREGAÇÃO feita pelo SERVIDOR, em SQL, sobre o que está
// no banco. Nenhum ponto é escolhido a dedo, e nenhuma curva é decorativa.
//
// Consequência assumida: numa instalação recém-iniciada alguns gráficos vêm
// vazios — e o vazio é informação. Preenchê-los com série de exemplo ensinaria
// o leitor a confiar num desenho que não representa nada.
// -----------------------------------------------------------------------------
export default function DataCharts() {
  const [dias, setDias] = useState(90)
  const { data, loading, error, refetch } = useResource(
    () => noticias.estatisticas({ days: dias }),
    [dias],
    { keepPreviousData: true }
  )

  const porDia = (data?.porDia || []).map((d) => ({ ...d, rotulo: formatDateBR(d.dia).slice(0, 5) }))
  const porCategoria = (data?.porCategoria || []).map((c) => ({ ...c, cor: corDaCategoria(c.nome) }))
  const porUrgencia = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']
    .map((u) => (data?.porUrgencia || []).find((x) => x.nome === u))
    .filter(Boolean)
    .map((u) => ({ ...u, cor: META_URGENCIA[u.nome]?.cor }))
  const porFonte = data?.porFonte || []
  const filtro = data?.filtro || {}

  const pico = porDia.reduce((m, d) => (d.total > (m?.total ?? 0) ? d : m), null)
  const totalPeriodo = porDia.reduce((a, d) => a + d.total, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Dados & Gráficos"
        description="Agregações do acervo, calculadas pelo servidor sobre o que foi realmente coletado."
        help="Nenhum gráfico usa série de exemplo. Se um gráfico está vazio, é porque ainda não há dado daquele tipo no banco."
        breadcrumb={[{ label: 'Dados públicos' }, { label: 'Dados & Gráficos' }]}
        actions={
          <button onClick={refetch} className="btn-ghost text-sm">
            <RefreshCw size={15} /> Atualizar
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                dias === d
                  ? 'bg-gold-500 text-military-darker'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              {d === 365 ? '1 ano' : `${d} dias`}
            </button>
          ))}
        </div>
      </PageHeader>

      <DataState loading={loading && !data} error={error} onRetry={refetch} skeletonCount={4}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={Newspaper} label="Relevantes na janela" value={String(totalPeriodo)} hint={`últimos ${dias} dias`} accent="brand" />
          <MetricCard icon={Database} label="Coletado na janela" value={String(filtro.coletados ?? 0)} hint="antes do filtro" accent="brand" />
          <MetricCard
            icon={Filter}
            label="Taxa de aprovação"
            value={filtro.coletados ? `${Math.round((filtro.aprovados / filtro.coletados) * 100)}%` : '—'}
            hint="do que a coleta trouxe"
            accent="amber"
          />
          <MetricCard
            icon={BarChart3}
            label="Pico diário"
            value={pico ? String(pico.total) : '—'}
            hint={pico ? formatDateBR(pico.dia) : 'sem dados'}
            accent="gold"
          />
        </div>

        {totalPeriodo === 0 ? (
          <EmptyState
            icon={Database}
            title="Nenhuma ocorrência relevante nesta janela"
            hint="Amplie a janela ou dispare uma coleta. Os gráficos são construídos a partir do que foi efetivamente coletado."
            action={{ label: 'Ampliar para 1 ano', onClick: () => setDias(365), icon: RefreshCw }}
          />
        ) : (
          <>
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                Volume diário
                <InfoTooltip text="Quantas notícias relevantes foram publicadas em cada dia. Um pico costuma indicar evento — não necessariamente gravidade." />
              </h2>
              <p className="mb-4 text-sm muted">{porDia.length} dia(s) com registro na janela</p>
              <ErrorBoundary variant="inline" scope="Volume diário">
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={porDia} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                      <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        contentStyle={TOOLTIP}
                        formatter={(v) => [`${v} ocorrência(s)`, 'Volume']}
                        labelFormatter={(_l, p) => (p?.[0]?.payload?.dia ? formatDateBR(p[0].payload.dia) : '')}
                      />
                      <Line type="monotone" dataKey="total" stroke="#caa733" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ErrorBoundary>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="card p-5">
                <h2 className="mb-1 text-base font-bold tracking-tight">Por categoria</h2>
                <p className="mb-4 text-sm muted">Classificação derivada por regra de palavra-chave</p>
                <ErrorBoundary variant="inline" scope="Categorias">
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={porCategoria} dataKey="total" nameKey="nome" innerRadius={52} outerRadius={88} paddingAngle={2}>
                          {porCategoria.map((c) => <Cell key={c.nome} fill={c.cor} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [`${v} ocorrência(s)`, n]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ErrorBoundary>
              </section>

              <section className="card p-5">
                <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
                  Por urgência
                  <InfoTooltip text="É esta distribuição que alimenta o nível de alerta do clipping: cada urgência tem peso declarado e a média é normalizada." />
                </h2>
                <p className="mb-4 text-sm muted">Base do cálculo do nível de alerta</p>
                <ErrorBoundary variant="inline" scope="Urgência">
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porUrgencia} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                        <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} formatter={(v) => [`${v} ocorrência(s)`, 'Volume']} />
                        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                          {porUrgencia.map((u) => <Cell key={u.nome} fill={u.cor} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ErrorBoundary>
              </section>
            </div>

            <section className="card p-5">
              <h2 className="mb-1 text-base font-bold tracking-tight">Contribuição por fonte</h2>
              <p className="mb-4 text-sm muted">
                Quem mais alimentou o acervo na janela.{' '}
                <Link to="/fontes" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
                  Ver a saúde de cada fonte
                </Link>
              </p>
              <ErrorBoundary variant="inline" scope="Fontes">
                <div style={{ height: Math.max(200, porFonte.length * 42) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porFonte} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={150} />
                      <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={TOOLTIP} formatter={(v) => [`${v} ocorrência(s)`, 'Volume']} />
                      <Bar dataKey="total" fill="#475569" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ErrorBoundary>
            </section>
          </>
        )}
      </DataState>

      <p className="flex items-start gap-1.5 rounded-lg bg-white/5 p-3 text-xs leading-relaxed muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        Todas as contagens vêm de consultas SQL sobre o acervo coletado. A taxa de aprovação é um
        dado sobre o SISTEMA, não sobre o mundo: mostra o quanto a coleta bruta precisa ser filtrada
        para virar produto.
      </p>
    </div>
  )
}
