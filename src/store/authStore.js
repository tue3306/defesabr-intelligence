import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSubscriptionStore } from './subscriptionStore'
import {
  resolveProfile, resolveCapabilities, contextCan, denialReason,
  normalizeCapability, PROFILES,
} from '../auth/permissions'

// -----------------------------------------------------------------------------
// IDENTIDADE — FONTE DE VERDADE ÚNICA
//
// Dois eixos, claramente separados:
//   • PAPEL  (role)  = o que a pessoa pode FAZER  → 'user' | 'analyst' | 'admin'
//   • PLANO          = o quanto a pessoa pode VER → vive no subscriptionStore
//
// O quarto perfil, VISITANTE, é um ESTADO (não autenticado), não um papel.
// Juntos, os dois eixos produzem os 4 perfis do produto:
//   Visitante · Usuário · Analista · Administrador  (ver src/auth/permissions.js)
//
// Esta camada é DEMONSTRATIVA (sem servidor). A troca por um backend real
// acontece em src/services/authService.js — a interface pública deste store
// (login, logout, can, profile) permanece idêntica.
// -----------------------------------------------------------------------------

export const ROLES = {
  user: {
    id: 'user',
    label: 'Usuário',
    tagline: 'Consulta e acompanhamento',
    description: 'Lê o painel, o clipping, os dossiês e os módulos estratégicos.',
  },
  analyst: {
    id: 'analyst',
    label: 'Analista',
    tagline: 'Produção de inteligência',
    description: 'Gera análises com IA, avalia tensão, classifica fontes e publica briefings.',
  },
  admin: {
    id: 'admin',
    label: 'Administrador',
    tagline: 'Governança da plataforma',
    description: 'Gere contas, fontes, integrações, auditoria e configuração.',
  },
}

// -----------------------------------------------------------------------------
// PERSONAS DE DEMONSTRAÇÃO — uma por perfil do produto.
// Cada persona é uma combinação COERENTE de papel + plano, para que a troca no
// menu do usuário reproduza fielmente a experiência daquele perfil.
// -----------------------------------------------------------------------------
export const DEMO_PERSONAS = {
  visitante: {
    key: 'visitante',
    profile: 'visitor',
    role: null,
    plan: 'explorar',
    name: 'Visitante',
    email: null,
    label: 'Visitante',
    roleLabel: 'Visitante',
    planLabel: '—',
    tagline: 'Navega sem login · conteúdo público e prévias',
    unit: 'Acesso público',
  },
  usuario: {
    key: 'usuario',
    profile: 'user',
    role: 'user',
    plan: 'profissional',
    name: 'Marina Duarte',
    email: 'marina.duarte@defesabr.com',
    label: 'Usuário',
    roleLabel: 'Usuário',
    planLabel: 'Profissional',
    tagline: 'Acompanha o produto de inteligência · plano Profissional',
    unit: 'Assessoria de Planejamento',
    since: '2025-11-03',
  },
  analista: {
    key: 'analista',
    profile: 'analyst',
    role: 'analyst',
    plan: 'institucional',
    name: 'Ana Lima',
    email: 'ana.lima@defesabr.com',
    label: 'Analista',
    roleLabel: 'Analista',
    planLabel: 'Institucional',
    tagline: 'Produz o conteúdo · gera, avalia e publica',
    unit: 'Núcleo de Análise — Amazônia e Fronteiras',
    since: '2025-04-18',
  },
  admin: {
    key: 'admin',
    profile: 'admin',
    role: 'admin',
    plan: 'institucional',
    name: 'Rafael Antunes',
    email: 'governanca@defesabr.com',
    label: 'Administrador',
    roleLabel: 'Administrador',
    planLabel: 'Institucional',
    tagline: 'Governa a plataforma · contas, fontes e auditoria',
    unit: 'Governança e Operações',
    since: '2025-01-09',
  },
}

/** Personas que representam uma sessão autenticada (o Visitante é o logout). */
export const LOGIN_PERSONAS = ['usuario', 'analista', 'admin']

// Atalho interno (legado) para a persona de governança. NÃO é exibido na
// interface — o acesso de demonstração é feito pelos botões de persona.
const LEGACY_ADMIN = { email: 'governanca@defesabr.com', password: 'defesa2025' }

