import { useProfile } from '../auth/useCan'
import UserDashboard from './UserDashboard'
import AdminDashboard from './AdminDashboard'

// Cada papel vê o painel do seu trabalho:
//   • Administrador → a instalação está de pé? (serviços, fontes, contas, auditoria)
//   • Usuário       → o que aconteceu? (o acervo já filtrado)
export default function Home() {
  return useProfile() === 'admin' ? <AdminDashboard /> : <UserDashboard />
}
