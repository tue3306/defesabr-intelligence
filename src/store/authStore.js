import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEMO_CREDENTIALS = { email: 'admin@defesabr.com', password: 'defesa2025' }

// -----------------------------------------------------------------------------
// PAPÉIS DE ACESSO (RBAC, modo demonstração) — hierarquia clara, do público ao
// administrador. O PAPEL define O QUE a pessoa pode FAZER; o PLANO (Gratuito /
// Simples / Completo) é um eixo separado que libera o conteúdo premium.
//   `tier`        : nível hierárquico (0→3), só para ordenação/exibição.
//   `tagline`     : função do papel em uma linha.
//   `permissions` : controla o gating de rotas/ações (NÃO alterar as chaves).
//   `capabilities`: lista legível exibida nas Configurações.
// -----------------------------------------------------------------------------
export const PROFILES = {
  visitante: {
    role: 'visitante',
    label: 'Visitante',
    tier: 0,
    tagline: 'Acesso público, sem login',
    description: 'Conhece a plataforma sem login: notícias públicas, mapa de risco, planos e Centro Educacional. As análises completas ficam no paywall.',
    permissions: ['read'],
    capabilities: [
      { ok: true, text: 'Notícias públicas, mapa de risco e Centro Educacional' },
      { ok: true, text: 'Conhecer os planos e a proposta da plataforma' },
      { ok: false, text: 'Painel e módulos do Brasil Estratégico (exigem login)' },
      { ok: false, text: 'Análises e briefings completos' },
    ],
  },
  gratuito: {
    role: 'gratuito',
    label: 'Usuário',
    tier: 1,
    tagline: 'Consulta & leitura da inteligência',
    description: 'Consome a inteligência publicada — painel, módulos estratégicos e dados. O acesso às análises completas segue o plano contratado (Gratuito, Simples ou Completo).',
    permissions: ['read', 'interests'],
    capabilities: [
      { ok: true, text: 'Painel, Clipping (leitura), Arquivo e Minha Pasta' },
      { ok: true, text: 'Brasil Estratégico, Dados, Economia e Calendário' },
      { ok: false, text: 'Gerar e exportar com IA (papel de Analista)' },
      { ok: false, text: 'Análise completa por área — conforme o plano' },
      { ok: false, text: 'Ferramentas de análise (Fontes, Narrativas)' },
    ],
  },
  analista: {
    role: 'analista',
    label: 'Analista',
    tier: 2,
    tagline: 'Produção de inteligência',
    description: 'Produz inteligência: gera e exporta clipping/análise com IA, define o nível de tensão por região e usa as ferramentas de fontes e narrativas — tudo sem paywall.',
    permissions: ['read', 'interests', 'generate', 'export', 'publish', 'tension', 'analyst'],
    capabilities: [
      { ok: true, text: 'Tudo do papel Usuário — sem paywall' },
      { ok: true, text: 'Gerar e exportar clipping/análise com IA' },
      { ok: true, text: 'Definir o nível de tensão por região' },
      { ok: true, text: 'Confiabilidade das Fontes e Monitor de Narrativas' },
      { ok: false, text: 'Configurações do sistema e gestão de usuários' },
    ],
  },
  admin: {
    role: 'admin',
    label: 'Administrador',
    tier: 3,
    tagline: 'Governança da plataforma',
    description: 'Governa a plataforma: configurações, gestão de usuários, analytics e diagnóstico do sistema — além de todas as capacidades do Analista.',
    permissions: ['read', 'interests', 'generate', 'export', 'publish', 'tension', 'analyst', 'settings', 'regenerate', 'admin', 'diagnostics'],
    capabilities: [
      { ok: true, text: 'Tudo do papel Analista' },
      { ok: true, text: 'Configurações do sistema e chave de API' },
      { ok: true, text: 'Gestão de usuários e analytics' },
      { ok: true, text: 'Diagnóstico e status do sistema' },
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
    // [ALTERADO] chave nova: descarta a sessão demo salva com o rótulo de perfil
    // antigo, para o novo modelo de papéis aparecer corretamente.
    { name: 'defesabr-auth-v2' }
  )
)

export { DEMO_CREDENTIALS }
