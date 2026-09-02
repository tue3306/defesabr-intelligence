import { TrendingUp, TrendingDown } from 'lucide-react'

export default function MetricCard({ icon: Icon, label, value, delta, deltaPositive, hint, accent = 'brand' }) {
  const accentClass = {
    brand: 'text-brand-400 bg-brand-500/10',
    green: 'text-emerald-400 bg-military-green/15',
    amber: 'text-amber-400 bg-military-amber/15',
    red: 'text-red-400 bg-military-red/15',
  }[accent]

  return (
    <div className="card animate-fade-in-up p-5 transition-transform hover:-translate-y-0.5 hover:shadow-card-hover">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider muted">{label}</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${accentClass}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
                deltaPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {deltaPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta}
            </span>
          )}
          {hint && <span className="muted">{hint}</span>}
        </div>
      )}
    </div>
  )
}
