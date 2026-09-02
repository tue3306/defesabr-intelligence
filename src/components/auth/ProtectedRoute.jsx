import { Link } from 'react-router-dom'
import {
  Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight, ShieldAlert, Check,
  UserCog, PenTool,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, DEMO_PERSONAS, LOGIN_PERSONAS } from '../../store/authStore'
import { useGate } from '../../auth/useCan'
import { CAPABILITIES, PLAN_LABELS, PROFILES } from '../../auth/permissions'

const BENEFITS = [
  { icon: Bot, text: 'Painel de situação, mapa de risco e clipping diário' },
  { icon: Sparkles, text: 'Dossiês, cenários e programas estratégicos' },
  { icon: FileDown, text: 'Relatórios, exportações e mesa do analista' },
]

// Textos do bloqueio por PAPEL, por perfil exigido.
const ROLE_WALL = {
  analyst: {
    icon: PenTool,
    persona: 'analista',
    title: 'Recurso do perfil Analista',
    desc: 'Esta área é da produção de inteligência — quem redige, avalia e publica o conteúdo da plataforma.',
    perks: [
      'Mesa de trabalho: fila de produção, RFIs e plano de coleta',
      'Gerar clipping e análises com IA, atribuir nível de tensão',
      'Classificar fontes, narrativas e publicar briefings',
    ],
    cta: 'Entrar como Analista',
  },
  admin: {
    icon: UserCog,
    persona: 'admin',
    title: 'Recurso do Administrador',
    desc: 'Esta seção é de governança da plataforma — contas, fontes, integrações e auditoria.',
    perks: [
      'Gestão de contas, papéis e planos',
      'Fontes de coleta, integrações e chaves de IA',
      'Trilha de auditoria e saúde do sistema',
    ],
    cta: 'Entrar como Administrador',
  },
}

// Bloqueia o conteúdo até autenticar e, opcionalmente, exige uma capacidade.
// O bloqueio explica se é por PLANO (profundidade) ou por PAPEL (produção /
// governança) — e sempre oferece o caminho de saída.
export default function ProtectedRoute({ children, permission, capability }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  // `capability` é o nome novo; `permission` fica por compatibilidade.
  const required = capability || permission
  const gate = useGate(required)

  const enter = (key) => {
    const p = DEMO_PERSONAS[key]
    loginAsDemo(key)
    toast.success(`Conectado como ${p.roleLabel}`)
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
          {LOGIN_PERSONAS.map((key, i) => {
            const p = DEMO_PERSONAS[key]
            return (
              <button
                key={key}
                onClick={() => enter(key)}
                className={`${i === 0 ? 'btn-primary' : 'btn-ghost'} justify-center`}
              >
                {p.roleLabel} {i === 0 && <ArrowRight size={15} />}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs muted">Acesso instantâneo • sem cadastro • dados coletados ao vivo</p>
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
            <button onClick={() => enter('analista')} className="btn-ghost">
              Ver como Analista (demo)
            </button>
          </div>
          <p className="mt-3 text-xs muted">A troca de perfil é livre: a verificação acontece no navegador.</p>
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
          <button onClick={() => enter(wall.persona)} className="btn-primary">
            {wall.cta} <ArrowRight size={15} />
          </button>
          <Link to="/painel" className="btn-ghost">Voltar ao painel</Link>
        </div>
        <p className="mt-3 text-xs muted">
          Perfil exigido: <strong>{target?.label || wall.persona}</strong> · a troca é livre.
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
