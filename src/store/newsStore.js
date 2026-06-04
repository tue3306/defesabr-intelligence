import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { archiveSeeds, seedNotifications } from '../data/mockData'

export const useNewsStore = create(
  persist(
    (set, get) => ({
      // Arquivo de clippings salvos
      clippings: archiveSeeds,

      // Notificações
      notifications: seedNotifications,

      // Último clipping gerado na sessão
      latestClipping: archiveSeeds[0]?.data || null,

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
    { name: 'defesabr-news' }
  )
)
