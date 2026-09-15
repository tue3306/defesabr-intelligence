import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Lock, ShieldCheck, LayoutDashboard, FileDown, Bell, ArrowRight, Check, UserCog, LogIn, UserPlus,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useGate } from '../../auth/useCan'
import AuthModal from './AuthModal'

// O que a conta REALMENTE dá. Esta lista prometia "dossiês, cenários e
// programas estratégicos" e "mesa do analista" — telas que foram removidas por
// exibirem texto escrito à mão. Prometer na porta o que não existe lá dentro é
// a pior hora de mentir: o visitante entra justamente para conferir.
const BENEFITS = [
  { icon: LayoutDashboard, text: 'Painel de situação, correlações entre notícias e clipping diário' },
  { icon: Bell, text: 'Notificações de matéria urgente e de ataque a organização brasileira' },
  { icon: FileDown, text: 'Exportação do clipping em PDF e das séries em CSV' },
]

// O único bloqueio por papel que existe: a área de quem opera a instalação.
// Sem botão de "entrar como administrador" — quem administra já tem a
// credencial, e o botão convidaria justamente quem não deveria passar.
const MURO_ADMIN = {
  title: 'Área de quem opera a instalação',
  desc: 'Contas, fontes de coleta, auditoria e saúde dos serviços. Não há nada aqui para quem '
    + 'consulta o acervo — e a restrição é conferida no servidor, não só no menu.',
  perks: [
    'Estado real de cada capacidade da plataforma, derivado do banco',
    'Disparar coleta manualmente, no total ou por fonte',
    'Trilha de auditoria e saúde dos serviços',
  ],
}

// Bloqueia o conteúdo até autenticar e, opcionalmente, exige uma capacidade.
export default function ProtectedRoute({ children, capability }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const gate = useGate(capability)
  const [auth, setAuth] = useState(null) // 'entrar' | 'cadastrar' | null

  // 1) Sem sessão → entrar ou criar conta.
  if (!isAuthenticated) {
    return (
      <>
        <Wall
          icon={Lock}
          chip={{ icon: ShieldCheck, text: 'Área restrita · requer login', tone: 'amber' }}
          title="Entre para acessar esta seção"
          description="Entre com a sua conta ou crie uma — toda conta alcança a plataforma por completo."
          list={BENEFITS}
        >
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => setAuth('entrar')} className="btn-primary min-w-[9.5rem] justify-center">
              <LogIn size={15} /> Entrar
            </button>
            <button onClick={() => setAuth('cadastrar')} className="btn-ghost min-w-[9.5rem] justify-center">
              <UserPlus size={15} /> Criar conta
            </button>
          </div>
        </Wall>
        <AuthModal open={!!auth} onClose={() => setAuth(null)} abaInicial={auth || 'entrar'} />
      </>
    )
  }

  // 2) Autenticado, mas sem o papel → a área é de administração.
  if (capability && !gate.allowed) {
    return (
      <Wall
        icon={UserCog}
        chip={{ icon: Lock, text: 'Restrito a administradores', tone: 'brand' }}
        title={MURO_ADMIN.title}
        description={MURO_ADMIN.desc}
        list={MURO_ADMIN.perks.map((text) => ({ text }))}
      >
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/painel" className="btn-primary">Voltar ao painel <ArrowRight size={15} /></Link>
        </div>
      </Wall>
    )
  }

  return children
}

// ── Cartão de bloqueio ──────────────────────────────────────────────────────────
function Wall({ icon: Icon, chip, title, description, list = [], children }) {
  const chipTone = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    gold: 'bg-gold-500/10 text-gold-600 dark:text-gold-400',
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  }[chip?.tone || 'brand']
  const iconTone = {
    amber: 'bg-amber-500/15 text-amber-500 dark:text-amber-400',
    gold: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
    brand: 'bg-brand-500/15 text-brand-500 dark:text-brand-300',
  }[chip?.tone || 'brand']
  const ChipIcon = chip?.icon

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 text-center sm:p-8">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${iconTone}`}>
          <Icon size={28} />
        </div>
        {chip && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${chipTone}`}>
            {ChipIcon && <ChipIcon size={13} />} {chip.text}
          </span>
        )}
        <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed muted">{description}</p>

        {list.length > 0 && (
          <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
            {list.map(({ icon: ItemIcon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/15 text-brand-500 dark:text-brand-300">
                  {ItemIcon ? <ItemIcon size={14} /> : <Check size={14} />}
                </span>
                <span className="text-gray-700 dark:text-gray-200">{text}</span>
              </li>
            ))}
          </ul>
        )}

        {children}
      </div>
    </div>
  )
}
