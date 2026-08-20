import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RSS_SOURCES } from '../data/mockData'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'light', // 'dark' | 'light' — padrão CLARO (visual)
      // Fontes ao vivo DESLIGADAS por padrão: este é um demo 100% front-end
      // (sem backend/proxy). Buscar RSS de terceiros direto do browser falha por
      // CORS/limite e polui o console — sem agregar dado real. O app carrega com
      // conteúdo demonstrativo coerente e o usuário pode ativar fontes ao vivo em
      // Configurações (a coleta real deve viver atrás de um backend — ver roadmap).
      rssSources: RSS_SOURCES.map((s) => ({ ...s, enabled: false })),
      newsPerClipping: 5, // 3-10
      focusArea: 'empresarial',
      notificationsEnabled: true,
      // Áreas temáticas de maior interesse do usuário (filtra/destaca conteúdo)
      interestAreas: [],
      // Onboarding (tour de boas-vindas) — exibido apenas na 1ª visita
      onboardingDone: false,
      // Override local opcional da chave da Anthropic (além do .env)
      apiKeyOverride: '',

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      toggleSource: (id) =>
        set({
          rssSources: get().rssSources.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        }),

      addSource: (url) => {
        const name = (() => {
          try {
            return new URL(url).hostname.replace('www.', '')
          } catch {
            return url
          }
        })()
        set({
          rssSources: [
            ...get().rssSources,
            { id: `src-${Date.now()}`, name, url, enabled: true, status: 'online' },
          ],
        })
      },

      removeSource: (id) =>
        set({ rssSources: get().rssSources.filter((s) => s.id !== id) }),

      setNewsPerClipping: (n) =>
        set({ newsPerClipping: Math.max(3, Math.min(10, Number(n) || 5)) }),

      setFocusArea: (focusArea) => set({ focusArea }),
      toggleInterestArea: (area) =>
        set({
          interestAreas: get().interestAreas.includes(area)
            ? get().interestAreas.filter((a) => a !== area)
            : [...get().interestAreas, area],
        }),
      toggleNotifications: () => set({ notificationsEnabled: !get().notificationsEnabled }),
      setApiKeyOverride: (apiKeyOverride) => set({ apiKeyOverride }),
      completeOnboarding: () => set({ onboardingDone: true }),
      resetOnboarding: () => set({ onboardingDone: false }),
    }),
    // [ALTERADO] chave nova (v3): descarta o estado antigo que trazia as fontes
    // RSS habilitadas por padrão (origem dos erros 422 no console do demo).
    { name: 'defesabr-settings-v3' }
  )
)

// Aplica a classe `dark` no <html>
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}
