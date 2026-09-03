import { Link } from 'react-router-dom'
import {
  Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight, ShieldAlert, Check,
  UserCog, PenTool,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useContasDemo, ROTULO_PAPEL } from '../../auth/useContasDemo'
import { useGate } from '../../auth/useCan'
import { CAPABILITIES, PLAN_LABELS, PROFILES } from '../../auth/permissions'

// O que a conta REALMENTE dá. Esta lista prometia "dossiês, cenários e
// programas estratégicos" e "mesa do analista" — telas que foram removidas por
// exibirem texto escrito à mão. Prometer na porta o que não existe lá dentro é
// a pior hora de mentir: o visitante entra justamente para conferir.
const BENEFITS = [
  { icon: Bot, text: 'Painel de situação, cobertura por país e clipping diário' },
  { icon: Sparkles, text: 'Busca no acervo, arquivo pessoal e séries econômicas' },
  { icon: FileDown, text: 'Exportação em PDF e CSV, conforme o plano' },
]

// Textos do bloqueio por PAPEL, por perfil exigido.
const ROLE_WALL = {
  analyst: {
    icon: PenTool,
    papel: 'analyst',
    title: 'Recurso do perfil Analista',
    desc: 'Esta área é de quem monitora a coleta — inspeciona o filtro de relevância, acompanha as fontes e audita as execuções.',
    perks: [
      'Método do filtro de relevância, com teste ao vivo em qualquer texto',
      'Disponibilidade medida de cada fonte cadastrada',
      'Histórico de execuções dos coletores, com duração e erro',
    ],
    cta: 'Entrar como Analista',
  },
  admin: {
    icon: UserCog,
    papel: 'admin',
    title: 'Recurso do Administrador',
    desc: 'Esta seção é de governança da plataforma — contas, fontes, integrações e auditoria.',
    perks: [
      'Estado real de cada capacidade da plataforma, derivado do banco',
      'Disparar coleta manualmente, no total ou por fonte',
      'Trilha de auditoria e saúde dos serviços',
    ],
    cta: 'Entrar como Administrador',
  },
}

// Bloqueia o conteúdo até autenticar e, opcionalmente, exige uma capacidade.
// O bloqueio explica se é por PLANO (profundidade) ou por PAPEL (produção /
// governança) — e sempre oferece o caminho de saída.
export default function ProtectedRoute({ children, permission, capability }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { contas, entrarComo } = useContasDemo()
  // `capability` é o nome novo; `permission` fica por compatibilidade.
  const required = capability || permission
  const gate = useGate(required)

  // Login real contra a conta de exemplo do papel escolhido.
  const entrar = async (papel) => {
    const r = await entrarComo(papel)
    if (r?.ok) toast.success(`Conectado como ${ROTULO_PAPEL[papel]}`)
    else toast.error(r?.error || 'Não foi possível entrar.')
  }

  // 1) Não autenticado → muro de login com as 3 personas autenticáveis.
  if (!isAuthenticated) {
    return (
      <Wall
        icon={Lock}
        chip={{ icon: ShieldCheck, text: 'Área restrita · requer login', tone: 'amber' }}
        title="Entre para acessar esta seção"
        description="Escolha um perfil de acesso — instantâneo, sem cadastro."
        list={BENEFITS.map((b) => ({ icon: b.icon, text: b.text }))}
      >
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide muted">Entrar como</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {contas.map((c, i) => (
            <button
              key={c.email}
              onClick={() => entrar(c.role)}
              className={`${i === 0 ? 'btn-primary' : 'btn-ghost'} justify-center`}
            >
              {ROTULO_PAPEL[c.role] || c.role} {i === 0 && <ArrowRight size={15} />}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs muted">
          Contas de exemplo, uma por perfil — cada uma alcança um recorte diferente da plataforma,
          e a diferença é verificada no servidor.
        </p>
      </Wall>
    )
  }

  // 2) Autenticado, mas sem a capacidade → explica se é PLANO ou PAPEL.
  if (required && !gate.allowed) {
    const capLabel = CAPABILITIES[required]?.label

    // ── Bloqueio por PLANO ──
    if (gate.reason === 'plan') {
      const planLabel = PLAN_LABELS[gate.requiredPlan] || 'Profissional'
      return (
        <Wall
          icon={ShieldAlert}
          chip={{ icon: Lock, text: 'Bloqueado pelo plano', tone: 'gold' }}
          title={`Recurso do plano ${planLabel}`}
          description={
            capLabel
              ? `“${capLabel}” faz parte da profundidade analítica do plano ${planLabel}.`
              : `Esta seção faz parte da profundidade analítica do plano ${planLabel}.`
          }
          list={[
            { text: 'Todas as áreas de análise, cenários e riscos' },
            { text: 'Assistente de IA, relatórios e exportação (PDF/CSV)' },
            { text: 'Filtros avançados, alertas e modo apresentação' },
          ]}
        >
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/planos" className="btn-primary">
              Ver planos <ArrowRight size={15} />
            </Link>
            <button onClick={() => entrar('analyst')} className="btn-ghost">
              Entrar como Analista
            </button>
          </div>
          <p className="mt-3 text-xs muted">A troca é livre nas contas de exemplo; o que cada uma alcança é decidido pelo servidor.</p>
        </Wall>
      )
    }

    // ── Bloqueio por PAPEL ──
    const wall = ROLE_WALL[gate.requiredRole] || ROLE_WALL.admin
    const target = PROFILES[gate.requiredRole]
    return (
      <Wall
        icon={wall.icon}
        chip={{ icon: Lock, text: 'Bloqueado pelo perfil', tone: 'brand' }}
        title={wall.title}
        description={wall.desc}
        list={wall.perks.map((text) => ({ text }))}
      >
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => entrar(wall.papel)} className="btn-primary">
            {wall.cta} <ArrowRight size={15} />
          </button>
          <Link to="/painel" className="btn-ghost">Voltar ao painel</Link>
        </div>
        <p className="mt-3 text-xs muted">
          Perfil exigido: <strong>{target?.label || wall.papel}</strong> — verificado no servidor.
        </p>
      </Wall>
    )
  }

  return children
}

// ── Cartão de bloqueio compartilhado pelos três casos ─────────────────────────
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
