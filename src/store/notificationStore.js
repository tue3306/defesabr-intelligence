import { create } from 'zustand'
import { request } from '../services/client'

// -----------------------------------------------------------------------------
// NOTIFICAÇÕES — espelho do que o servidor guarda para a conta
//
// Os avisos são gerados pela coleta e o estado de leitura mora no banco, por
// conta (ver server/src/lib/notificacoes.js). Esta loja NÃO persiste nada no
// navegador: ela é a cópia em memória da última resposta, para o sino, o painel
// e a central mostrarem o mesmo número sem cada um consultar por conta própria.
//
// As ações atualizam a tela na hora e confirmam no servidor; se o servidor
// recusar, a lista é recarregada e a tela volta a dizer a verdade.
// -----------------------------------------------------------------------------

const vazio = { items: [], unread: 0, total: 0, carregado: false, erro: null }

export const useNotificationStore = create((set, get) => ({
  ...vazio,
  carregando: false,

  /** Busca a lista da conta. Devolve os itens (ou null em falha). */
  carregar: async () => {
    set({ carregando: true })
    try {
      const { data } = await request('GET /notifications', { params: { limit: 100 } })
      set({
        items: data?.items || [],
        unread: data?.unread ?? 0,
        total: data?.total ?? 0,
        carregado: true,
        carregando: false,
        erro: null,
      })
      return data?.items || []
    } catch (err) {
      set({ carregando: false, erro: err?.message || 'Não foi possível carregar as notificações.' })
      return null
    }
  },

  marcarLida: async (id) => {
    const alvo = get().items.find((n) => n.id === id)
    if (!alvo || alvo.read) return
    set({
      items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unread: Math.max(0, get().unread - 1),
    })
    try { await request(`POST /notifications/${id}/read`) } catch { get().carregar() }
  },

  marcarNaoLida: async (id) => {
    const alvo = get().items.find((n) => n.id === id)
    if (!alvo || !alvo.read) return
    set({
      items: get().items.map((n) => (n.id === id ? { ...n, read: false } : n)),
      unread: get().unread + 1,
    })
    try { await request(`DELETE /notifications/${id}/read`) } catch { get().carregar() }
  },

  marcarTodasLidas: async () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })), unread: 0 })
    try { await request('POST /notifications/read-all') } catch { get().carregar() }
  },

  /** Dispensa: some da lista desta conta. */
  dispensar: async (id) => {
    const alvo = get().items.find((n) => n.id === id)
    if (!alvo) return
    set({
      items: get().items.filter((n) => n.id !== id),
      unread: alvo.read ? get().unread : Math.max(0, get().unread - 1),
      total: Math.max(0, get().total - 1),
    })
    try { await request(`DELETE /notifications/${id}`) } catch { get().carregar() }
  },

  /** Esquece a conta anterior — chamado ao sair. */
  limpar: () => set({ ...vazio, carregando: false }),
}))

export default useNotificationStore
