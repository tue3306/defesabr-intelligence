import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RSS_SOURCES } from '../data/mockData'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light'
      rssSources: RSS_SOURCES,
      newsPerClipping: 5, // 3-10
      focusArea: 'empresarial',
      notificationsEnabled: true,
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
      toggleNotifications: () => set({ notificationsEnabled: !get().notificationsEnabled }),
      setApiKeyOverride: (apiKeyOverride) => set({ apiKeyOverride }),
    }),
    { name: 'defesabr-settings' }
  )
)

// Aplica a classe `dark` no <html>
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}
