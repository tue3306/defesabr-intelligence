import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  resolveProfile, contextCan, denialReason, requiredRoleFor, PROFILES,
} from './permissions'

// -----------------------------------------------------------------------------
// Hooks de autorização — a forma de consultar permissões na interface.
// Reagem à sessão (authStore). A guarda de verdade é o servidor.
// -----------------------------------------------------------------------------

/** Contexto reativo de autorização. */
export function useAuthContext() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  return useMemo(() => ({ isAuthenticated, role }), [isAuthenticated, role])
}

/** Perfil efetivo atual: 'visitor' | 'user' | 'admin'. */
export function useProfile() {
  return resolveProfile(useAuthContext())
}

/** Metadados do perfil atual (rótulo e descrição). */
export function useProfileMeta() {
  return PROFILES[useProfile()] || PROFILES.visitor
}

/**
 * Verificador de capacidade.
 *   const can = useCan()
 *   can('admin.access')  →  true | false
 */
export function useCan() {
  const ctx = useAuthContext()
  return useMemo(() => (capability) => contextCan(ctx, capability), [ctx])
}

/** Se pode, e se não pode, por quê e qual papel falta. */
export function useGate(capability) {
  const ctx = useAuthContext()
  return useMemo(() => {
    const allowed = contextCan(ctx, capability)
    return {
      allowed,
      reason: allowed ? null : denialReason(ctx, capability),
      requiredRole: requiredRoleFor(capability),
    }
  }, [ctx, capability])
}
