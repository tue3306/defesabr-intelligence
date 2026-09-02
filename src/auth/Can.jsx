import { useCan } from './useCan'

// -----------------------------------------------------------------------------
// <Can> — gate declarativo de UI. Evita espalhar `if (role === ...)` (§10).
//
//   <Can do="ai.generate">            → renderiza só se permitido
//   <Can do="ai.generate" fallback={<Upsell />}>
//   <Can not do="ai.generate">        → renderiza só se NÃO permitido (upsell)
// -----------------------------------------------------------------------------
export default function Can({ do: capability, not = false, fallback = null, children }) {
  const can = useCan()
  const allowed = can(capability)
  const show = not ? !allowed : allowed
  if (!show) return fallback
  return typeof children === 'function' ? children(allowed) : children
}
