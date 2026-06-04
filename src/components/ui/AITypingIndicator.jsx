import { motion } from 'framer-motion'
import { Check, Loader2, Bot } from 'lucide-react'

// Painel de progresso das etapas de geração com IA.
export default function AITypingIndicator({ steps = [], current = 0 }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-brand-400">
        <Bot size={18} />
        <span className="text-sm font-semibold">Processando com IA…</span>
      </div>
      <ul className="space-y-3">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  done
                    ? 'bg-military-green/30 text-emerald-300'
                    : active
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'bg-gray-600/20 text-gray-500'
                }`}
              >
                {done ? (
                  <Check size={14} />
                ) : active ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </span>
              <span className={done || active ? 'text-gray-200' : 'text-gray-500'}>{label}</span>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-700/50">
        <motion.div
          className="h-full bg-brand-500"
          animate={{ width: `${Math.min(100, (current / steps.length) * 100)}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  )
}
