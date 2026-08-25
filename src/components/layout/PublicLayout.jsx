import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LogIn, Menu, X, Sun, Moon, ArrowRight } from 'lucide-react'
import Footer from './Footer'
import Logo from '../ui/Logo'
import LoginModal from '../auth/LoginModal'
import ErrorBoundary from '../system/ErrorBoundary'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore, DEMO_PERSONAS } from '../../store/authStore'

// -----------------------------------------------------------------------------
// LAYOUT PÚBLICO — o que o VISITANTE vê. Sem menu lateral: só um cabeçalho
// institucional com as áreas abertas, o acesso e um atalho de demonstração
// que leva direto à experiência de um dos perfis autenticados.
// -----------------------------------------------------------------------------
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
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Fecha o menu ao navegar (evita menu preso aberto no mobile).
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-gold-600 dark:text-gold-400'
        : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
    }`

  const enterDemo = () => {
    loginAsDemo('analista')
    navigate('/painel')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-military-darker/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="DefesaBR Intelligence — início">
            <Logo size="md" />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Navegação pública">
            {PUBLIC_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>{n.label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Atalho de demonstração: entra na experiência completa em um clique */}
            <button
              onClick={enterDemo}
              className="hidden items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/10 lg:inline-flex"
              title={`Entrar como ${DEMO_PERSONAS.analista.roleLabel} (demonstração)`}
            >
              Ver demonstração <ArrowRight size={14} />
            </button>

            <button onClick={() => setLoginOpen(true)} className="btn-primary px-3 py-1.5 text-sm">
              <LogIn size={15} /> Entrar
            </button>

            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white md:hidden"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Faixa tricolor institucional */}
        <div className="tricolor-bar" />

        {menuOpen && (
          <nav className="space-y-1 border-t border-gray-200 px-4 py-2 dark:border-white/[0.06] md:hidden" aria-label="Navegação pública (móvel)">
            {PUBLIC_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                {n.label}
              </NavLink>
            ))}
            <button
              onClick={enterDemo}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gold-600 hover:bg-gray-100 dark:text-gold-400 dark:hover:bg-white/5"
            >
              Ver demonstração <ArrowRight size={14} />
            </button>
          </nav>
        )}
      </header>

      <main id="conteudo" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <ErrorBoundary scope="Conteúdo público">
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
