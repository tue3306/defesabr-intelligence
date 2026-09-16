import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogIn, Menu, X, Sun, Moon, ArrowRight, UserPlus, Lock } from 'lucide-react'
import Footer from './Footer'
import Logo from '../ui/Logo'
import AuthModal from '../auth/AuthModal'
import ErrorBoundary from '../system/ErrorBoundary'
import { useTheme } from '../../hooks/useTheme'

// -----------------------------------------------------------------------------
// LAYOUT PÚBLICO — o que aparece fora do painel: página inicial, centro
// educacional e sobre.
//
// O MENU MOSTRAVA TRÊS LINKS E ESCONDIA O PRODUTO. Quem chega à página inicial
// via "Início · Centro Educacional · Sobre" e não tem por onde ver as telas que
// dão nome à plataforma — clipping, correlações, incidentes. Elas exigem conta,
// e é por isso que estavam fora; mas esconder o caminho não é o mesmo que
// explicá-lo. Agora elas aparecem com um cadeado: quem clica cai na tela que
// diz o que a conta alcança e oferece entrar ou criar conta.
//
// Este cabeçalho é só do VISITANTE: quem entra passa a ver o menu lateral
// completo (ver `RootLayout` em App.jsx), então aqui o cadeado vale sempre.
// -----------------------------------------------------------------------------
const PUBLIC_NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/clipping', label: 'Clipping', restrito: true },
  { to: '/correlacoes', label: 'Correlações', restrito: true },
  { to: '/ciberameacas', label: 'Incidentes', restrito: true },
  { to: '/aprender', label: 'Centro Educacional' },
  { to: '/sobre', label: 'Sobre' },
]

export default function PublicLayout() {
  // `aba` decide se o modal abre em Entrar ou em Criar conta. Antes havia
  // DOIS botões idênticos aqui, ambos escritos 'Entrar' — um deles atalho
  // para uma persona, o outro o modal. Agora um é Cadastro.
  const [authAberto, setAuthAberto] = useState(false)
  const [authAba, setAuthAba] = useState('entrar')
  const abrirAuth = (aba) => { setAuthAba(aba); setAuthAberto(true) }
  const [menuOpen, setMenuOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const { pathname } = useLocation()

  // Fecha o menu ao navegar (evita menu preso aberto no mobile).
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-gold-600 dark:text-gold-400'
        : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
    }`


  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-military-darker/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="DefesaBR Intelligence — início">
            <Logo size="md" />
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:ml-6 lg:flex lg:gap-1" aria-label="Navegação pública">
            {PUBLIC_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={linkClass}
                title={n.restrito ? 'Requer conta — a tela explica e oferece entrar' : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {n.label}
                  {n.restrito && <Lock size={11} className="text-gray-400" aria-label="requer conta" />}
                </span>
              </NavLink>
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

            <button
              onClick={() => abrirAuth('cadastrar')}
              className="hidden items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/10 sm:inline-flex"
            >
              <UserPlus size={15} /> Cadastrar
            </button>

            <button onClick={() => abrirAuth('entrar')} className="btn-primary px-3 py-1.5 text-sm">
              <LogIn size={15} /> Entrar
            </button>

            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
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
          <nav className="space-y-1 border-t border-gray-200 px-4 py-2 dark:border-white/[0.06] lg:hidden" aria-label="Navegação pública (móvel)">
            {PUBLIC_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                {n.label}
                {n.restrito && <Lock size={12} className="text-gray-400" aria-label="requer conta" />}
              </NavLink>
            ))}
            {/* No cabeçalho o botão "Cadastrar" some abaixo de sm; aqui ele
                precisa reaparecer, senão no celular só existe o caminho de
                quem já tem conta. */}
            <button
              onClick={() => abrirAuth('entrar')}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gold-600 hover:bg-gray-100 dark:text-gold-400 dark:hover:bg-white/5"
            >
              Entrar <ArrowRight size={14} />
            </button>
            <button
              onClick={() => abrirAuth('cadastrar')}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
            >
              <UserPlus size={14} /> Criar conta
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
      <AuthModal open={authAberto} onClose={() => setAuthAberto(false)} abaInicial={authAba} />
    </div>
  )
}
