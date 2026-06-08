import { Radio, TrendingUp, TrendingDown, Minus, ShieldAlert, AlertOctagon } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  narrativeSummary, narratives, SENTIMENT_CLR, fimiSignals,
} from '../data/narratives'

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus }
const TREND_CLR = { up: 'text-red-400', down: 'text-emerald-400', flat: 'text-gray-400' }

export default function Narratives() {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Radio size={22} />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              Monitor de Narrativas
              <InfoTooltip text="Acompanha como o Brasil e as Forças Armadas são retratados em mídia e redes, e identifica sinais de manipulação informacional estrangeira (FIMI). Conteúdo demonstrativo." />
            </h1>
            <p className="text-sm muted">Percepção pública e detecção de campanhas de desinformação (FIMI).</p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {narrativeSummary.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} hint={s.hint} accent={s.accent} />
        ))}
      </div>

      {/* NARRATIVAS */}
      <section>
        <h2 className="mb-1 text-lg font-bold tracking-tight">Narrativas em circulação</h2>
        <p className="mb-4 text-sm muted">Temas monitorados, com sentimento, alcance e classificação de origem.</p>
        <div className="space-y-3">
          {narratives.map((n) => {
            const Icon = TREND_ICON[n.trend]
            const suspect = n.classification.includes('FIMI')
            return (
              <div key={n.id} className={`card p-5 ${suspect ? 'border-l-4 border-red-500/60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight">{n.topic}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SENTIMENT_CLR[n.sentiment]}`}>{n.sentiment}</span>
                  {suspect && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                      <AlertOctagon size={11} /> Suspeita FIMI
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs muted">
                    <Icon size={14} className={TREND_CLR[n.trend]} /> alcance {n.reach}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-gray-300">{n.desc}</p>
                <p className="mt-2 text-xs muted">Classificação: <span className="font-semibold text-gray-300">{n.classification}</span></p>
              </div>
            )
          })}
        </div>
      </section>

      {/* SINAIS FIMI */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <ShieldAlert size={18} className="text-amber-400" /> Sinais de coordenação (FIMI)
          <InfoTooltip text="FIMI = Foreign Information Manipulation and Interference. São indícios usados para distinguir debate orgânico de campanhas coordenadas." />
        </h2>
        <p className="mb-4 text-sm muted">Como diferenciamos debate legítimo de manipulação coordenada.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fimiSignals.map((s) => (
            <div key={s.signal} className="rounded-lg border border-gray-700/40 p-3">
              <h3 className="text-sm font-bold text-amber-200">{s.signal}</h3>
              <p className="mt-0.5 text-sm muted">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-sm">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-brand-300" />
          <p className="text-gray-300">
            <span className="font-semibold text-brand-300">Nota: </span>
            nem todo conteúdo negativo é desinformação. O objetivo é proteger o debate legítimo e
            sinalizar apenas padrões de manipulação coordenada.
          </p>
        </div>
      </section>

      <p className="text-center text-xs muted">Conteúdo demonstrativo para fins de visualização.</p>
    </div>
  )
}
