import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------------------------------------------------------
// ESTADO LOCAL DO USUÁRIO — o que ELE salvou, e só isso.
//
// Esta loja nascia populada: cinco notificações e um arquivo de clippings
// escritos à mão, ambos de `mockData`. O efeito era que a plataforma abria
// com trinta avisos não lidos sobre acontecimentos que não aconteceram, e um
// arquivo de edições que ninguém publicou.
//
// Agora ela nasce vazia. O arquivo enche quando o usuário salva uma edição; as
// notificações, quando a coleta traz matéria de urgência alta — ver
// `useLiveNotifications`, que consulta o acervo em vez de inventar alerta.
//
// Uma bandeja de entrada vazia é a resposta certa para quem acabou de chegar.
// -----------------------------------------------------------------------------
export const useNewsStore = create(
  persist(
    (set, get) => ({
      // Arquivo de clippings salvos pelo usuário
      clippings: [],

      // Notificações do que a coleta realmente trouxe
      notifications: [],

      // Favoritos — "Minha Pasta" (notícias salvas pelo usuário)
      favorites: [],

      // Último clipping carregado na sessão (vem do servidor)
      latestClipping: null,

      addClipping: (clipping) => {
        const id = `clip-${clipping.date?.split('/').reverse().join('-') || Date.now()}`
        const entry = {
          id,
          date: clipping.date?.split('/').reverse().join('-') || new Date().toISOString().slice(0, 10),
          title: `Clipping Diário — ${clipping.date}`,
          newsCount: clipping.news?.length || 0,
          alert_level: clipping.alert_level || 'NORMAL',
          preview: clipping.summary_executive?.slice(0, 140) + '…',
          categories: [...new Set((clipping.news || []).map((n) => n.category))],
          data: clipping,
        }
        // Remove duplicata da mesma data
        const filtered = get().clippings.filter((c) => c.id !== id)
        set({ clippings: [entry, ...filtered], latestClipping: clipping })
        return entry
      },

      deleteClipping: (id) =>
        set({ clippings: get().clippings.filter((c) => c.id !== id) }),

      getClipping: (id) => get().clippings.find((c) => c.id === id),

      // [ALTERADO] Favoritos / Minha Pasta
      isFavorite: (id) => get().favorites.some((f) => f.id === id),
      toggleFavorite: (news) => {
        const exists = get().favorites.some((f) => f.id === news.id)
        if (exists) {
          set({ favorites: get().favorites.filter((f) => f.id !== news.id) })
          return false
        }
        set({ favorites: [{ ...news, savedAt: new Date().toISOString() }, ...get().favorites] })
        return true
      },
      removeFavorite: (id) =>
        set({ favorites: get().favorites.filter((f) => f.id !== id) }),
      clearFavorites: () => set({ favorites: [] }),

      // Notificações
      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addNotification: (notif) =>
        set({
          notifications: [
            { id: `n-${Date.now()}`, read: false, time: new Date().toISOString(), ...notif },
            ...get().notifications,
          ].slice(0, 30),
        }),

      markAllRead: () =>
        set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),

      markRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),
    }),
    // Chave nova (-v2). Quem já abriu a plataforma tem as cinco notificações
    // falsas e o arquivo de exemplo gravados no próprio navegador; manter a
    // chave antiga faria esse conteúdo sobreviver ao deploy que o removeu.
    { name: 'defesabr-news-v2' }
  )
)
