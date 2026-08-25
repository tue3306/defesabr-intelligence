import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  Target, Layers, Wallet, Activity, CheckCircle2, Circle, Calendar, Building2,
  LayoutGrid, Table2, Download, Lock, Search, Handshake,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import ErrorBoundary from '../components/system/ErrorBoundary'
import { useGate } from '../auth/useCan'
import { PLAN_LABELS } from '../auth/permissions'
import { exportCSV } from '../utils/exportUtils'
import { tooltipStyle, axisStyle, gridStroke } from '../components/charts/chartTheme'
import {
  strategicPrograms, programsSummary, PROGRAM_FORCES, PROGRAM_STATUS,
} from '../data/strategicPrograms'

// Critérios de ordenação expostos ao usuário (rótulo = o que ele entende).
const SORTS = {
  progresso: { label: 'Maior avanço', compare: (a, b) => b.progress - a.progress },
  investimento: { label: 'Maior investimento', compare: (a, b) => b.budgetBRL - a.budgetBRL },
  entrega: { label: 'Entrega mais próxima', compare: (a, b) => a.deliveryYear - b.deliveryYear },
}

const brl = (v) => `R$ ${v.toFixed(1)} bi`

export default function StrategicPrograms() {
  const [query, setQuery] = useState('')
  const [force, setForce] = useState('todas')
  const [status, setStatus] = useState('todos')
  const [sort, setSort] = useState('progresso')
  const [view, setView] = useState('cartoes')
  const [detailId, setDetailId] = useState(null)

  const exportGate = useGate('reports.export')

  const list = useMemo(() => {
    const term = query.trim().toLowerCase()
    return strategicPrograms
      .filter((p) => {
        if (force !== 'todas' && p.force !== force) return false
        if (status !== 'todos' && p.status !== status) return false
        if (!term) return true
        return [p.name, p.full, p.partner, p.objective].join(' ').toLowerCase().includes(term)
      })
      .sort(SORTS[sort].compare)
  }, [query, force, status, sort])

  // Agregados por Força: base dos dois gráficos (investimento e avanço médio).
  const byForce = useMemo(
    () =>
      Object.keys(PROGRAM_FORCES).map((key) => {
        const items = strategicPrograms.filter((p) => p.force === key)
        return {
          key,
          label: PROGRAM_FORCES[key].label,
          color: PROGRAM_FORCES[key].color,
          programas: items.length,
          investimento: Number(items.reduce((s, p) => s + p.budgetBRL, 0).toFixed(1)),
          avanco: Math.round(items.reduce((s, p) => s + p.progress, 0) / (items.length || 1)),
        }
      }),
    []
  )

  const detail = detailId ? strategicPrograms.find((p) => p.id === detailId) : null

  const handleExportCSV = () => {
    exportCSV(
      list.map((p) => ({
        Programa: p.name,
        'Nome completo': p.full,
        Força: PROGRAM_FORCES[p.force].label,
        Situação: PROGRAM_STATUS[p.status].label,
        'Avanço (%)': p.progress,
        'Investimento (R$ bi)': p.budgetBRL,
        Início: p.startYear,
        Entrega: p.deliveryYear,
        Parceiro: p.partner,
      })),
      'programas-estrategicos.csv'
    )
    toast.success(`CSV gerado com ${list.length} programa${list.length > 1 ? 's' : ''}.`)
  }

  const clearFilters = () => {
    setQuery('')
    setForce('todas')
    setStatus('todos')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Programas Estratégicos de Defesa"
        description="Acompanhamento dos grandes projetos das Forças Armadas — avanço físico, investimento, marcos e parceiros tecnológicos."
        help="Percentuais, orçamentos e marcos são estimativas ilustrativas construídas a partir de informações públicas. Não substituem os dados oficiais do Ministério da Defesa."
        breadcrumb={[{ label: 'Brasil Estratégico' }, { label: 'Programas Estratégicos' }]}
        badges={<Badge type="demo" />}
        meta={[
          { label: 'Programas', value: String(programsSummary.total) },
          { label: 'Referência', value: 'ago/2026' },
        ]}
        actions={
          exportGate.allowed ? (
            <button onClick={handleExportCSV} disabled={!list.length} className="btn-ghost">
              <Download size={16} /> Exportar CSV
            </button>
          ) : (
            <Link
              to="/planos"
              className="btn-ghost"
              title={`Exportação disponível no plano ${PLAN_LABELS[exportGate.requiredPlan] || 'Profissional'}`}
            >
              <Lock size={16} /> Exportar CSV
              <span className="text-xs muted">
                {PLAN_LABELS[exportGate.requiredPlan] || 'Profissional'}
              </span>
            </Link>
          )
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Layers} label="Programas" value={String(programsSummary.total)} accent="brand" hint="acompanhados" />
        <MetricCard icon={Activity} label="Em execução" value={String(programsSummary.emExecucao)} accent="green" hint="ativos agora" />
        <MetricCard icon={Wallet} label="Investimento" value={`R$ ${programsSummary.investimentoBRL.toFixed(0)} bi`} accent="amber" hint="ciclo total (estim.)" />
        <MetricCard icon={Target} label="Avanço médio" value={`${programsSummary.progressoMedio}%`} accent="brand" hint="execução física" />
      </div>

      {/* FILTROS */}
      <section className="card p-4" aria-label="Filtros de programas">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block">
            <span className="sr-only">Buscar programa</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, parceiro ou objetivo"
              className="input pl-9"
            />
          </label>

          <select className="input" value={force} onChange={(e) => setForce(e.target.value)} aria-label="Filtrar por Força">
            <option value="todas">Todas as Forças</option>
            {Object.entries(PROGRAM_FORCES).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por situação">
            <option value="todos">Todas as situações</option>
            {Object.entries(PROGRAM_STATUS).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar programas">
            {Object.entries(SORTS).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs muted">
            {list.length} de {strategicPrograms.length} programas
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1" role="group" aria-label="Modo de visualização">
            <ViewButton active={view === 'cartoes'} onClick={() => setView('cartoes')} icon={LayoutGrid} label="Cartões" />
            <ViewButton active={view === 'tabela'} onClick={() => setView('tabela')} icon={Table2} label="Tabela comparativa" />
          </div>
        </div>
      </section>

      {/* LISTA */}
      {!list.length ? (
        <EmptyState
          tone="filter"
          icon={Search}
          title="Nenhum programa corresponde aos filtros"
          hint="Ajuste a busca, a Força ou a situação para voltar a ver os programas acompanhados."
          action={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : view === 'cartoes' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {list.map((p) => (
            <ProgramCard key={p.id} program={p} onOpen={() => setDetailId(p.id)} />
          ))}
        </div>
      ) : (
        <ComparisonTable list={list} onOpen={setDetailId} />
      )}

      {/* GRÁFICOS POR FORÇA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            Investimento por Força
            <InfoTooltip text="Soma dos orçamentos estimados de ciclo dos programas de cada Força, em bilhões de reais." />
          </h2>
          <p className="mb-4 mt-1 text-sm muted">Total estimado de ciclo, em R$ bi.</p>
          <ErrorBoundary variant="inline" scope="Investimento por Força">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byForce} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} formatter={(v) => [`R$ ${v} bi`, 'Investimento']} />
                <Bar dataKey="investimento" radius={[4, 4, 0, 0]} barSize={38}>
                  {byForce.map((f) => <Cell key={f.key} fill={f.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ErrorBoundary>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            Avanço médio por Força
            <InfoTooltip text="Média simples da execução física dos programas de cada Força — não é ponderada pelo tamanho do orçamento." />
          </h2>
          <p className="mb-4 mt-1 text-sm muted">Execução física média, em %.</p>
          <ErrorBoundary variant="inline" scope="Avanço médio por Força">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byForce} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} formatter={(v, _n, item) => [`${v}% · ${item.payload.programas} programa(s)`, 'Avanço médio']} />
                <Bar dataKey="avanco" radius={[4, 4, 0, 0]} barSize={38}>
                  {byForce.map((f) => <Cell key={f.key} fill={f.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ErrorBoundary>
        </div>
      </motion.section>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs muted">
        Dados ilustrativos — não constituem informação oficial.
        <InfoTooltip text="Os percentuais, orçamentos e marcos aproximam informações públicas do setor e servem à demonstração da plataforma." />
      </p>

      <ProgramDetail program={detail} onClose={() => setDetailId(null)} />
    </div>
  )
}

function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-gold-500 text-military-darker' : 'muted hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function ProgramCard({ program: p, onOpen }) {
  const forceMeta = PROGRAM_FORCES[p.force]
  const statusMeta = PROGRAM_STATUS[p.status]
  const done = p.milestones.filter((m) => m.done).length

  return (
    <article className="card overflow-hidden">
      {/* faixa da força — identifica o dono do programa antes de qualquer texto */}
      <div className="h-1.5 w-full" style={{ background: forceMeta.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
            <p className="text-sm muted">{p.full}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusMeta.classes}`}>{statusMeta.label}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip"><Building2 size={12} /> {forceMeta.label}</span>
          <span className="chip"><Calendar size={12} /> {p.startYear}–{p.deliveryYear}</span>
          <span className="chip"><Wallet size={12} /> {brl(p.budgetBRL)}</span>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold muted">Execução física</span>
            <span className="font-mono font-bold">{p.progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-500/20">
            <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: forceMeta.color }} />
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p.objective}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs muted">
            <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
            {done} de {p.milestones.length} marcos concluídos
          </span>
          <button onClick={onOpen} className="btn-ghost px-3 py-1.5 text-xs">
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  )
}

function ComparisonTable({ list, onOpen }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-base font-bold tracking-tight">Quadro comparativo</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Comparação dos programas estratégicos por Força, situação, avanço e investimento</caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase muted">
              <th scope="col" className="py-2 pr-3">Programa</th>
              <th scope="col" className="py-2 pr-3">Força</th>
              <th scope="col" className="py-2 pr-3">Situação</th>
              <th scope="col" className="py-2 pr-3 text-right">Avanço</th>
              <th scope="col" className="py-2 pr-3 text-right">R$ bi</th>
              <th scope="col" className="py-2 pr-3 text-right">Início</th>
              <th scope="col" className="py-2 pr-3 text-right">Entrega</th>
              <th scope="col" className="py-2">Parceiro</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const forceMeta = PROGRAM_FORCES[p.force]
              const statusMeta = PROGRAM_STATUS[p.status]
              return (
                <tr key={p.id} className="border-b border-white/[0.06]">
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => onOpen(p.id)}
                      className="text-left font-semibold hover:text-gold-500"
                      aria-label={`Abrir detalhes de ${p.name}`}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: forceMeta.color }} aria-hidden="true" />
                      {forceMeta.label}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.classes}`}>{statusMeta.label}</span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{p.progress}%</td>
                  <td className="py-2 pr-3 text-right font-mono">{p.budgetBRL.toFixed(1)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{p.startYear}</td>
                  <td className="py-2 pr-3 text-right font-mono">{p.deliveryYear}</td>
                  <td className="py-2 muted">{p.partner}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProgramDetail({ program: p, onClose }) {
  const forceMeta = p ? PROGRAM_FORCES[p.force] : null
  const statusMeta = p ? PROGRAM_STATUS[p.status] : null

  return (
    <Modal open={Boolean(p)} onClose={onClose} title={p ? `${p.name} — ${p.full}` : ''} maxWidth="max-w-2xl">
      {p && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip"><Building2 size={12} /> {forceMeta.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.classes}`}>{statusMeta.label}</span>
            <span className="chip"><Calendar size={12} /> {p.startYear}–{p.deliveryYear}</span>
            <span className="chip"><Wallet size={12} /> {brl(p.budgetBRL)}</span>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide muted">Objetivo</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p.objective}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide muted">Linha do tempo de marcos</h3>
            <ol className="mt-2 space-y-0">
              {p.milestones.map((m, i) => (
                <li key={m.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {m.done
                      ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                      : <Circle size={18} className="shrink-0 text-gray-400 dark:text-gray-500" />}
                    {i < p.milestones.length - 1 && (
                      <span className={`w-px flex-1 ${m.done ? 'bg-emerald-500/40' : 'bg-gray-500/25'}`} aria-hidden="true" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-semibold ${m.done ? '' : 'muted'}`}>{m.label}</p>
                    <p className="text-xs muted">{m.done ? 'Concluído' : 'Previsto'}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide muted">Investimento estimado</p>
              <p className="mt-1 font-mono text-xl font-bold">{brl(p.budgetBRL)}</p>
              <p className="mt-1 text-xs muted">Ciclo completo do programa</p>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide muted">
                <Handshake size={13} /> Parceiro / origem
              </p>
              <p className="mt-1 text-sm font-semibold">{p.partner}</p>
              <p className="mt-1 text-xs muted">Transferência de tecnologia associada</p>
            </div>
          </div>

          <div className="rounded-lg bg-gold-500/10 p-3">
            <p className="text-sm font-semibold text-gold-600 dark:text-gold-400">Impacto estratégico</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{p.impact}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
