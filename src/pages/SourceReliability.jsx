import { useState } from 'react'
import { BadgeCheck, ChevronDown, ShieldQuestion, Database, Globe2, Workflow } from 'lucide-react'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  sourceReliability, reliabilityTier, reliabilityCriteria,
} from '../data/sourceReliability'
import {
  sourcesByCategory, SOURCE_STATUS, sourceStatusSummary,
} from '../data/monitoredSources'

const TYPES = ['Todas', 'Oficial', 'Imprensa', 'Especializada', 'Internacional', 'Redes']

export default function SourceReliability() {
  const [type, setType] = useState('Todas')
  const [methodOpen, setMethodOpen] = useState(false)

  const list = (type === 'Todas' ? sourceReliability : sourceReliability.filter((s) => s.type === type))
    .slice()
    .sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <BadgeCheck size={22} />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              Confiabilidade das Fontes
              <InfoTooltip text="Ferramenta do Analista: avalia cada veículo por confiabilidade (0–100), tipo e viés editorial percebido, para ponderar o peso de cada notícia." />
            </h1>
            <p className="text-sm muted">Avalie o peso de cada fonte antes de incorporá-la a uma análise.</p>
          </div>
        </div>
      </div>

      {/* SELO METODOLOGIA */}
      <div className="card overflow-hidden">
        <button onClick={() => setMethodOpen((o) => !o)} className="flex w-full items-center justify-between p-4" aria-expanded={methodOpen}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShieldQuestion size={17} className="text-brand-400" /> Como calculamos a confiabilidade
          </span>
          <ChevronDown size={18} className={`transition-transform ${methodOpen ? 'rotate-180' : ''}`} />
        </button>
        {methodOpen && (
          <div className="border-t border-gray-700/40 p-4">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {reliabilityCriteria.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" /> {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs muted">Pontuação demonstrativa. Em produção, deve ser auditável e revisada periodicamente.</p>
          </div>
        )}
      </div>

      {/* FILTRO */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              type === t ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {list.map((s) => {
          const tier = reliabilityTier(s.score)
          return (
            <div key={s.id} className="card flex items-center gap-4 p-4">
              {/* anel de score */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke={tier.ring} strokeWidth="3"
                    strokeDasharray={`${s.score} 100`} strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-mono text-sm font-bold">{s.score}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold tracking-tight">{s.name}</h3>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{s.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.classes}`}>{tier.label}</span>
                </div>
                <p className="mt-0.5 text-sm muted">{s.note}</p>
                <p className="mt-0.5 text-xs muted">Viés percebido: <span className="font-medium text-gray-300">{s.bias}</span></p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs muted">Avaliações demonstrativas — não constituem julgamento definitivo sobre os veículos.</p>

      {/* CATÁLOGO DE FONTES MONITORADAS */}
      <MonitoredSources />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Catálogo de fontes cadastradas no pipeline de coleta. As fontes estão
// CONFIGURADAS/PREPARADAS para integração — sem coleta ao vivo nesta fase.
// -----------------------------------------------------------------------------
function MonitoredSources() {
  const groups = sourcesByCategory()
  const summary = sourceStatusSummary()

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Database size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              Fontes monitoradas
              <InfoTooltip text="Veículos cadastrados no pipeline de coleta. Nesta demonstração as fontes estão configuradas/preparadas — a coleta ao vivo depende de um backend/proxy." />
            </h2>
            <p className="text-sm muted">Catálogo de fontes com metadados, prontas para integração via conector.</p>
          </div>
        </div>

        {/* Resumo honesto de status */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(summary).map(([key, count]) => {
            const meta = SOURCE_STATUS[key]
            if (!meta) return null
            return (
              <span key={key} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {count} {meta.label.toLowerCase()}
              </span>
            )
          })}
        </div>

        {/* Pipeline de ingestão (arquitetura preparada para backend) */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto rounded-lg bg-white/5 px-3 py-2 text-[11px] font-medium text-gray-400">
          <Workflow size={14} className="shrink-0 text-brand-400" />
          {['Fonte', 'Conector', 'Coleta', 'Normalização', 'Classificação', 'Armazenamento', 'Análise', 'UI'].map((step, i, arr) => (
            <span key={step} className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap">{step}</span>
              {i < arr.length - 1 && <span className="text-gray-600">→</span>}
            </span>
          ))}
        </div>
      </div>

      {groups.map((cat) => (
        <div key={cat.id} className="space-y-3">
          <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">{cat.label}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {cat.items.map((s) => {
              const tier = reliabilityTier(s.reliability)
              const st = SOURCE_STATUS[s.status]
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-bold tracking-tight">{s.name}</h4>
                      <a
                        href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-brand-400 hover:text-brand-300"
                      >
                        <Globe2 size={11} /> {s.domain}
                      </a>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`} title={st.desc}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 muted">{s.type}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 muted">{s.country}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 muted">{s.cadence}</span>
                    <span className={`rounded-full px-2 py-0.5 ${tier.classes}`}>Confiab. {s.reliability}</span>
                  </div>

                  <p className="mt-2 text-xs muted">
                    <span className="font-semibold text-gray-400">Relevância p/ o Brasil:</span> {s.brRelevance}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-center text-xs muted">
        Fontes configuradas para integração futura. Nenhuma coleta ao vivo é feita nesta demonstração —
        os conectores serão implementados por trás destes mesmos metadados quando houver backend.
      </p>
    </div>
  )
}
