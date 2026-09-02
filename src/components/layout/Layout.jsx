import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import CommandPalette from '../ui/CommandPalette'
import ErrorBoundary from '../system/ErrorBoundary'

const CHAVE_RECOLHIDO = 'defesabr-sidebar-collapsed'

export default function Layout() {
  const [menuMovel, setMenuMovel] = useState(false)
  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem(CHAVE_RECOLHIDO) === '1' } catch { return false }
  })

  const alternarRecolhido = useCallback(() => {
    setRecolhido((c) => {
      const proximo = !c
      try { localStorage.setItem(CHAVE_RECOLHIDO, proximo ? '1' : '0') } catch { /* modo privado */ }
      return proximo
    })
  }, [])

  // Fecha o menu móvel ao passar para desktop — sem isto o overlay fica preso
  // sobre a página inteira quando alguém redimensiona a janela.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const aoMudar = (e) => e.matches && setMenuMovel(false)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuMovel ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuMovel])

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

      <ErrorBoundary scope="Menu lateral" variant="inline">
        <Sidebar open={menuMovel} onClose={() => setMenuMovel(false)} collapsed={recolhido} />
      </ErrorBoundary>

      <div className={`transition-all duration-300 ${recolhido ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <ErrorBoundary scope="Barra superior" variant="inline">
          <Navbar
            onMenu={() => setMenuMovel((o) => !o)}
            onToggleCollapse={alternarRecolhido}
            collapsed={recolhido}
          />
        </ErrorBoundary>
        <div className="tricolor-bar" />
        <main id="conteudo" className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
        <Footer />
      </div>

      <CommandPalette />
    </div>
  )
}
