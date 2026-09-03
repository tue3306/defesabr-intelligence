import { useProfile } from '../auth/useCan'
import UserDashboard from './UserDashboard'
import AnalystDashboard from './AnalystDashboard'
import AdminDashboard from './AdminDashboard'

// Despacho do painel pelo PERFIL efetivo (nunca por papel cru — §10).
//
// Os três perfis abriam praticamente a mesma tela, e era esse o problema: o
// papel mudava o rótulo no menu e mais nada. Agora cada um responde à pergunta
// que o seu trabalho faz:
//
//   • Administrador → a plataforma está de pé? (governança e observabilidade)
//   • Analista      → a coleta está saudável? (fontes, filtro, execuções)
//   • Usuário       → o que aconteceu? (o acervo já filtrado)
//
// A separação não é cosmética: o painel do Analista consome `/system/runs`, que
// exige papel `analyst` no servidor. Trocar o perfil no localStorage não abre
// nada — o token é assinado e o papel vem dele.
export default function Home() {
  const profile = useProfile()

  if (profile === 'admin') return <AdminDashboard />
  if (profile === 'analyst') return <AnalystDashboard />
  return <UserDashboard />
}
