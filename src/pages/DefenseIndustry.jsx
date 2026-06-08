import { Factory, Building2, Globe2, Package, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/ui/MetricCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  bidSummary, bidCompanies, exportProducts, exportRegions,
} from '../data/defenseIndustry'

export default function DefenseIndustry() {
  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="on-dark bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-200">
            <Factory size={14} /> Base Industrial de Defesa
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Indústria & Exportações</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            A Base Industrial de Defesa (BID) gera tecnologia, empregos e divisas. Do C-390 ao ASTROS,
            o Brasil exporta defesa e fortalece sua autonomia estratégica.
          </p>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {bidSummary.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} hint={s.hint} accent={s.accent} />
        ))}
      </div>

      {/* EMPRESAS */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Building2 size={20} className="text-brand-400" /> Principais empresas
        </h2>
        <p className="mb-4 text-sm muted">Empresas estratégicas que compõem o núcleo da BID brasileira.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bidCompanies.map((c) => (
            <div key={c.name} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold tracking-tight">{c.name}</h3>
              </div>
              <span className="mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{c.segment}</span>
              <p className="mt-2 text-sm text-gray-300"><span className="font-semibold">Carro-chefe:</span> {c.flagship}</p>
              <p className="mt-1 text-sm muted">{c.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DESTINOS DE EXPORTAÇÃO */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Globe2 size={18} className="text-brand-400" /> Destinos das exportações
          <InfoTooltip text="Distribuição percentual ilustrativa da pauta de exportação de defesa por região." />
        </h2>
        <p className="mb-4 text-sm muted">Para onde vai a defesa brasileira (participação na pauta).</p>
        <div className="space-y-2.5">
          {exportRegions.map((r) => (
            <div key={r.region} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm font-medium">{r.region}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-700/30">
                <span className="block h-full rounded-full" style={{ width: `${r.share}%`, background: r.color }} />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-bold">{r.share}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS E CLIENTES */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Package size={20} className="text-brand-400" /> Produtos e clientes
        </h2>
        <p className="mb-4 text-sm muted">Principais plataformas exportadas e seus mercados.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {exportProducts.map((p) => (
            <div key={p.product} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{p.product}</h3>
                  <p className="text-xs muted">{p.maker} · {p.type}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-300">{p.highlight}</p>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase muted">Clientes</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.clients.map((cl) => (
                    <span key={cl} className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-200">{cl}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-bold tracking-tight">A indústria por trás dos programas</h3>
          <p className="text-sm muted">Veja como esses produtos se conectam aos Programas Estratégicos.</p>
        </div>
        <Link to="/programas" className="btn-primary shrink-0">
          Ver programas <ArrowRight size={16} />
        </Link>
      </div>

      <p className="text-center text-xs muted">Valores demonstrativos para fins de visualização.</p>
    </div>
  )
}
