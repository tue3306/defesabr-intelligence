import { useState, useMemo } from 'react'
import { Landmark, Building, FileText, ArrowRight } from 'lucide-react'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import { legislativeItems, LEG_STAGE } from '../data/legislative'
import { formatDateBR } from '../utils/dateUtils'

const HOUSES = ['Todas', 'Câmara', 'Senado']
const RELEVANCE_CLR = { Alta: 'bg-red-500/15 text-red-300', Média: 'bg-amber-500/15 text-amber-300', Baixa: 'bg-emerald-500/15 text-emerald-300' }

export default function Legislative() {
  const [house, setHouse] = useState('Todas')

  const list = useMemo(
    () => (house === 'Todas' ? legislativeItems : legislativeItems.filter((i) => i.house === house)),
    [house]
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Landmark size={22} />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              Radar Legislativo
              <InfoTooltip text="Acompanhamento de projetos de lei e propostas que afetam Defesa e Segurança. Dados demonstrativos; em produção, integrar as APIs abertas da Câmara e do Senado." />
            </h1>
            <p className="text-sm muted">Proposições e votações de Defesa em tramitação no Congresso Nacional.</p>
          </div>
        </div>
      </div>

      {/* FILTRO */}
      <div className="flex flex-wrap gap-2">
        {HOUSES.map((h) => (
          <button
            key={h}
            onClick={() => setHouse(h)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              house === h ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {list.map((item) => {
          const stage = LEG_STAGE[item.stage]
          return (
            <div key={item.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-brand-300">
                  <FileText size={14} /> {item.code}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold muted">
                  <Building size={11} /> {item.house}
                </span>
                <Badge type="category" value={item.theme} />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RELEVANCE_CLR[item.relevance]}`}>Relevância {item.relevance}</span>
                <span className="ml-auto text-xs muted">Atualizado em {formatDateBR(item.updated)}</span>
              </div>

              <h3 className="mt-2 text-base font-bold tracking-tight">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-300">{item.summary}</p>

              {/* tramitação */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold muted">Tramitação</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${stage.classes}`}>{stage.label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-700/30">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${stage.pct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] uppercase muted">
                  <span>Comissão</span><span>Plenário</span><span>Sanção</span><span>Lei</span>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm">
                <ArrowRight size={15} className="mt-0.5 shrink-0 text-brand-300" />
                <p className="text-gray-300"><span className="font-semibold text-brand-300">Impacto: </span>{item.impactBR}</p>
              </div>
              <p className="mt-2 text-xs muted">Relator(a): {item.rapporteur}</p>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs muted">Dados demonstrativos — não refletem a tramitação real em tempo real.</p>
    </div>
  )
}
