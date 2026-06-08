import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, X } from 'lucide-react'
import { isApiConfigured } from '../../api/anthropic'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { alertMeta } from '../../utils/textUtils'
import { formatTime } from '../../utils/dateUtils'

// Widget flutuante de diagnóstico das APIs — exclusivo do Administrador.
export default function StatusFAB() {
  const [open, setOpen] = useState(false)
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const sources = useSettingsStore((s) => s.rssSources)
  const online = sources.filter((s) => s.enabled && s.status === 'online').length
  const total = sources.filter((s) => s.enabled).length
  const ai = isApiConfigured()

  const overall = !ai ? 'amber' : online < total ? 'amber' : 'green'
  const color = { green: 'bg-military-green', amber: 'bg-military-amber', red: 'bg-military-red' }[overall]

  const apis = [
    { name: 'Claude API', ok: ai, note: ai ? 'configurada' : 'modo demo' },
    { name: 'Fontes RSS', ok: online === total, note: `${online}/${total} online` },
    { name: 'AwesomeAPI (câmbio)', ok: true, note: 'ok' },
    { name: 'World Bank', ok: true, note: 'ok' },
  ]

  // Diagnóstico é exclusivo do Administrador.
  if (!isAdmin) return null

  return (
    <div className="fixed bottom-[5.5rem] right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="card mb-3 w-72 p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">Status do sistema</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {apis.map((a) => (
                <li key={a.name} className="flex items-center justify-between">
                  <span className="text-gray-300">{a.name}</span>
                  <span className="flex items-center gap-1.5 text-xs muted">
                    <span className={`h-2 w-2 rounded-full ${a.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {a.note}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-gray-700/40 pt-3 text-xs">
              <span className="muted">Nível de alerta</span>
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${alertMeta.ATENCAO.classes}`}>
                ATENÇÃO
              </span>
            </div>
            <p className="mt-2 text-[11px] muted">Atualizado às {formatTime()}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${color}`}
        aria-label="Status do sistema"
      >
        <Activity size={22} />
        <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: 'currentColor' }} />
      </button>
    </div>
  )
}
