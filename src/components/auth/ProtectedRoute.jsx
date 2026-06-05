import { Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, PROFILES } from '../../store/authStore'

const BENEFITS = [
  { icon: Bot, text: 'Gerar clipping e análises com IA' },
  { icon: Sparkles, text: 'Cenários estratégicos e recomendações' },
  { icon: FileDown, text: 'Exportar relatórios em PDF' },
]

// Bloqueia o conteúdo até o usuário autenticar (modo demo).
// A tela deixa explícito que é preciso entrar e oferece login de 1 clique.
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)

  if (isAuthenticated) return children

  const enter = (role) => {
    loginAsDemo(role)
    toast.success(`Conectado como ${PROFILES[role].label}`)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Lock size={28} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
          <ShieldCheck size={13} /> Área restrita · requer login
        </span>

        <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
          Faça login para acessar esta seção
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm muted">
          O <strong className="text-gray-200">Clipping Diário</strong> e a{' '}
          <strong className="text-gray-200">Análise Semanal</strong> são exclusivos para usuários
          autenticados. Use uma conta demonstrativa abaixo — é instantâneo e gratuito.
        </p>

        {/* Benefícios */}
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500/15 text-brand-300">
                <Icon size={15} />
              </span>
              <span className="text-gray-200">{text}</span>
            </li>
          ))}
        </ul>

        {/* Login demo de 1 clique */}
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide muted">Entrar como</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button onClick={() => enter('admin')} className="btn-primary justify-center">
            Administrador <ArrowRight size={15} />
          </button>
          <button onClick={() => enter('analista')} className="btn-ghost justify-center">
            Analista
          </button>
          <button onClick={() => enter('visitante')} className="btn-ghost justify-center">
            Visitante
          </button>
        </div>
        <p className="mt-3 text-xs muted">
          Acesso instantâneo • sem cadastro • dados de demonstração
        </p>
      </div>
    </div>
  )
}
