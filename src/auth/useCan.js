import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import {
  resolveProfile, resolveCapabilities, contextCan, denialReason,
  normalizeCapability, requiredPlanFor, requiredRoleFor, PROFILES,
} from './permissions'

// -----------------------------------------------------------------------------
// Hooks de autorização — a forma recomendada de consultar permissões na UI.
// Reagem a mudanças de papel (authStore) E de plano (subscriptionStore).
// -----------------------------------------------------------------------------

/** Contexto reativo de autorização. */
export function useAuthContext() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  const plan = useSubscriptionStore((s) => s.plan)
  return useMemo(() => ({ isAuthenticated, role, plan }), [isAuthenticated, role, plan])
}

/** Perfil efetivo atual: 'visitor' | 'user' | 'analyst' | 'admin'. */
export function useProfile() {
  return resolveProfile(useAuthContext())
}

/** Metadados do perfil atual (label, tagline, cor) — para exibir na interface. */
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
  const ctx = useAuthContext()
  return useMemo(() => (capability) => contextCan(ctx, capability), [ctx])
}

/** Lista completa de capacidades ativas (telas de diagnóstico/conta). */
export function useCapabilities() {
  const ctx = useAuthContext()
  return useMemo(() => resolveCapabilities(ctx), [ctx])
}

/** Motivo do bloqueio de uma capacidade: 'auth' | 'plan' | 'role' | null. */
export function useDenialReason(capability) {
  const ctx = useAuthContext()
  return denialReason(ctx, normalizeCapability(capability))
}

/**
 * Tudo o que a UI precisa para renderizar um bloqueio honesto:
 * se pode, por que não pode, e qual é o caminho (plano ou papel).
 */
export function useGate(capability) {
  const ctx = useAuthContext()
  const cap = normalizeCapability(capability)
  return useMemo(() => {
    const allowed = contextCan(ctx, cap)
    return {
      allowed,
      reason: allowed ? null : denialReason(ctx, cap),
      requiredPlan: requiredPlanFor(cap),
      requiredRole: requiredRoleFor(cap),
    }
  }, [ctx, cap])
}