const currentPlan = () => useSubscriptionStore.getState().plan

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, // { name, email, role, avatar, persona, unit, since }
      isAuthenticated: false,
      lastLoginAt: null,

      // Login (DEMO): sem credenciais publicadas na interface.
      //  • Atalho de governança (legado) entra como Administrador.
      //  • Qualquer e-mail/senha válidos entram como Usuário, preservando a
      //    identidade informada — o formulário funciona de forma realista sem
      //    expor nenhuma senha.
      login: (email, password) => {
        const mail = email?.trim().toLowerCase()
        if (!mail || !password) {
          return { ok: false, error: 'Informe e-mail e senha para entrar.' }
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          return { ok: false, error: 'Informe um e-mail válido.' }
        }
        if (password.length < 6) {
          return { ok: false, error: 'A senha deve ter ao menos 6 caracteres.' }
        }
        if (mail === LEGACY_ADMIN.email && password === LEGACY_ADMIN.password) {
          get().loginAsDemo('admin')
          return { ok: true, persona: 'admin' }
        }
        get().loginAsDemo('usuario')
        get().updateProfile({ email: email.trim() })
        return { ok: true, persona: 'usuario' }
      },

      // Cadastro (DEMO) — cria uma conta de Usuário no plano Explorar.
      register: ({ name, email, password }) => {
        const mail = email?.trim().toLowerCase()
        if (!name?.trim()) return { ok: false, error: 'Informe seu nome.' }
        if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          return { ok: false, error: 'Informe um e-mail válido.' }
        }
        if (!password || password.length < 6) {
          return { ok: false, error: 'A senha deve ter ao menos 6 caracteres.' }
        }
        useSubscriptionStore.getState().setPlan('explorar')
        set({
          user: {
            name: name.trim(),
            email: mail,
            role: 'user',
            avatar: null,
            persona: 'usuario',
            unit: 'Conta pessoal',
            since: new Date().toISOString().slice(0, 10),
          },
          isAuthenticated: true,
          lastLoginAt: new Date().toISOString(),
        })
        return { ok: true, persona: 'usuario' }
      },

      // Aplica papel + plano de uma só vez (mantém os dois eixos coerentes).
      // A persona 'visitante' equivale a sair da sessão.
      loginAsDemo: (key = 'analista') => {
        if (key === 'visitante') {
          get().logout()
          return { ok: true, persona: 'visitante' }
        }
        const p = DEMO_PERSONAS[key] || DEMO_PERSONAS.analista
        useSubscriptionStore.getState().setPlan(p.plan) // sincroniza o plano
        set({
          user: {
            name: p.name,
            email: p.email,
            role: p.role,
            avatar: null,
            persona: p.key,
            unit: p.unit,
            since: p.since,
          },
          isAuthenticated: true,
          lastLoginAt: new Date().toISOString(),
        })
        return { ok: true, persona: p.key }
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      // Edição de perfil (área /conta) — DEMO, salvo em localStorage.
      updateProfile: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

      // ── Helpers de permissão — TODOS delegam a src/auth/permissions.js ──

      /** Contexto de autorização (papel + plano + autenticação). */
      authContext: () => ({
        isAuthenticated: get().isAuthenticated,
        role: get().user?.role,
        plan: currentPlan(),
      }),

      /** Perfil efetivo: 'visitor' | 'user' | 'analyst' | 'admin'. */
      profile: () => resolveProfile(get().authContext()),

      /** Metadados do perfil efetivo (label, tagline, cor). */
      profileMeta: () => PROFILES[get().profile()] || PROFILES.visitor,

      /** Todas as capacidades ativas — útil para telas de diagnóstico. */
      capabilities: () => resolveCapabilities(get().authContext()),

      /** Verificação central de capacidade (aceita nomes novos e legados). */
      can: (capability) => contextCan(get().authContext(), capability),

      /** Alias histórico mantido para não quebrar chamadas existentes. */
      hasPermission: (capability) => get().can(capability),

      /** Por que está bloqueado: 'auth' | 'plan' | 'role' | null. */
      denialFor: (capability) =>
        denialReason(get().authContext(), normalizeCapability(capability)),

      isAdmin: () => get().profile() === 'admin',
      isAnalyst: () => ['analyst', 'admin'].includes(get().profile()),
      /** Acessa conteúdo premium sem paywall. */
      isStaff: () => ['analyst', 'admin'].includes(get().profile()) || currentPlan() !== 'explorar',
    }),
    // chave v4: descarta sessões com o modelo de perfis anterior (3 personas).
    { name: 'defesabr-auth-v4' }
  )
)
