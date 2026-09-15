import { useProfile } from '../auth/useCan'
import UserDashboard from './UserDashboard'
import AdminDashboard from './AdminDashboard'

// O painel de cada papel responde à pergunta do trabalho dele:
//
//   • Administrador → a instalação está de pé? (serviços, fontes, contas, auditoria)
//   • Usuário       → o que aconteceu? (o acervo já filtrado)
//
// Havia um terceiro painel, do Analista, que nenhuma conta alcançava.
export default function Home() {
  return useProfile() === 'admin' ? <AdminDashboard /> : <UserDashboard />
}
