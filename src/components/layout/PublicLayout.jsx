import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogIn, Menu, X, Sun, Moon } from 'lucide-react'
import Footer from './Footer'
import Logo from '../ui/Logo'
import LoginModal from '../auth/LoginModal'
import { useTheme } from '../../hooks/useTheme'

// [ALTERADO] Layout PÚBLICO (visitante deslogado): NÃO mostra o menu lateral do app.
// Apenas um header institucional limpo com as áreas públicas + botão Entrar.
const PUBLIC_NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/planos', label: 'Planos' },
  { to: '/aprender', label: 'Centro Educacional' },
  { to: '/sobre', label: 'Sobre' },
]

export default function PublicLayout() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-brand-300' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
    }`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-military-darker/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="DefesaBR Intelligence — início">
            <Logo size="md" />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>{n.label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleTheme} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Alternar tema">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setLoginOpen(true)} className="btn-primary px-3 py-1.5 text-sm">
              <LogIn size={15} /> Entrar
            </button>
            <button onClick={() => setMenuOpen((o) => !o)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white md:hidden" aria-label="Menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Faixa tricolor patriótica */}
        <div className="tricolor-bar" />

        {menuOpen && (
          <nav className="space-y-1 border-t border-gray-200 px-4 py-2 dark:border-white/[0.06] md:hidden">
            {PUBLIC_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="conteudo" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
