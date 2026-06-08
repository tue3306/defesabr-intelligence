import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEMO_CREDENTIALS = { email: 'admin@defesabr.com', password: 'defesa2025' }

// Perfis de acesso do modo demonstração (4 perfis).
// `permissions` controla o gating de rotas/ações; `capabilities` é a lista
// legível exibida nas Configurações para deixar o escopo de cada conta claro.
export const PROFILES = {
  visitante: {
    role: 'visitante',
    label: 'Visitante',
    description: 'Não logado. Vê páginas públicas, notícias e planos; análises ficam no paywall.',
    permissions: ['read'],
    capabilities: [
      { ok: true, text: 'Início, notícias públicas e mapa de risco' },
      { ok: true, text: 'Planos e Centro Educacional' },
      { ok: false, text: 'Painel e módulos do Brasil Estratégico (exige login)' },
      { ok: false, text: 'Análises e briefings completos (premium)' },
    ],
  },
  gratuito: {
    role: 'gratuito',
    label: 'Usuário Comum',
    description: 'Logado no plano Gratuito. Acessa o painel e os módulos; análises premium no paywall.',
    permissions: ['read', 'interests'],
    capabilities: [
      { ok: true, text: 'Painel, Clipping (leitura) e Arquivo/Pasta' },
      { ok: true, text: 'Brasil Estratégico, Dados, Economia e Calendário' },
      { ok: false, text: 'Gerar/exportar com IA (Analista)' },
      { ok: false, text: 'Análise completa por área — conforme o plano (premium)' },
      { ok: false, text: 'Ferramentas de Analista (Fontes, Narrativas)' },
    ],
  },
  analista: {
    role: 'analista',
    label: 'Analista',
    description: 'Produz inteligência: gera clipping/análise com IA, define tensão e usa as ferramentas de fontes e narrativas.',
    permissions: ['read', 'interests', 'generate', 'export', 'publish', 'tension', 'analyst'],
    capabilities: [
      { ok: true, text: 'Tudo do Usuário Comum — sem paywall' },
      { ok: true, text: 'Gerar e exportar clipping/análise com IA' },
      { ok: true, text: 'Definir o nível de tensão por região' },
      { ok: true, text: 'Confiabilidade das Fontes e Monitor de Narrativas' },
      { ok: false, text: 'Configurações do sistema e gestão de usuários (Admin)' },
    ],
  },
  admin: {
    role: 'admin',
    label: 'Administrador',
    description: 'Acesso total: tudo do Analista + configurações, usuários, analytics e diagnóstico do sistema.',
    permissions: ['read', 'interests', 'generate', 'export', 'publish', 'tension', 'analyst', 'settings', 'regenerate', 'admin', 'diagnostics'],
    capabilities: [
      { ok: true, text: 'Tudo do Analista' },
      { ok: true, text: 'Chave de API e configurações do sistema' },
      { ok: true, text: 'Gestão de usuários e analytics' },
      { ok: true, text: 'Diagnóstico do sistema (FAB de status)' },
    ],
  },
}

// Permissão necessária por perfil mínimo (para mensagens de "acesso restrito").
export const PERMISSION_MIN_ROLE = {
  analyst: 'analista',
  generate: 'analista',
  export: 'analista',
  tension: 'analista',
  publish: 'analista',
  admin: 'admin',
  settings: 'admin',
  diagnostics: 'admin',
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (email, password) => {
        if (
          email?.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          set({
            user: { name: 'Administrador', email: DEMO_CREDENTIALS.email, ...PROFILES.admin },
            isAuthenticated: true,
          })
          return { ok: true }
        }
        return { ok: false, error: 'Credenciais inválidas. Use a conta demo abaixo.' }
      },

      loginAsDemo: (role = 'analista') => {
        const profile = PROFILES[role] || PROFILES.analista
        set({
          user: {
            name: profile.label,
            email: `${role}@defesabr.com`,
            ...profile,
          },
          isAuthenticated: true,
        })
        return { ok: true }
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      hasPermission: (perm) => {
        const user = get().user
        return !!user && user.permissions?.includes(perm)
      },

      // Equipe (acessa conteúdo premium sem paywall e ferramentas de análise).
      isStaff: () => ['analista', 'admin'].includes(get().user?.role),
    }),
    { name: 'defesabr-auth' }
  )
)

export { DEMO_CREDENTIALS }
