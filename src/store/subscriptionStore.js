import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------------------------------------------------------
// PLANO (eixo "o quanto você VÊ"). Sprint 1: Explorar · Profissional · Institucional.
// Decisão de produto: removida a "trava de 1 área" (era hostil ao usuário e
// matava conversão). Plano pago = todas as áreas, sem armadilha.
//   plan: 'explorar' | 'profissional' | 'institucional'
// -----------------------------------------------------------------------------
export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      plan: 'explorar',
      billing: 'mensal', // 'mensal' | 'anual'
      invoices: [], // histórico de faturas (DEMO)

      setPlan: (plan) => set({ plan }),
      setBilling: (billing) => set({ billing }),

      // Assinante pago (acessa análises/briefings sem paywall).
      // Observação: para AUTORIZAÇÃO use `useCan`/`can()` (src/auth/permissions.js).
      // Este helper serve à camada de assinatura/cobrança (exibição de plano).
      isPaid: () => get().plan !== 'explorar',

      // Fatura demonstrativa (DEMO) — usada na área de Faturamento.
      addInvoice: (invoice) =>
        set({ invoices: [invoice, ...get().invoices].slice(0, 24) }),
    }),
    // [ALTERADO] chave nova: descarta o estado de plano antigo (gratuito/simples/completo)
    { name: 'defesabr-subscription-v2' }
  )
)
