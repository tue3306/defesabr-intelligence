import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import FreeDashboard from './FreeDashboard'
import ProDashboard from './ProDashboard'
import AdminDashboard from './AdminDashboard'

// Painel adaptado por perfil (§11–12): cada persona tem sua própria experiência.
//   • Administrador → governança/observabilidade da plataforma.
//   • Profissional/Institucional → experiência analítica completa.
//   • Explorar (gratuita) → leitura, descoberta e educação, com upsell elegante.
export default function Home() {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const isPaid = useSubscriptionStore((s) => s.isPaid())

  if (isAdmin) return <AdminDashboard />
  if (isPaid) return <ProDashboard />
  return <FreeDashboard />
}
