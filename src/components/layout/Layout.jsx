import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import Ticker from './Ticker'
import StatusFAB from './StatusFAB'
import OnboardingModal from '../ui/OnboardingModal'
import CommandPalette from '../ui/CommandPalette'
import AnalystAssistant from '../ui/AnalystAssistant'
import { useLiveNotifications } from '../../hooks/useLiveNotifications'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useLiveNotifications()

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <Navbar
          onToggleMobile={() => setMobileOpen((o) => !o)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          collapsed={collapsed}
        />
        <div className="tricolor-bar" />
        <Ticker />
        <main id="conteudo" className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 sm:px-6">
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
