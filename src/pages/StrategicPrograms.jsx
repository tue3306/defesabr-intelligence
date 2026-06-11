import { useState, useMemo } from 'react'
import { Target, Layers, Wallet, Activity, CheckCircle2, Circle, Calendar, Building2 } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  strategicPrograms, programsSummary, PROGRAM_FORCES, PROGRAM_STATUS,
} from '../data/strategicPrograms'

const FORCE_TABS = ['Todas', 'Marinha', 'Exército', 'FAB', 'Conjunto']

export default function StrategicPrograms() {
  const [force, setForce] = useState('Todas')

  const list = useMemo(
    () => (force === 'Todas' ? strategicPrograms : strategicPrograms.filter((p) => p.force === force)),
    [force]
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Target size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Programas Estratégicos de Defesa</h1>
            <p className="text-sm muted">
              Acompanhamento dos grandes projetos das Forças Armadas — progresso, orçamento e marcos de entrega.
            </p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Layers} label="Programas" value={String(programsSummary.total)} accent="brand" hint="acompanhados" />
        <MetricCard icon={Activity} label="Em execução" value={String(programsSummary.emExecucao)} accent="green" hint="ativos agora" />
        <MetricCard icon={Wallet} label="Investimento" value={`R$ ${programsSummary.investimentoBRL.toFixed(0)} bi`} accent="amber" hint="ciclo total (estim.)" />
        <MetricCard icon={Target} label="Progresso médio" value={`${programsSummary.progressoMedio}%`} accent="brand" hint="execução física" />
      </div>

      {/* FILTRO POR FORÇA */}
      <div className="flex flex-wrap gap-2">
        {FORCE_TABS.map((f) => (
          <button
            key={f}
            onClick={() => setForce(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              force === f ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* CARDS DE PROGRAMA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {list.map((p) => {
          const forceMeta = PROGRAM_FORCES[p.force]
          const statusMeta = PROGRAM_STATUS[p.status]
          return (
            <div key={p.id} className="card overflow-hidden">
              {/* faixa da força */}
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
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ background: `${forceMeta.color}22`, color: forceMeta.color === '#475569' ? '#a4a9b1' : forceMeta.color }}>
                    <Building2 size={12} /> {forceMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 muted"><Calendar size={12} /> {p.startYear}–{p.deliveryYear}</span>
                  <span className="inline-flex items-center gap-1 muted"><Wallet size={12} /> R$ {p.budgetBRL.toFixed(1)} bi</span>
                </div>

                {/* progresso */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold muted">Execução física</span>
                    <span className="font-mono font-bold">{p.progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-700/30">
                    <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: forceMeta.color }} />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-gray-300">{p.objective}</p>

                {/* marcos */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase muted">Marcos</p>
                  <ul className="space-y-1.5">
                    {p.milestones.map((m) => (
                      <li key={m.label} className="flex items-center gap-2 text-sm">
                        {m.done
                          ? <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                          : <Circle size={15} className="shrink-0 text-gray-500" />}
                        <span className={m.done ? 'text-gray-300' : 'muted'}>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* parceiro + impacto */}
                <div className="mt-4 rounded-lg bg-brand-500/10 p-3 text-sm">
                  <p className="font-semibold text-brand-300">📍 Impacto para o Brasil</p>
                  <p className="mt-1 text-gray-300">{p.impact}</p>
                  <p className="mt-2 text-xs muted">Parceiro / origem: {p.partner}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs muted">
        Valores demonstrativos para visualização.
        <InfoTooltip text="Os percentuais, orçamentos e marcos são estimativas ilustrativas com base em informações públicas — não são dados oficiais." />
      </p>
    </div>
  )
}
