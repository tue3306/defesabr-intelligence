import { Factory, Building2, Globe2, Package, ArrowRight, ShieldAlert, Download, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { riskMatrix, RISK_SEVERITY } from '../data/riskMatrix'
import Can from '../auth/Can'
import { exportCSV } from '../utils/exportUtils'
import toast from 'react-hot-toast'
import MetricCard from '../components/ui/MetricCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  bidSummary, bidCompanies, exportProducts, exportRegions,
} from '../data/defenseIndustry'

export default function DefenseIndustry() {
  // Catálogo de exportação em CSV — útil para quem prospecta parcerias.
  const exportCatalog = () => {
    exportCSV(
      exportProducts.map((p) => ({
        Produto: p.product,
        Fabricante: p.maker,
        Categoria: p.type,
        Clientes: p.clients.join(', '),
        Destaque: p.highlight,
      })),
      `bid-catalogo-exportacao-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success('Catálogo de exportação baixado em CSV')
  }

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
          <Building2 size={20} className="text-brand-400 dark:text-brand-300" /> Principais empresas
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
          <Globe2 size={18} className="text-brand-400 dark:text-brand-300" /> Destinos das exportações
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Package size={20} className="text-brand-400 dark:text-brand-300" /> Produtos e clientes
            </h2>
            <p className="mt-0.5 text-sm muted">Principais plataformas exportadas e seus mercados.</p>
          </div>
          <Can do="reports.export">
            <button onClick={exportCatalog} className="btn-ghost text-sm">
              <Download size={15} /> Exportar catálogo
            </button>
          </Can>
        </div>
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

      {/* DEPENDÊNCIAS CRÍTICAS — o que limita a autonomia da BID */}
      <DependenciesSection />

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

// -----------------------------------------------------------------------------
// DEPENDÊNCIAS CRÍTICAS
//
// Uma base industrial não se mede só pelo que exporta, mas pelo que precisa
// importar para produzir. Este bloco liga a BID ao risco correspondente da
// matriz — a mesma avaliação, lida a partir do ângulo industrial.
// -----------------------------------------------------------------------------
function DependenciesSection() {
  const risk = riskMatrix.find((r) => r.id === 'risk-dependencia')
  if (!risk) return null
  const sev = RISK_SEVERITY[risk.severity] || {}

  return (
    <section className="card border-l-4 p-5" style={{ borderLeftColor: sev.color }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <ShieldAlert size={18} style={{ color: sev.color }} /> Dependências críticas
          </h2>
          <p className="mt-0.5 text-sm muted">
            O que a base industrial ainda não produz sozinha — e por que isso importa.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sev.classes || ''}`}>
          Risco {sev.label} · {risk.score}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{risk.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">O que pressiona</p>
          <ul className="space-y-1.5">
            {risk.drivers.map((d) => (
              <li key={d} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sev.color }} />
                <span className="text-gray-700 dark:text-gray-300">{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">Caminhos de mitigação</p>
          <ul className="space-y-1.5">
            {risk.mitigations.map((mit) => (
              <li key={mit} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-military-green" />
                <span className="text-gray-700 dark:text-gray-300">{mit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <strong className="font-semibold">Impacto: </strong>{risk.impactBR}
      </p>

      <Link to="/riscos" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400">
        Ver na matriz de riscos <ChevronRight size={15} />
      </Link>
    </section>
  )
}
