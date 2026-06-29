import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'
import PublicLayout from './components/layout/PublicLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import { useSettingsStore, applyTheme } from './store/settingsStore'

// [ALTERADO] Escolhe o layout: deslogado usa o PÚBLICO (sem menu lateral);
// logado usa o layout do app (com sidebar/menu).
function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Layout /> : <PublicLayout />
}

// Lazy loading das páginas para reduzir o bundle inicial
const Landing = lazy(() => import('./pages/Landing'))
const Home = lazy(() => import('./pages/Home'))
const Plans = lazy(() => import('./pages/Plans'))
const DailyClipping = lazy(() => import('./pages/DailyClipping'))
const WeeklyAnalysis = lazy(() => import('./pages/WeeklyAnalysis'))
const DataCharts = lazy(() => import('./pages/DataCharts'))
const Economy = lazy(() => import('./pages/Economy'))
const Archive = lazy(() => import('./pages/Archive'))
const About = lazy(() => import('./pages/About'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Presentation = lazy(() => import('./pages/Presentation'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Learn = lazy(() => import('./pages/Learn'))
const Account = lazy(() => import('./pages/Account'))
// [ALTERADO] Novos módulos — Brasil Estratégico e Inteligência
const StrategicPrograms = lazy(() => import('./pages/StrategicPrograms'))
const BlueAmazon = lazy(() => import('./pages/BlueAmazon'))
const Borders = lazy(() => import('./pages/Borders'))
const MilitaryBalance = lazy(() => import('./pages/MilitaryBalance'))
const DefenseIndustry = lazy(() => import('./pages/DefenseIndustry'))
const Dossiers = lazy(() => import('./pages/Dossiers'))
const Legislative = lazy(() => import('./pages/Legislative'))
const Narratives = lazy(() => import('./pages/Narratives'))
const StrategicCalendar = lazy(() => import('./pages/Calendar'))
const SourceReliability = lazy(() => import('./pages/SourceReliability'))

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
        {/* Modo apresentação (sem layout) — exige login */}
        <Route path="/apresentacao" element={<ProtectedRoute><Presentation /></ProtectedRoute>} />

        <Route element={<RootLayout />}>
          {/* Público — visitante conhece o site, planos e conteúdo educacional */}
          <Route path="/" element={<Landing />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/aprender" element={<Learn />} />
          <Route path="/sobre" element={<About />} />

          {/* Restrito — só após o login */}
          <Route path="/painel" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/clipping" element={<ProtectedRoute><DailyClipping /></ProtectedRoute>} />
          <Route path="/analise" element={<ProtectedRoute><WeeklyAnalysis /></ProtectedRoute>} />
          <Route path="/dados" element={<ProtectedRoute><DataCharts /></ProtectedRoute>} />
          <Route path="/economia" element={<ProtectedRoute><Economy /></ProtectedRoute>} />
          <Route path="/arquivo" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
          <Route path="/notificacoes" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          {/* Configurações = operação/sistema (Profissional+ / Admin) */}
          <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Brasil Estratégico */}
          <Route path="/programas" element={<ProtectedRoute><StrategicPrograms /></ProtectedRoute>} />
          <Route path="/amazonia-azul" element={<ProtectedRoute><BlueAmazon /></ProtectedRoute>} />
          <Route path="/fronteiras" element={<ProtectedRoute><Borders /></ProtectedRoute>} />
          <Route path="/balanca-militar" element={<ProtectedRoute><MilitaryBalance /></ProtectedRoute>} />
          <Route path="/industria" element={<ProtectedRoute><DefenseIndustry /></ProtectedRoute>} />

          {/* Inteligência & Análise */}
          <Route path="/dossies" element={<ProtectedRoute><Dossiers /></ProtectedRoute>} />
          <Route path="/legislativo" element={<ProtectedRoute><Legislative /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><StrategicCalendar /></ProtectedRoute>} />
          {/* Ferramentas de Analista (exigem permissão) */}
          <Route path="/narrativas" element={<ProtectedRoute permission="analyst"><Narratives /></ProtectedRoute>} />
          <Route path="/fontes" element={<ProtectedRoute permission="analyst"><SourceReliability /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
