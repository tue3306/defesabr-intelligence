import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'light', // 'dark' | 'light' — padrão CLARO (visual)
      // `rssSources` vivia aqui: 15 fontes escritas a mao com `status` literal,
      // e acoes de ativar, adicionar e remover que nao chegavam a lugar nenhum.
      // A coleta roda no servidor e nunca leu esta lista. As fontes de verdade
      // vem de /api/sources/summary (useFontesReais).
      //
      // O comentario que ficava aqui descrevia a plataforma como "um demo 100%
      // front-end (sem backend/proxy)" e explicava por que as fontes ao vivo
      // vinham desligadas. Ha um backend desde entao, ele coleta de 50 fontes
      // a cada 30 minutos, e o texto so servia para desorientar quem chegasse.
      newsPerClipping: 5, // 3-10
      focusArea: 'empresarial',
      notificationsEnabled: true,
      // Áreas temáticas de maior interesse do usuário (filtra/destaca conteúdo)
      interestAreas: [],
      // Onboarding (tour de boas-vindas) — exibido apenas na 1ª visita
      onboardingDone: false,

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

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
      completeOnboarding: () => set({ onboardingDone: true }),
    }),
    // Chave v3: descarta o estado antigo, que trazia as fontes RSS habilitadas
    // por padrao e era a origem dos erros 422 no console.
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
