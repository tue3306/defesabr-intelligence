import { Link } from 'react-router-dom'
import {
  Lock, ShieldCheck, Bot, FileDown, Sparkles, ArrowRight, ShieldAlert, Check,
  UserCog, PenTool,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useContasIniciais, ROTULO_PAPEL } from '../../auth/useContasIniciais'
import { useGate } from '../../auth/useCan'
import { CAPABILITIES, PLAN_LABELS, PROFILES } from '../../auth/permissions'

// O que a conta REALMENTE dá. Esta lista prometia "dossiês, cenários e
// programas estratégicos" e "mesa do analista" — telas que foram removidas por
// exibirem texto escrito à mão. Prometer na porta o que não existe lá dentro é
// a pior hora de mentir: o visitante entra justamente para conferir.
const BENEFITS = [
  { icon: Bot, text: 'Painel de situação, cobertura por país e clipping diário' },
  { icon: Sparkles, text: 'Busca no acervo, arquivo pessoal e séries econômicas' },
  { icon: FileDown, text: 'Exportação do clipping em PDF e das séries em CSV' },
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
  // O BOTÃO DE ENTRAR COMO ADMINISTRADOR SAIU.
  //
  // `papel: null` faz o muro descrever a seção sem oferecer a porta — quem
  // administra a instalação já tem a credencial e entra pelo formulário. O
  // botão convidava justamente quem não deveria passar.
  admin: {
    icon: UserCog,
    papel: null,
    title: 'Área de governança da instalação',
    desc: 'Esta seção é de quem opera a plataforma — fontes de coleta, auditoria do filtro e '
      + 'saúde dos serviços. Não há nada aqui para quem consulta o acervo.',
    perks: [
      'Estado real de cada capacidade da plataforma, derivado do banco',
      'Disparar coleta manualmente, no total ou por fonte',
      'Trilha de auditoria e saúde dos serviços',
    ],
    cta: 'Voltar ao painel',
  },
}

// Bloqueia o conteúdo até autenticar e, opcionalmente, exige uma capacidade.
// O bloqueio explica se é por PLANO (profundidade) ou por PAPEL (produção /
// governança) — e sempre oferece o caminho de saída.
export default function ProtectedRoute({ children, permission, capability }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { contas, entrarComo } = useContasIniciais()
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
        description="Projeto de código aberto: entre com uma das contas iniciais, ou crie a sua."
        list={BENEFITS.map((b) => ({ icon: b.icon, text: b.text }))}
      >
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide muted">Contas iniciais</p>
        {/* CENTRALIZADO, E SEM GRADE FIXA.
          *
          * Era `sm:grid-cols-3`, de quando havia TRES contas de exemplo. Com
          * duas, os botoes ocupavam duas das tres colunas e encostavam a
          * esquerda, deixando um vao a direita sob um titulo centralizado — o
          * desalinhamento que denuncia que o layout foi feito para outra
          * quantidade.
          *
          * `flex` com `justify-center` nao depende da contagem: serve para
          * duas contas hoje e para quantas a instalacao semear amanha.
          *
          * A chave era `c.email`, campo que `/auth/contas` deixou de devolver
          * quando as contas passaram a entrar por nome de usuario — as duas
          * ficavam com `key={undefined}`. */}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {contas.map((c, i) => (
            <button
              key={c.username || c.role}
              onClick={() => entrar(c.role)}
              className={`${i === 0 ? 'btn-primary' : 'btn-ghost'} min-w-[9.5rem] justify-center`}
            >
              {ROTULO_PAPEL[c.role] || c.role} {i === 0 && <ArrowRight size={15} />}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs muted">
          Conta real deste projeto aberto — o acervo que ela mostra é o coletado das fontes
          públicas, sem nenhum dado simulado. Você também pode criar a sua: toda conta nova
          alcança a plataforma por completo.
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
            { text: 'Radar legislativo e séries econômicas completas' },
            { text: 'Exportação do clipping em PDF e das séries em CSV' },
            { text: 'Filtros avançados, alertas e modo apresentação' },
          ]}
        >
          {/* NÃO HÁ O QUE COMPRAR, ENTÃO NÃO HÁ "VER PLANOS".
            * Toda conta nasce com o nível de leitura completo. Chegar a este
            * muro significa que o nível foi REBAIXADO de propósito na página
            * de Níveis de acesso, para ver a plataforma pelos olhos de quem
            * alcança menos — e o caminho de volta é o mesmo lugar. */}
          {/* Este muro ficou INALCANÇÁVEL na prática: toda conta nasce com o
            * nível completo e a tela que permitia rebaixá-lo saiu. Ele fica
            * porque o eixo continua no modelo de permissão — se uma instalação
            * semear conta com nível menor, o bloqueio explica o motivo em vez de
            * mostrar tela vazia. O que não faz é oferecer uma saída que não
            * existe mais. */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/painel" className="btn-primary">
              Voltar ao painel <ArrowRight size={15} />
            </Link>
          </div>
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
        {/* SÓ HÁ BOTÃO QUANDO EXISTE PORTA.
          * `wall.papel` é nulo para a governança: quem opera a instalação já
          * tem a credencial e entra pelo formulário. Um botão "Entrar como
          * Administrador" numa tela que qualquer visitante alcança convida
          * exatamente quem não deveria passar. */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {wall.papel ? (
            <>
              <button onClick={() => entrar(wall.papel)} className="btn-primary">
                {wall.cta} <ArrowRight size={15} />
              </button>
              <Link to="/painel" className="btn-ghost">Voltar ao painel</Link>
            </>
          ) : (
            <Link to="/painel" className="btn-primary">{wall.cta} <ArrowRight size={15} /></Link>
          )}
        </div>
        {wall.papel && (
          <p className="mt-3 text-xs muted">
            Perfil exigido: <strong>{target?.label || wall.papel}</strong> — verificado no servidor.
          </p>
        )}
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
