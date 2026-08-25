import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'
import PublicLayout from './components/layout/PublicLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/system/ErrorBoundary'
import { useAuthStore } from './store/authStore'
import { useSettingsStore, applyTheme } from './store/settingsStore'
// Registra os resolvedores locais da camada de dados antes do 1º render.
import './services'

// Escolhe o layout: deslogado (Visitante) usa o PÚBLICO, sem menu lateral;
// autenticado usa o layout do app (com sidebar adaptada ao perfil).
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
// Brasil Estratégico
const StrategicPrograms = lazy(() => import('./pages/StrategicPrograms'))
const BlueAmazon = lazy(() => import('./pages/BlueAmazon'))
const Borders = lazy(() => import('./pages/Borders'))
const MilitaryBalance = lazy(() => import('./pages/MilitaryBalance'))
const DefenseIndustry = lazy(() => import('./pages/DefenseIndustry'))
// Inteligência & Análise
const Dossiers = lazy(() => import('./pages/Dossiers'))
const Legislative = lazy(() => import('./pages/Legislative'))
const Narratives = lazy(() => import('./pages/Narratives'))
const StrategicCalendar = lazy(() => import('./pages/Calendar'))
const SourceReliability = lazy(() => import('./pages/SourceReliability'))
const RiskMatrix = lazy(() => import('./pages/RiskMatrix'))
const Reports = lazy(() => import('./pages/Reports'))
// Mesa de trabalho (perfil Analista)
const Workbench = lazy(() => import('./pages/Workbench'))
// Console de governança (perfil Administrador)
const AdminConsole = lazy(() => import('./pages/AdminConsole'))

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-gold-500" size={32} />
      <span className="text-sm muted">Carregando módulo…</span>
    </div>
  )
}

// Toda rota é isolada: uma falha em um módulo não derruba a aplicação inteira.
// A chave por rota reinicia o boundary automaticamente ao navegar.
function Page({ scope, children }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary key={pathname} scope={scope}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

/** Rota autenticada + (opcionalmente) uma capacidade exigida. */
function Guarded({ capability, scope, children }) {
  return (
    <Page scope={scope}>
      <ProtectedRoute capability={capability}>{children}</ProtectedRoute>
    </Page>
  )
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const { pathname } = useLocation()

  // Garante a classe de tema no primeiro render.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Navegação por rota deve começar no topo (HashRouter não faz isso sozinho).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname])

  return (
    <ErrorBoundary scope="Aplicação">
      <Routes>
        {/* Modo apresentação (sem layout) — exige plano com apresentação */}
        <Route
          path="/apresentacao"
          element={<Guarded capability="presentation.mode" scope="Apresentação"><Presentation /></Guarded>}
        />

        <Route element={<RootLayout />}>
          {/* ── VISITANTE — público, sem login ── */}
          <Route path="/" element={<Page scope="Início"><Landing /></Page>} />
          <Route path="/planos" element={<Page scope="Planos"><Plans /></Page>} />
          <Route path="/aprender" element={<Page scope="Centro Educacional"><Learn /></Page>} />
          <Route path="/sobre" element={<Page scope="Sobre"><About /></Page>} />

          {/* ── USUÁRIO — leitura e acompanhamento ── */}
          <Route path="/painel" element={<Guarded scope="Painel"><Home /></Guarded>} />
          <Route path="/clipping" element={<Guarded scope="Clipping Diário"><DailyClipping /></Guarded>} />
          <Route path="/analise" element={<Guarded scope="Análise Semanal"><WeeklyAnalysis /></Guarded>} />
          <Route path="/dados" element={<Guarded scope="Dados & Gráficos"><DataCharts /></Guarded>} />
          <Route path="/economia" element={<Guarded scope="Economia & Defesa"><Economy /></Guarded>} />
          <Route path="/arquivo" element={<Guarded scope="Arquivo & Pasta"><Archive /></Guarded>} />
          <Route path="/notificacoes" element={<Guarded scope="Notificações"><Notifications /></Guarded>} />
          <Route path="/conta" element={<Guarded scope="Minha conta"><Account /></Guarded>} />
          <Route path="/configuracoes" element={<Guarded scope="Configurações"><Settings /></Guarded>} />

          {/* ── Brasil Estratégico ── */}
          <Route path="/programas" element={<Guarded scope="Programas Estratégicos"><StrategicPrograms /></Guarded>} />
          <Route path="/amazonia-azul" element={<Guarded scope="Amazônia Azul"><BlueAmazon /></Guarded>} />
          <Route path="/fronteiras" element={<Guarded scope="Fronteiras & Amazônia"><Borders /></Guarded>} />
          <Route path="/balanca-militar" element={<Guarded scope="Balança Militar"><MilitaryBalance /></Guarded>} />
          <Route path="/industria" element={<Guarded scope="Base Industrial"><DefenseIndustry /></Guarded>} />

          {/* ── Inteligência & Análise ── */}
          <Route path="/dossies" element={<Guarded scope="Dossiês"><Dossiers /></Guarded>} />
          <Route path="/calendario" element={<Guarded scope="Calendário Estratégico"><StrategicCalendar /></Guarded>} />
          <Route
            path="/legislativo"
            element={<Guarded capability="legislative.access" scope="Radar Legislativo"><Legislative /></Guarded>}
          />
          <Route
            path="/riscos"
            element={<Guarded capability="risk.access" scope="Matriz de Riscos"><RiskMatrix /></Guarded>}
          />
          <Route
            path="/narrativas"
            element={<Guarded capability="narratives.access" scope="Monitor de Narrativas"><Narratives /></Guarded>}
          />
          <Route
            path="/fontes"
            element={<Guarded capability="sources.reliability" scope="Confiabilidade das Fontes"><SourceReliability /></Guarded>}
          />
          <Route
            path="/relatorios"
            element={<Guarded capability="reports.export" scope="Central de Relatórios"><Reports /></Guarded>}
          />

          {/* ── ANALISTA — produção de inteligência ── */}
          <Route
            path="/mesa"
            element={<Guarded capability="workbench.access" scope="Mesa do Analista"><Workbench /></Guarded>}
          />

          {/* ── ADMINISTRADOR — governança ── */}
          <Route
            path="/admin"
            element={<Guarded capability="admin.access" scope="Console de Governança"><AdminConsole /></Guarded>}
          />

          <Route path="*" element={<Page scope="Página não encontrada"><NotFound /></Page>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
