import { Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight, ShieldAlert, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, PROFILES, PERMISSION_MIN_ROLE } from '../../store/authStore'

const BENEFITS = [
  { icon: Bot, text: 'Gerar clipping e análises com IA' },
  { icon: Sparkles, text: 'Cenários estratégicos e recomendações' },
  { icon: FileDown, text: 'Exportar relatórios em PDF' },
]

// Bloqueia o conteúdo até o usuário autenticar (modo demo) e, opcionalmente,
// exige uma permissão (ex.: "analyst") — mostrando como obter o acesso.
export default function ProtectedRoute({ children, permission }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  const user = useAuthStore((s) => s.user)

  const enter = (role) => {
    loginAsDemo(role)
    toast.success(`Conectado como ${PROFILES[role].label}`)
  }

  // 1) Não autenticado → muro de login.
  if (!isAuthenticated) {
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
            Os módulos internos são exclusivos para usuários autenticados. Use uma conta
            demonstrativa abaixo — é instantâneo e gratuito.
          </p>

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

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide muted">Entrar como</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button onClick={() => enter('admin')} className="btn-primary justify-center">
              Administrador <ArrowRight size={15} />
            </button>
            <button onClick={() => enter('analista')} className="btn-ghost justify-center">Analista</button>
            <button onClick={() => enter('gratuito')} className="btn-ghost justify-center">{PROFILES.gratuito.label}</button>
          </div>
          <p className="mt-3 text-xs muted">Acesso instantâneo • sem cadastro • dados de demonstração</p>
        </div>
      </div>
    )
  }

  // 2) Autenticado, mas sem a permissão exigida → tela de "perfil insuficiente".
  if (permission && !hasPermission(permission)) {
    const minRole = PERMISSION_MIN_ROLE[permission] || 'analista'
    const minProfile = PROFILES[minRole]
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="card w-full max-w-lg p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <ShieldAlert size={28} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <Lock size={13} /> Recurso de {minProfile.label}
          </span>

          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
            Esta seção é exclusiva do perfil {minProfile.label}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm muted">
            Você está como <strong className="text-gray-200">{PROFILES[user?.role]?.label || user?.role}</strong>.
            {' '}{minProfile.description}
          </p>

          <div className="mx-auto mt-5 max-w-sm rounded-xl bg-white/5 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide muted">O {minProfile.label} pode</p>
            <ul className="space-y-1.5">
              {minProfile.capabilities.filter((c) => c.ok).slice(0, 4).map((c) => (
                <li key={c.text} className="flex items-start gap-2 text-sm text-gray-200">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" /> {c.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide muted">Trocar de perfil (demo)</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button onClick={() => enter(minRole)} className="btn-primary">
              Entrar como {minProfile.label} <ArrowRight size={15} />
            </button>
            {minRole !== 'admin' && (
              <button onClick={() => enter('admin')} className="btn-ghost">Como Administrador</button>
            )}
          </div>
          <p className="mt-3 text-xs muted">No modo demonstração você alterna entre perfis livremente.</p>
        </div>
      </div>
    )
  }

  return children
}
