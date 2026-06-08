import { Link } from 'react-router-dom'
import {
  Waves, Droplet, Ship, Radar, Anchor, AlertTriangle, ArrowRight,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  blueAmazonFacts, blueAmazonPillars, blueAmazonThreats, THREAT_LEVELS, navalAssets,
} from '../data/blueAmazon'
import { geocorrenteBulletins } from '../data/geocorrenteData'

const PILLAR_ICONS = { Droplet, Ship, Radar, Anchor }

export default function BlueAmazon() {
  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-[#0a2540] via-military-card to-brand-900/50 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-200">
            <Waves size={14} /> Domínio marítimo
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Amazônia Azul</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            Os 5,7 milhões de km² de mar sob jurisdição brasileira — fonte de petróleo, rotas e recursos.
            Protegê-la é uma prioridade estratégica nacional, sustentada por poder naval e vigilância.
          </p>
        </div>
      </div>

      {/* FATOS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {blueAmazonFacts.map((f) => (
          <MetricCard key={f.id} label={f.label} value={f.value} hint={f.hint} accent="brand" />
        ))}
      </div>

      {/* PILARES */}
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">Por que importa</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {blueAmazonPillars.map((p) => {
            const Icon = PILLAR_ICONS[p.icon] || Waves
            return (
              <div key={p.title} className="card p-5">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                  <Icon size={20} />
                </span>
                <h3 className="font-bold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{p.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* AMEAÇAS + MEIOS NAVAIS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <AlertTriangle size={18} className="text-amber-400" /> Ameaças monitoradas
          </h2>
          <p className="mb-4 text-sm muted">Riscos à soberania e aos recursos da Amazônia Azul.</p>
          <div className="space-y-3">
            {blueAmazonThreats.map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-700/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{t.name}</h3>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${THREAT_LEVELS[t.level]}`}>{t.level}</span>
                </div>
                <p className="mt-1 text-sm muted">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Anchor size={18} className="text-brand-400" /> Meios navais
            <InfoTooltip text="Ordem de batalha naval simplificada e ilustrativa. Inclui meios em serviço e em construção (PROSUB, Tamandaré)." />
          </h2>
          <p className="mb-4 mt-1 text-sm muted">Capacidade aproximada da Marinha do Brasil.</p>
          <div className="space-y-2.5">
            {navalAssets.map((a) => (
              <div key={a.type} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.type}</p>
                  <p className="truncate text-xs muted">{a.note}</p>
                </div>
                <span className="shrink-0 font-mono text-xl font-bold text-brand-300">{a.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs muted">Valores demonstrativos.</p>
        </section>
      </div>

      {/* BOLETIM GEOCORRENTE */}
      <section className="card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Radar size={18} className="text-brand-400" /> Boletim Geocorrente (EGN)
            <InfoTooltip text="Boletins no modelo da Escola de Guerra Naval, com análise geopolítica do ambiente marítimo. Conteúdo demonstrativo." />
          </h2>
          <Link to="/dados" className="text-xs font-semibold text-brand-400 hover:text-brand-300">Ver em Dados</Link>
        </div>
        <p className="mb-4 text-sm muted">Análises geopolíticas do ambiente marítimo, relacionadas à Amazônia Azul.</p>
        <div className="space-y-3">
          {geocorrenteBulletins.slice(0, 4).map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-700/40 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-brand-400">{b.edition}</span>
                <span className="muted">{b.region}</span>
                <span className="muted">·</span>
                <span className="muted">{b.theme}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 font-bold ${b.relevance === 'Alta' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{b.relevance}</span>
              </div>
              <h3 className="mt-1 text-sm font-bold">{b.title}</h3>
              <p className="mt-0.5 text-sm muted">{b.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-bold tracking-tight">Conheça os programas que protegem o mar brasileiro</h3>
          <p className="text-sm muted">PROSUB, Tamandaré e SisGAAz no acompanhamento de Programas Estratégicos.</p>
        </div>
        <Link to="/programas" className="btn-primary shrink-0">
          Ver programas <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
