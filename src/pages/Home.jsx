import { useProfile } from '../auth/useCan'
import UserDashboard from './UserDashboard'
import AdminDashboard from './AdminDashboard'

// Despacho do painel pelo PERFIL efetivo (nunca por papel cru — §10):
//   • Administrador → governança e observabilidade da plataforma.
//   • Usuário e Analista → consumo de inteligência (profundidade vem do plano).
//
// O Analista tinha um painel próprio, de mesa de produção: fila de tarefas,
// RFIs, plano de coleta. Nada daquilo vinha de lugar nenhum — era uma lista
// escrita à mão de trabalho que ninguém pediu nem fez. Saiu junto com a mesa.
// Visitante não chega aqui: a rota /painel já é protegida. Ainda assim ele cai
// no painel de leitura, que degrada sozinho para o conteúdo básico.
export default function Home() {
  const profile = useProfile()

  if (profile === 'admin') return <AdminDashboard />
  return <UserDashboard />
}
