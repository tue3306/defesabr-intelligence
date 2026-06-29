import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSubscriptionStore } from './subscriptionStore'

const DEMO_CREDENTIALS = { email: 'admin@defesabr.com', password: 'defesa2025' }

// -----------------------------------------------------------------------------
// IDENTIDADE — FONTE DE VERDADE ÚNICA (Sprint 0)
//
// Dois eixos, claramente separados:
//   • PAPEL  (role)  = o que a pessoa pode FAZER  → só 2: Usuário, Administrador.
//   • PLANO          = o quanto a pessoa pode VER → vive no subscriptionStore.
//
// Decisões de produto (simplificação agressiva — "menos, porém melhor"):
//   - "Analista" DEIXOU de ser papel: produzir inteligência (gerar/exportar/
//     tensão/fontes/narrativas) virou capacidade do PLANO Profissional.
//   - "Visitante" é ESTADO (não autenticado), não um papel.
//   - Restam 2 papéis com permissões realmente distintas (gerir sistema = admin).
// -----------------------------------------------------------------------------

export const ROLES = {
  user: { id: 'user', label: 'Usuário', tagline: 'Consulta e produção de inteligência' },
  admin: { id: 'admin', label: 'Administrador', tagline: 'Governança da plataforma' },
}

// Personas de DEMONSTRAÇÃO = combinação coerente de papel + plano.
// Substituem os 4 "perfis" antigos por 3 escolhas claras na tela de login.
export const DEMO_PERSONAS = {
  explorar: {
    key: 'explorar', role: 'user', plan: 'explorar',
    name: 'Convidado', email: 'explorar@defesabr.com',
    label: 'Conta gratuita',
    roleLabel: 'Usuário', planLabel: 'Explorar',
    tagline: 'Leitura e descoberta · análises no paywall',
  },
  profissional: {
    key: 'profissional', role: 'user', plan: 'profissional',
    name: 'Ana Lima', email: 'ana@defesabr.com',
    label: 'Conta Profissional',
    roleLabel: 'Usuário', planLabel: 'Profissional',
    tagline: 'Acesso total · produz e exporta com IA',
  },
  admin: {
    key: 'admin', role: 'admin', plan: 'institucional',
    name: 'Administrador', email: DEMO_CREDENTIALS.email,
    label: 'Conta de Administrador',
    roleLabel: 'Administrador', planLabel: 'Institucional',
    tagline: 'Governança do sistema · acesso total',
  },
}

// Permissões: ADMIN depende do PAPEL; PRO (produção) depende do PLANO.
const ADMIN_PERMS = ['settings', 'admin', 'diagnostics', 'regenerate']
const PRO_PERMS = ['generate', 'export', 'publish', 'tension', 'analyst']
const PAID_PLANS = ['profissional', 'institucional']
const currentPlan = () => useSubscriptionStore.getState().plan

// Motivo do bloqueio (para mensagens claras de "por que não posso?").
export const PERMISSION_REASON = {
  generate: 'plan', export: 'plan', publish: 'plan', tension: 'plan', analyst: 'plan',
  settings: 'role', admin: 'role', diagnostics: 'role', regenerate: 'role',
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { name, email, role, avatar, persona }
      isAuthenticated: false,

      login: (email, password) => {
        if (
          email?.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          get().loginAsDemo('admin')
          return { ok: true }
        }
        return { ok: false, error: 'Credenciais inválidas. Use uma conta demo abaixo.' }
      },

      // Aplica papel + plano de uma só vez (mantém os dois eixos coerentes).
      loginAsDemo: (key = 'profissional') => {
        const p = DEMO_PERSONAS[key] || DEMO_PERSONAS.profissional
        useSubscriptionStore.getState().setPlan(p.plan) // sincroniza o plano
        set({
          user: { name: p.name, email: p.email, role: p.role, avatar: null, persona: p.key },
          isAuthenticated: true,
        })
        return { ok: true }
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      // Edição de perfil (área /conta) — DEMO, salvo em localStorage.
      updateProfile: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

      // ── Helpers de permissão (usados em todo o app) ──
      hasPermission: (perm) => {
        const user = get().user
        if (!user) return false
        if (ADMIN_PERMS.includes(perm)) return user.role === 'admin'
        if (PRO_PERMS.includes(perm)) return user.role === 'admin' || PAID_PLANS.includes(currentPlan())
        return true // read / interests — qualquer autenticado
      },
      can: (perm) => get().hasPermission(perm), // alias semântico solicitado
      isRole: (role) => get().user?.role === role,
      isAdmin: () => get().user?.role === 'admin',
      // Acessa conteúdo premium sem paywall (plano pago OU admin).
      isStaff: () => get().user?.role === 'admin' || PAID_PLANS.includes(currentPlan()),
    }),
    // [ALTERADO] chave nova: descarta sessões com o modelo de perfis antigo.
    { name: 'defesabr-auth-v3' }
  )
)

export { DEMO_CREDENTIALS }
