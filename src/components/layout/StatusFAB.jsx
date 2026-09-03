import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, X, ArrowRight } from 'lucide-react'
import { iaConfigurada } from '../../services/ia'
import { useSettingsStore } from '../../store/settingsStore'
import { useCan } from '../../auth/useCan'
import { APP_VERSION } from '../../services/config'
import { systemHealth } from '../../data/adminData'
import { formatTime } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// PAINEL FLUTUANTE DE STATUS — atalho de observabilidade do Administrador.
// Espelha (de forma resumida) o que o Console de Governança mostra em detalhe.
// -----------------------------------------------------------------------------
export default function StatusFAB() {
  const [open, setOpen] = useState(false)
  const can = useCan()
  const sources = useSettingsStore((s) => s.rssSources)

  // Diagnóstico é governança: exige a capacidade de saúde do sistema.
  if (!can('admin.health')) return null

  const enabled = sources.filter((s) => s.enabled)
  const online = enabled.filter((s) => s.status === 'online').length
  const ai = iaConfigurada()
  const operational = systemHealth.filter((s) => s.status === 'operational').length
  const degraded = systemHealth.filter((s) => s.status === 'degraded' || s.status === 'down').length

  const overall = degraded > 0 ? 'red' : ai && (enabled.length === 0 || online === enabled.length) ? 'green' : 'amber'
  const dotColor = { green: 'bg-military-green', amber: 'bg-military-amber', red: 'bg-military-red' }[overall]

  const checks = [
    { name: 'Camada de dados', ok: true, note: 'API — origem única' },
    {
      name: 'Fontes de coleta',
      ok: enabled.length === 0 || online === enabled.length,
      note: enabled.length ? `${online}/${enabled.length} online` : 'coleta desativada',
    },
    { name: 'Serviços monitorados', ok: degraded === 0, note: `${operational}/${systemHealth.length} operacionais` },
  ]

  return (
    <div className="fixed bottom-[5.5rem] right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="card mb-3 w-72 p-4 shadow-modal"
            role="dialog"
            aria-label="Status do sistema"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Status do sistema</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="Fechar painel de status"
              >
                <X size={16} />
              </button>
            </div>

            <ul className="space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-gray-700 dark:text-gray-300">{c.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs muted">
                    <span className={`h-2 w-2 rounded-full ${c.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {c.note}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-[11px] muted dark:border-gray-700/40">
              <span>v{APP_VERSION}</span>
              <span>Atualizado às {formatTime()}</span>
            </div>

            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400"
            >
              Abrir console de governança <ArrowRight size={13} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ${dotColor}`}
        aria-label="Status do sistema"
        aria-expanded={open}
      >
        <Activity size={22} />
        <span className="absolute inset-0 animate-ping rounded-full opacity-25" style={{ background: 'currentColor' }} />
      </button>
    </div>
  )
}
