import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { resolveProfile, profileCan, denialReason, normalizeCapability, PROFILES } from './permissions'

// -----------------------------------------------------------------------------
// Hooks de autorização — a forma recomendada de consultar permissões na UI.
// Reagem a mudanças de papel (authStore) E de plano (subscriptionStore).
// -----------------------------------------------------------------------------

/** Perfil efetivo atual: 'visitor' | 'free' | 'pro' | 'admin'. */
export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  const plan = useSubscriptionStore((s) => s.plan)
  return resolveProfile({ isAuthenticated, role, plan })
}

/** Metadados do perfil atual (label, tagline) — para exibir na interface. */
export function useProfileMeta() {
  const profile = useProfile()
  return PROFILES[profile] || PROFILES.visitor
}

/**
 * Verificador de capacidade.
 *   const can = useCan()
 *   can('ai.generate')  →  true | false
 */
export function useCan() {
  const profile = useProfile()
  return (capability) => profileCan(profile, normalizeCapability(capability))
}

/** Motivo do bloqueio de uma capacidade: 'auth' | 'plan' | 'role' | null. */
export function useDenialReason(capability) {
  const profile = useProfile()
  return denialReason(profile, normalizeCapability(capability))
}
