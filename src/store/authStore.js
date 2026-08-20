import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSubscriptionStore } from './subscriptionStore'
import {
  resolveProfile, profileCan, denialReason, normalizeCapability,
} from '../auth/permissions'

// Credenciais de conveniência para a persona de governança (DEMO).
// NÃO são exibidas na interface — o acesso de demonstração é feito pelos
// botões de persona. Mantidas apenas como atalho interno de compatibilidade.
const LEGACY_ADMIN = { email: 'governanca@defesabr.com', password: 'defesa2025' }

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
    name: 'Administrador', email: LEGACY_ADMIN.email,
    label: 'Conta de Administrador',
    roleLabel: 'Administrador', planLabel: 'Institucional',
    tagline: 'Governança do sistema · acesso total',
  },
}

// A autorização vive em src/auth/permissions.js (fonte de verdade única, §10).
// Este store apenas expõe helpers que consultam aquele módulo.
const currentPlan = () => useSubscriptionStore.getState().plan

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { name, email, role, avatar, persona }
      isAuthenticated: false,

      // Login (DEMO): sem credenciais publicadas na interface.
      //  • Atalho de governança (legado) entra como Administrador.
      //  • Qualquer e-mail/senha válidos entram como conta gratuita (Explorar),
      //    preservando a identidade informada — assim o formulário funciona de
      //    forma realista sem expor nenhuma senha.
      login: (email, password) => {
        const mail = email?.trim().toLowerCase()
        if (!mail || !password) {
          return { ok: false, error: 'Informe e-mail e senha para entrar.' }
        }
        if (mail === LEGACY_ADMIN.email && password === LEGACY_ADMIN.password) {
          get().loginAsDemo('admin')
          return { ok: true, persona: 'admin' }
        }
        get().loginAsDemo('explorar')
        get().updateProfile({ email: email.trim() })
        return { ok: true, persona: 'explorar' }
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

      // ── Helpers de permissão — TODOS delegam a src/auth/permissions.js ──

      // Perfil efetivo: 'visitor' | 'free' | 'pro' | 'admin'.
      profile: () =>
        resolveProfile({
          isAuthenticated: get().isAuthenticated,
          role: get().user?.role,
          plan: currentPlan(),
        }),

      // Verificação central de capacidade (aceita nomes novos e legados).
      can: (capability) => profileCan(get().profile(), normalizeCapability(capability)),

      // Alias histórico mantido para não quebrar chamadas existentes.
      hasPermission: (capability) => get().can(capability),

      // Por que está bloqueado: 'auth' | 'plan' | 'role' | null.
      denialFor: (capability) => denialReason(get().profile(), normalizeCapability(capability)),

      isAdmin: () => get().profile() === 'admin',
      // Acessa conteúdo premium sem paywall (plano pago OU admin).
      isStaff: () => ['pro', 'admin'].includes(get().profile()),
    }),
    // [ALTERADO] chave nova: descarta sessões com o modelo de perfis antigo.
    { name: 'defesabr-auth-v3' }
  )
)

