import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/system/ErrorBoundary'
import ApiStatusBanner from './components/system/ApiStatusBanner'
import { useSettingsStore, applyTheme } from './store/settingsStore'

// -----------------------------------------------------------------------------
// ROTAS
//
// Só existe rota para tela com DADO REAL por trás. As páginas que dependiam de
// conteúdo analítico inventado — dossiês, matriz de riscos, análise semanal,
// mesa de trabalho — foram removidas: exigem análise humana ou modelo de
// linguagem, e nenhum dos dois existe nesta etapa.
//
// O que sobrou é menor e verdadeiro. É a troca certa para uma demonstração:
// poucas funcionalidades que funcionam valem mais que muitas que parecem.
// -----------------------------------------------------------------------------

const Landing = lazy(() => import('./pages/Landing'))
const DailyClipping = lazy(() => import('./pages/DailyClipping'))
const Archive = lazy(() => import('./pages/Archive'))
const Legislative = lazy(() => import('./pages/Legislative'))
const Economy = lazy(() => import('./pages/Economy'))
const MilitaryBalance = lazy(() => import('./pages/MilitaryBalance'))
const DataCharts = lazy(() => import('./pages/DataCharts'))
const CoverageMap = lazy(() => import('./pages/CoverageMap'))
const Sources = lazy(() => import('./pages/Sources'))
const SystemStatus = lazy(() => import('./pages/SystemStatus'))
const Search = lazy(() => import('./pages/Search'))
const Learn = lazy(() => import('./pages/Learn'))
const About = lazy(() => import('./pages/About'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-gold-500" size={32} />
      <span className="text-sm muted">Carregando…</span>
    </div>
  )
}

/** Cada rota é isolada: uma falha num módulo não derruba a aplicação. */
function Page({ scope, children }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary key={pathname} scope={scope}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const { pathname } = useLocation()

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [pathname])

  return (
    <ErrorBoundary scope="Aplicação">
      <ApiStatusBanner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Page scope="Início"><Landing /></Page>} />

          {/* Coleta */}
          <Route path="/clipping" element={<Page scope="Clipping"><DailyClipping /></Page>} />
          <Route path="/arquivo" element={<Page scope="Acervo"><Archive /></Page>} />
          <Route path="/fontes" element={<Page scope="Fontes"><Sources /></Page>} />

          {/* Dados públicos */}
          <Route path="/legislativo" element={<Page scope="Legislativo"><Legislative /></Page>} />
          <Route path="/economia" element={<Page scope="Economia"><Economy /></Page>} />
          <Route path="/balanca-militar" element={<Page scope="Balança Militar"><MilitaryBalance /></Page>} />
          <Route path="/dados" element={<Page scope="Dados & Gráficos"><DataCharts /></Page>} />
          <Route path="/mapa" element={<Page scope="Mapa"><CoverageMap /></Page>} />

          {/* Sistema */}
          <Route path="/status" element={<Page scope="Status"><SystemStatus /></Page>} />
          <Route path="/busca" element={<Page scope="Busca"><Search /></Page>} />
          <Route path="/aprender" element={<Page scope="Aprender"><Learn /></Page>} />
          <Route path="/sobre" element={<Page scope="Sobre"><About /></Page>} />

          {/* Rotas da versão anterior, preservadas para não quebrar links. */}
          <Route path="/painel" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<Navigate to="/status" replace />} />
          <Route path="/planos" element={<Navigate to="/sobre" replace />} />

          <Route path="*" element={<Page scope="Não encontrado"><NotFound /></Page>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
