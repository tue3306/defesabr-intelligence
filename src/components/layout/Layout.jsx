import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import Ticker from './Ticker'
import StatusFAB from './StatusFAB'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <Navbar
          onToggleMobile={() => setMobileOpen((o) => !o)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          collapsed={collapsed}
        />
        <Ticker />
        <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>

      <StatusFAB />
    </div>
  )
}
