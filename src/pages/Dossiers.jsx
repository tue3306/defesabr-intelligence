import { useState } from 'react'
import { Layers, ArrowLeft, MapPin, CheckCircle2, Activity, Tag } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { dossiers, DOSSIER_RISK } from '../data/dossiers'
import { formatDateBR } from '../utils/dateUtils'

export default function Dossiers() {
  const [openId, setOpenId] = useState(null)
  const active = dossiers.find((d) => d.id === openId)

  if (active) return <DossierDetail dossier={active} onBack={() => setOpenId(null)} />

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Layers size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dossiês "Em Foco"</h1>
            <p className="text-sm muted">
              Análises aprofundadas que reúnem contexto, pontos-chave e impacto para o Brasil num só lugar.
            </p>
          </div>
        </div>
      </div>

      {/* GRID DE DOSSIÊS */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {dossiers.map((d) => (
          <button
            key={d.id}
            onClick={() => setOpenId(d.id)}
            className="card group overflow-hidden text-left transition-colors hover:border-brand-500/50"
          >
            <div className={`on-dark bg-gradient-to-br ${d.cover} p-5`}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-200">{d.kicker}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${DOSSIER_RISK[d.risk]}`}>Risco {d.risk}</span>
              </div>
              <h3 className="mt-6 text-xl font-extrabold tracking-tight text-white">{d.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-300"><MapPin size={12} /> {d.region}</p>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-gray-300">{d.summary}</p>
              <div className="mt-3 flex items-center justify-between text-xs muted">
                <span>Atualizado em {formatDateBR(d.updated)}</span>
                <span className="font-semibold text-brand-400 group-hover:text-brand-300">Abrir dossiê →</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DossierDetail({ dossier: d, onBack }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300">
        <ArrowLeft size={16} /> Voltar aos dossiês
      </button>

      {/* CAPA */}
      <div className="card overflow-hidden">
        <div className={`on-dark bg-gradient-to-br ${d.cover} p-8 sm:p-10`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-200">{d.kicker}</span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${DOSSIER_RISK[d.risk]}`}>Risco {d.risk}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{d.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
            <MapPin size={14} /> {d.region} · atualizado em {formatDateBR(d.updated)}
          </p>
          <p className="mt-3 max-w-2xl text-gray-200">{d.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CONTEÚDO */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-2 text-base font-bold tracking-tight">Contexto</h2>
            <p className="text-sm leading-relaxed text-gray-300">{d.context}</p>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold tracking-tight">Pontos-chave</h2>
            <ul className="space-y-2">
              {d.keyPoints.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-400" />
                  <span className="text-gray-300">{k}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card border-l-4 border-brand-500 p-5">
            <h2 className="mb-2 text-base font-bold tracking-tight">📍 Impacto para o Brasil</h2>
            <p className="text-sm leading-relaxed text-gray-300">{d.impactBR}</p>
          </section>
        </div>

        {/* LATERAL */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
              <Activity size={15} /> Indicadores
            </h2>
            <div className="space-y-3">
              {d.indicators.map((ind) => (
                <div key={ind.name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-300">{ind.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold">{ind.value}</span>
                    <Badge type="alert" value={ind.status} />
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
              <Tag size={15} /> Temas relacionados
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {d.related.map((r) => <Badge key={r} type="category" value={r} />)}
            </div>
          </section>
        </div>
      </div>

      <p className="text-center text-xs muted">
        Conteúdo demonstrativo — síntese ilustrativa de fontes públicas.
      </p>
    </div>
  )
}
