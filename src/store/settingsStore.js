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
      // periodicamente, e o texto so servia para desorientar quem chegasse.
      notificationsEnabled: true,
      // Paleta segura para daltonismo. Ver o bloco em src/index.css: a escala
      // de urgência é vermelho → verde, e na deuteranopia os dois extremos são
      // a mesma cor. Ligado aqui, o produto inteiro troca de paleta.
      daltonismo: false,
      // 'normal' | 'grande' | 'maior'. Escala a interface inteira — ver o bloco
      // em src/index.css.
      tamanhoTexto: 'normal',
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

      toggleInterestArea: (area) =>
        set({
          interestAreas: get().interestAreas.includes(area)
            ? get().interestAreas.filter((a) => a !== area)
            : [...get().interestAreas, area],
        }),
      /** Troca a lista inteira — o "Salvar" do painel de interesses. */
      setInterestAreas: (areas) => set({ interestAreas: [...new Set(Array.isArray(areas) ? areas : [])] }),
      toggleNotifications: () => set({ notificationsEnabled: !get().notificationsEnabled }),
      setTamanhoTexto: (tamanho) => {
        set({ tamanhoTexto: tamanho })
        applyTamanhoTexto(tamanho)
      },
      toggleDaltonismo: () => {
        const next = !get().daltonismo
        set({ daltonismo: next })
        applyDaltonismo(next)
      },
      completeOnboarding: () => set({ onboardingDone: true }),
    }),
    // Chave v3: descarta o estado antigo, que trazia as fontes RSS habilitadas
    // por padrao e era a origem dos erros 422 no console.
    { name: 'defesabr-settings-v3' }
  )
)

/**
 * Liga a paleta segura no <html>, de onde o CSS e `categoryColor` a leem.
 *
 * Marca no elemento raiz, e não num contexto de React, porque quem precisa da
 * informação não é só componente: as variáveis de `index.css` reagem ao
 * atributo, e gráfico desenhado em canvas lê pelo DOM.
 */
/** Aplica o tamanho de texto no <html>, de onde o CSS o lê. */
export function applyTamanhoTexto(tamanho) {
  if (typeof document === 'undefined') return
  if (tamanho && tamanho !== 'normal') document.documentElement.dataset.texto = tamanho
  else delete document.documentElement.dataset.texto
}

export function applyDaltonismo(ligado) {
  if (typeof document === 'undefined') return
  if (ligado) document.documentElement.dataset.daltonico = '1'
  else delete document.documentElement.dataset.daltonico
}

// Aplica a classe `dark` no <html>
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}
