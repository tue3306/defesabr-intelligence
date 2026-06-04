import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function MetricCard({ icon: Icon, label, value, delta, deltaPositive, hint, accent = 'brand' }) {
  const accentClass = {
    brand: 'text-brand-400 bg-brand-500/10',
    green: 'text-emerald-400 bg-military-green/15',
    amber: 'text-amber-400 bg-military-amber/15',
    red: 'text-red-400 bg-military-red/15',
  }[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide muted">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                deltaPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {deltaPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {delta}
            </span>
          )}
          {hint && <span className="muted">{hint}</span>}
        </div>
      )}
    </motion.div>
  )
}
