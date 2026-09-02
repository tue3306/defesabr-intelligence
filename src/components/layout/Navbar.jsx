import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Sun, Moon, PanelLeftClose, PanelLeft, Loader2, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { sistema } from '../../services'

// -----------------------------------------------------------------------------
// BARRA SUPERIOR
//
// Busca, tema, e um indicador de saúde que leva ao painel de status.
//
// O indicador não é enfeite: ele consulta a API de verdade e mostra quantas
// capacidades estão operacionais. Numa demonstração, é o que permite dizer
// "está tudo de pé" apontando para um número em vez de para uma impressão.
// -----------------------------------------------------------------------------
export default function Navbar({ onMenu, collapsed, onToggleCollapse }) {
  const navegar = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [consulta, setConsulta] = useState('')
  const [saude, setSaude] = useState(null)

  useEffect(() => {
    let vivo = true
    const carregar = async () => {
      try {
        const { data } = await sistema.status()
        if (vivo) setSaude(data.resumo)
      } catch {
        if (vivo) setSaude(null)
      }
    }
    carregar()
    const t = setInterval(carregar, 60_000)
    return () => { vivo = false; clearInterval(t) }
  }, [])

  const buscar = (e) => {
    e.preventDefault()
    const q = consulta.trim()
    if (q) navegar(`/busca?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-white/[0.06] dark:bg-military-darker/90">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <button
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 lg:block"
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <form onSubmit={buscar} className="relative min-w-0 flex-1 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <label htmlFor="busca-topo" className="sr-only">Buscar</label>
        <input
          id="busca-topo"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar notícias e proposições…"
          className="input py-1.5 pl-9 text-sm"
        />
      </form>

      {/* Indicador de saúde — número real, não bolinha decorativa. */}
      <Link
        to="/status"
        title={saude ? `${saude.operacional} capacidades operacionais, ${saude.degradado} degradadas` : 'Ver status da plataforma'}
        className="hidden items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-gold-500/50 dark:border-white/10 sm:flex"
      >
        {saude === null ? (
          <Loader2 size={13} className="animate-spin muted" />
        ) : (
          <span className={`h-2 w-2 rounded-full ${
            saude.degradado === 0 ? 'bg-emerald-500' : saude.saude >= 60 ? 'bg-amber-500' : 'bg-red-500'
          }`} />
        )}
        <Activity size={13} className="muted" />
        <span className="tabular-nums">{saude ? `${saude.saude}%` : '—'}</span>
      </Link>

      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
