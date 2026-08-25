import { useProfile } from '../auth/useCan'
import UserDashboard from './UserDashboard'
import AnalystDashboard from './AnalystDashboard'
import AdminDashboard from './AdminDashboard'

// Despacho do painel pelo PERFIL efetivo (nunca por papel cru — §10):
//   • Administrador → governança e observabilidade da plataforma.
//   • Analista      → mesa de situação da produção de inteligência.
//   • Usuário       → consumo de inteligência (profundidade vem do plano).
// Visitante não chega aqui: a rota /painel já é protegida. Ainda assim ele cai
// no painel de leitura, que degrada sozinho para o conteúdo básico.
export default function Home() {
  const profile = useProfile()

  if (profile === 'admin') return <AdminDashboard />
  if (profile === 'analyst') return <AnalystDashboard />
  return <UserDashboard />
}
