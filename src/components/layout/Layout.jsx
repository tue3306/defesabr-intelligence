import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import Ticker from './Ticker'
import StatusFAB from './StatusFAB'
import OnboardingModal from '../ui/OnboardingModal'
import CommandPalette from '../ui/CommandPalette'
import AnalystAssistant from '../ui/AnalystAssistant'
import ErrorBoundary from '../system/ErrorBoundary'
import { useLiveNotifications } from '../../hooks/useLiveNotifications'

const COLLAPSE_KEY = 'defesabr-sidebar-collapsed'

export default function Layout() {
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

  // Trava a rolagem do corpo enquanto o menu móvel estiver aberto.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

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
        <main id="conteudo" className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
        <Footer />
      </div>

      <StatusFAB />
      <AnalystAssistant />
      <OnboardingModal />
      <CommandPalette />
    </div>
  )
}
