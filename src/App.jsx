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
const Search = lazy(() => import('./pages/Search'))
// Brasil Estratégico
const DefenseIndustry = lazy(() => import('./pages/DefenseIndustry'))
// Inteligência & Análise
const Legislative = lazy(() => import('./pages/Legislative'))
const SourceReliability = lazy(() => import('./pages/SourceReliability'))
const CyberThreats = lazy(() => import('./pages/CyberThreats'))
const ThreatActors = lazy(() => import('./pages/ThreatActors'))
// Mesa de trabalho (perfil Analista)
// Console de governança (perfil Administrador)
const Collection = lazy(() => import('./pages/Collection'))
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

  // Confere a sessão persistida contra o servidor, uma vez, na abertura.
  //
  // O `persist` do Zustand devolve o usuário do localStorage antes de qualquer
  // requisição — o que é bom para não piscar a tela de login, e perigoso pelo
  // mesmo motivo: um token expirado, revogado, ou assinado com o segredo de
  // outro deploy continuaria produzindo uma interface de administrador que o
  // servidor recusa a cada chamada. `revalidar()` pergunta ao /auth/me quem é
  // o portador do token; se a resposta não vier, a sessão cai.
  useEffect(() => { useAuthStore.getState().revalidar() }, [])

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
          <Route path="/busca" element={<Guarded scope="Busca global"><Search /></Guarded>} />
          <Route path="/clipping" element={<Guarded scope="Clipping Diário"><DailyClipping /></Guarded>} />
          <Route path="/dados" element={<Guarded scope="Dados & Gráficos"><DataCharts /></Guarded>} />
          <Route path="/economia" element={<Guarded scope="Economia & Defesa"><Economy /></Guarded>} />
          <Route path="/arquivo" element={<Guarded scope="Arquivo & Pasta"><Archive /></Guarded>} />
          <Route path="/notificacoes" element={<Guarded scope="Notificações"><Notifications /></Guarded>} />
          <Route path="/conta" element={<Guarded scope="Minha conta"><Account /></Guarded>} />
          <Route path="/configuracoes" element={<Guarded scope="Configurações"><Settings /></Guarded>} />

          {/* ── Brasil Estratégico ── */}
          <Route path="/industria" element={<Guarded scope="Base Industrial"><DefenseIndustry /></Guarded>} />

          {/* ── Inteligência & Análise ── */}
          <Route
            path="/legislativo"
            element={<Guarded capability="legislative.access" scope="Radar Legislativo"><Legislative /></Guarded>}
          />
          <Route
            path="/fontes"
            element={<Guarded capability="sources.reliability" scope="Confiabilidade das Fontes"><SourceReliability /></Guarded>}
          />

          {/* ── ANALISTA — produção de inteligência ── */}

          {/* ── ADMINISTRADOR — governança ── */}
          <Route
            path="/ciberameacas"
            element={<Guarded scope="Ameaças Cibernéticas"><CyberThreats /></Guarded>}
          />
          <Route
            path="/atores"
            element={<Guarded scope="Atores & Vulnerabilidades"><ThreatActors /></Guarded>}
          />

          {/* ── ANALISTA — monitoramento da coleta ── */}
          <Route
            path="/coleta"
            element={
              <Guarded capability="collection.monitor" scope="Método & Coleta"><Collection /></Guarded>
            }
          />

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
