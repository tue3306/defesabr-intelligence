import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------------------------------------------------------
// PREFERÊNCIAS
//
// Só o que pertence ao APARELHO. Sem contas, não há preferência "da pessoa" —
// e fingir que há exigiria um servidor de sessão que esta versão não tem.
// -----------------------------------------------------------------------------
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      toggleTheme: () => {
        const proximo = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: proximo })
        applyTheme(proximo)
      },
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    { name: 'defesabr-ui-v2' }
  )
)

/** Aplica a classe `dark` no <html>. */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
