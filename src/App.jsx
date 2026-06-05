import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useSettingsStore, applyTheme } from './store/settingsStore'

// Lazy loading das páginas para reduzir o bundle inicial
const Home = lazy(() => import('./pages/Home'))
const DailyClipping = lazy(() => import('./pages/DailyClipping'))
const WeeklyAnalysis = lazy(() => import('./pages/WeeklyAnalysis'))
const DataCharts = lazy(() => import('./pages/DataCharts'))
const Archive = lazy(() => import('./pages/Archive'))
const About = lazy(() => import('./pages/About'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Presentation = lazy(() => import('./pages/Presentation'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Learn = lazy(() => import('./pages/Learn'))

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-brand-400" size={32} />
    </div>
  )
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme)

  // Garante a classe de tema no primeiro render.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Modo apresentação (sem layout) */}
        <Route path="/apresentacao" element={<Presentation />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/clipping"
            element={
              <ProtectedRoute>
                <DailyClipping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analise"
            element={
              <ProtectedRoute>
                <WeeklyAnalysis />
              </ProtectedRoute>
            }
          />
          <Route path="/dados" element={<DataCharts />} />
          <Route path="/arquivo" element={<Archive />} />
          <Route path="/aprender" element={<Learn />} />
          <Route
            path="/notificacoes"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/sobre" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
