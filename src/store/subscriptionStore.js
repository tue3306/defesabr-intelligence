import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Estado de assinatura (demonstrativo). Controla o paywall e o acesso por área.
export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      plan: 'gratuito', // 'gratuito' | 'simples' | 'completo'
      area: null, // id da área escolhida no plano Simples

      setPlan: (plan, area = null) =>
        set({ plan, area: plan === 'simples' ? area : null }),

      // Assinante pago (acessa análises/briefings)
      isPaid: () => get().plan !== 'gratuito',

      // Acesso a uma área específica
      canSeeArea: (areaId) => {
        const { plan, area } = get()
        if (plan === 'completo') return true
        if (plan === 'simples') return area === areaId
        return false
      },
    }),
    { name: 'defesabr-subscription' }
  )
)
