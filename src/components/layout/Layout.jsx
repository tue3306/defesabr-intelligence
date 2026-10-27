import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import Ticker from './Ticker'
import StatusFAB from './StatusFAB'
import GuiaDaPlataforma from '../guia/GuiaDaPlataforma'
import OnboardingModal from '../ui/OnboardingModal'
import CommandPalette from '../ui/CommandPalette'
import PersonalizarInteresses from '../interesses/PersonalizarInteresses'
import VisitaGuiada from '../painel/VisitaGuiada'
import ErrorBoundary from '../system/ErrorBoundary'
import { useT } from '../../i18n'
import { useLiveNotifications } from '../../hooks/useLiveNotifications'

const COLLAPSE_KEY = 'defesabr-sidebar-collapsed'

export default function Layout() {
  const t = useT()
  const [mobileOpen, setMobileOpen] = useState(false)
  // A preferência de menu recolhido acompanha a pessoa entre sessões.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  useLiveNotifications()

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* modo privado */ }
      return next
    })
  }, [])

  // Fecha o menu móvel ao passar para desktop (evita overlay preso).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => e.matches && setMobileOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Qualquer navegação fecha o menu móvel — inclusive o Voltar do navegador e
  // links dentro do conteúdo, que não passam pelo clique num item do menu.
  const { pathname } = useLocation()
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Esc fecha o menu móvel.
  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Trava a rolagem do corpo enquanto o menu móvel estiver aberto.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="skip-link">{t('Pular para o conteúdo')}</a>

      <ErrorBoundary scope="Menu lateral" variant="inline">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />
      </ErrorBoundary>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <ErrorBoundary scope="Barra superior" variant="inline">
          <Navbar
            onToggleMobile={() => setMobileOpen((o) => !o)}
            onToggleCollapse={toggleCollapse}
            collapsed={collapsed}
          />
        </ErrorBoundary>
        <div className="tricolor-bar" />
        <ErrorBoundary scope="Faixa de indicadores" variant="inline" fallback={null}>
          <Ticker />
        </ErrorBoundary>
        <main id="conteudo" className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <Outlet />
        </main>
        <Footer />
      </div>

      <StatusFAB />
      {/* O guia fica no canto; o diagnóstico do administrador, logo acima dele. */}
      <GuiaDaPlataforma />
      <OnboardingModal />
      <CommandPalette />
      <PersonalizarInteresses />
      <VisitaGuiada />
    </div>
  )
}
