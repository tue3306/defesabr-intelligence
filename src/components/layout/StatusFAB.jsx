import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, X, ArrowRight } from 'lucide-react'
import { iaConfigurada } from '../../services/ia'
import { useCan } from '../../auth/useCan'
import { APP_VERSION } from '../../services/config'
import { formatTime } from '../../utils/dateUtils'
import { useResource } from '../../hooks/useResource'
import { adminService } from '../../services'

// -----------------------------------------------------------------------------
// PAINEL FLUTUANTE DE STATUS — atalho de observabilidade do Administrador.
//
// Ele contava um array ESTÁTICO (`systemHealth`, em data/adminData.js) e o
// resultado era sempre o mesmo, ligado ou desligado o servidor. Pior: o que o
// array declarava tinha ficado falso. Ele dizia
//
//   coleta de fontes ....... "planned — conectores previstos"     (são 21, ativas)
//   armazenamento .......... "planned — banco no roadmap"          (SQLite, 700 artigos)
//   autenticação ........... "planned — sessão simulada"           (scrypt + token)
//   aplicação .............. "servida via GitHub Pages"            (Railway, com Node)
//
// Um indicador de saúde que não mede nada é pior que nenhum: ele dá confiança
// sem base. Agora vem de `/api/system/status`, que conta as capacidades a
// partir do próprio banco.
// -----------------------------------------------------------------------------
export default function StatusFAB() {
  const [open, setOpen] = useState(false)
  const can = useCan()
  const pode = can('admin.health')
  // O hook precisa ser chamado sempre, mesmo sem permissão: sair antes mudaria
  // a ordem dos hooks entre renders e o React quebraria.
  const saude = useResource(() => adminService.health(), [], { enabled: pode })

  if (!pode) return null

  // A forma vem da ponte (`GET /admin/health` → `/system/status`): contadores
  // no topo e o acervo em `archive`.
  const d = saude.data
  const ai = iaConfigurada()

  const degraded = d?.degraded ?? 0
  const operational = d?.operational ?? 0
  const total = d?.total ?? 0
  const totalFontes = d?.archive?.fontes ?? 0
  const fontesComErro = d?.archive?.fontesComErro ?? 0

  const overall = saude.error ? 'red'
    : saude.loading ? 'amber'
      : (degraded > 0 || fontesComErro > 0) ? 'amber'
        : 'green'
  const dotColor = { green: 'bg-military-green', amber: 'bg-military-amber', red: 'bg-military-red' }[overall]

  const checks = [
    {
      name: 'API de dados',
      ok: !saude.error,
      note: saude.error ? 'sem resposta' : saude.loading ? 'consultando…' : 'respondendo',
    },
    {
      name: 'Fontes de coleta',
      ok: !saude.error && fontesComErro === 0,
      note: totalFontes ? `${totalFontes - fontesComErro}/${totalFontes} responderam` : '—',
    },
    {
      name: 'Capacidades',
      ok: !saude.error && degraded === 0,
      note: total ? `${operational}/${total} operacionais` : '—',
    },
    {
      name: 'Síntese por IA',
      ok: ai,
      note: ai ? 'configurada' : 'não conectada',
    },
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
