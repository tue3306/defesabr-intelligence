import { Link } from 'react-router-dom'
import { Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight, ShieldAlert, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, DEMO_PERSONAS, PERMISSION_REASON } from '../../store/authStore'

const BENEFITS = [
  { icon: Bot, text: 'Painel de situação e mapa de risco' },
  { icon: Sparkles, text: 'Cenários estratégicos e dossiês' },
  { icon: FileDown, text: 'Clipping, análises e exportações' },
]

// Bloqueia o conteúdo até autenticar e, opcionalmente, exige uma permissão.
// O bloqueio explica se é por PLANO (produção) ou por PAPEL (administração).
export default function ProtectedRoute({ children, permission }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)

  const enter = (key) => {
    const p = DEMO_PERSONAS[key]
    loginAsDemo(key)
    toast.success(`Conectado · ${p.roleLabel} · ${p.planLabel}`)
  }

  // 1) Não autenticado → muro de login (3 personas).
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="card w-full max-w-lg p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 dark:text-amber-400">
            <Lock size={28} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            <ShieldCheck size={13} /> Área restrita · requer login
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Entre para acessar esta seção</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm muted">
            Use uma conta demonstrativa — instantâneo e gratuito.
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
            <button onClick={() => enter('profissional')} className="btn-primary justify-center">
              Profissional <ArrowRight size={15} />
            </button>
            <button onClick={() => enter('explorar')} className="btn-ghost justify-center">Explorar</button>
            <button onClick={() => enter('admin')} className="btn-ghost justify-center">Administrador</button>
          </div>
          <p className="mt-3 text-xs muted">Acesso instantâneo • sem cadastro • dados de demonstração</p>
        </div>
      </div>
    )
  }

  // 2) Autenticado, mas sem a permissão → explica se é PLANO ou PAPEL.
  if (permission && !hasPermission(permission)) {
    const reason = PERMISSION_REASON[permission] || 'plan'
    const isPlan = reason === 'plan'
    const targetPersona = isPlan ? 'profissional' : 'admin'
    const title = isPlan ? 'Recurso do plano Profissional' : 'Recurso do Administrador'
    const desc = isPlan
      ? 'Esta seção faz parte da produção de inteligência — disponível no plano Profissional (e Institucional).'
      : 'Esta seção é de governança da plataforma — disponível para o papel Administrador.'
    const perks = isPlan
      ? ['Todas as áreas de análise e cenários', 'Gerar e exportar com IA (PDF/CSV)', 'Ferramentas de fontes e narrativas']
      : ['Configurações do sistema e chave de API', 'Gestão de usuários e analytics', 'Diagnóstico do sistema']

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="card w-full max-w-lg p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <ShieldAlert size={28} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <Lock size={13} /> {isPlan ? 'Bloqueado pelo plano' : 'Bloqueado pelo papel'}
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm muted">{desc}</p>

          <div className="mx-auto mt-5 max-w-sm rounded-xl bg-white/5 p-4 text-left">
            <ul className="space-y-1.5">
              {perks.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-gray-200">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" /> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => enter(targetPersona)} className="btn-primary">
              {isPlan ? 'Entrar como Profissional' : 'Entrar como Administrador'} <ArrowRight size={15} />
            </button>
            {isPlan && <Link to="/planos" className="btn-ghost">Ver planos</Link>}
          </div>
          <p className="mt-3 text-xs muted">No modo demonstração você alterna entre as personas livremente.</p>
        </div>
      </div>
    )
  }

  return children
}
