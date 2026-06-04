import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEMO_CREDENTIALS = { email: 'admin@defesabr.com', password: 'defesa2025' }

// Perfis de acesso do modo demonstração
export const PROFILES = {
  admin: {
    role: 'admin',
    label: 'Administrador',
    permissions: ['read', 'generate', 'export', 'settings', 'regenerate'],
  },
  analista: {
    role: 'analista',
    label: 'Analista',
    permissions: ['read', 'generate', 'export'],
  },
  visitante: {
    role: 'visitante',
    label: 'Visitante',
    permissions: ['read'],
  },
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
    }),
    { name: 'defesabr-auth' }
  )
)

export { DEMO_CREDENTIALS }
