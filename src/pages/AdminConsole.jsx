import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Users, Database, PlugZap, ScrollText, HeartPulse,
  Download, Trash2, Ban, RotateCcw, RefreshCw, Search,
  Play, Pause, Server, TerminalSquare, HardDrive, Eraser, Link2, Lock, Loader2, AlertTriangle, KeyRound, Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import { apiOnline } from '../services/apiBridge'
import DataState from '../components/ui/DataState'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import { SkeletonCard } from '../components/ui/Skeleton'
import Can from '../auth/Can'
import { useCan } from '../auth/useCan'
import { ROLE_LABELS } from '../auth/permissions'
import { useAuthStore } from '../store/authStore'
import { adminService } from '../services'
import { useResource } from '../hooks/useResource'
import { USER_STATUS, HEALTH_STATUS, AUDIT_LEVEL, SOURCE_STATUS } from '../data/adminData'
import { exportCSV } from '../utils/exportUtils'
import { formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// CONSOLE DE GOVERNANÇA (/admin)
//
// Cada ação daqui é uma chamada ao servidor, com efeito imediato e registro na
// trilha de auditoria. O console já anunciou "Conta de fulano removida",
// "Convite registrado" e "Coleta pausada" alterando só uma lista na memória do
// navegador — a pessoa "removida" continuava entrando. Mensagem de sucesso só
// aparece agora depois que o servidor confirma.
// -----------------------------------------------------------------------------

const PER_PAGE = 10
const mensagemDeErro = (e, padrao) => e?.userMessage || e?.message || padrao

const TABS = [
  { id: 'contas', label: 'Contas e papéis', icon: Users, capability: 'admin.users' },
  { id: 'fontes', label: 'Fontes e coleta', icon: Database, capability: 'admin.sources' },
  { id: 'integracoes', label: 'Integrações', icon: PlugZap, capability: 'admin.integrations' },
  { id: 'auditoria', label: 'Auditoria', icon: ScrollText, capability: 'admin.logs' },
  { id: 'saude', label: 'Saúde e diagnóstico', icon: HeartPulse, capability: 'admin.health' },
]

export default function AdminConsole() {
  const can = useCan()
  const [tab, setTab] = useState('contas')

  const [apiViva, setApiViva] = useState(false)
  useEffect(() => {
    let vivo = true
    apiOnline().then((ok) => { if (vivo) setApiViva(ok) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const visibleTabs = useMemo(() => TABS.filter((t) => can(t.capability)), [can])
  const active = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Console de Governança"
        description="Contas e papéis, fontes de coleta, integrações, trilha de auditoria e saúde dos serviços."
        help="Tudo aqui é o estado do servidor, e toda alteração acontece no servidor: suspender, remover ou trocar o papel de uma conta vale na próxima requisição da pessoa, sem esperar a sessão vencer. Cada ato fica registrado na aba Auditoria com o nome de quem o fez."
        breadcrumb={[{ label: 'Administração' }, { label: 'Governança' }]}
        badges={<Badge type={apiViva ? 'live' : 'sem-dado'} />}
        accent="red"
      >
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active === id ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === id
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-300 text-gray-500 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </PageHeader>

      {!active && (
        <EmptyState
          icon={Lock}
          tone="locked"
          title="Sem recursos de governança neste acesso"
          hint="O console reúne contas, fontes, integrações, auditoria e saúde, e é restrito a administradores."
          action={{ label: 'Voltar ao painel', to: '/painel' }}
        />
      )}

      {active === 'contas' && <ContasSection />}
      {active === 'fontes' && <FontesSection />}
      {active === 'integracoes' && <IntegracoesSection />}
      {active === 'auditoria' && <AuditoriaSection />}
      {active === 'saude' && <SaudeSection />}
    </div>
  )
}

function Section({ children, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// =============================================================================
// CONTAS E PAPÉIS
// =============================================================================
const ROLE_OPTIONS = ['user', 'admin']
const STATUS_OPTIONS = ['ativo', 'suspenso']

const CONFIRMACOES = {
  suspender: (c) => ({
    title: 'Suspender conta',
    description: `${c.name} perde o acesso na próxima requisição — inclusive a sessão aberta agora. O histórico e a pasta são preservados, e a conta pode ser reativada.`,
    confirmLabel: 'Suspender',
    tone: 'danger',
    icon: Ban,
  }),
  reativar: (c) => ({
    title: 'Reativar conta',
    description: `${c.name} volta a entrar com a mesma senha e o mesmo papel.`,
    confirmLabel: 'Reativar',
    tone: 'default',
    icon: RotateCcw,
  }),
  remover: (c) => ({
    title: 'Remover conta',
    description: `A conta de ${c.name} e a pasta pessoal dela são apagadas do banco. Não há como desfazer; a remoção fica registrada na auditoria.`,
    confirmLabel: 'Remover definitivamente',
    tone: 'danger',
    icon: Trash2,
  }),
  senha: (c) => ({
    title: 'Gerar senha temporária',
    description: `A senha atual de ${c.name} deixa de valer e todas as sessões dela caem. A senha nova aparece uma única vez para você repassar; a pessoa a troca em Minha conta → Segurança.`,
    confirmLabel: 'Gerar senha',
    tone: 'danger',
    icon: KeyRound,
  }),
  papel: (c, role) => ({
    title: role === 'admin' ? 'Promover a administrador' : 'Rebaixar a usuário',
    description: role === 'admin'
      ? `${c.name} passa a governar contas, fontes, chaves e coleta desta instalação — o mesmo acesso que você tem.`
      : `${c.name} perde o acesso ao console de governança na próxima requisição.`,
    confirmLabel: role === 'admin' ? 'Promover' : 'Rebaixar',
    tone: role === 'admin' ? 'default' : 'danger',
    icon: ShieldCheck,
  }),
}

function ContasSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.users(), [], { keepPreviousData: true })
  const meuId = useAuthStore((s) => s.user?.id)
  const accounts = useMemo(() => data?.items || [], [data])

  const [q, setQ] = useState('')
  const [role, setRole] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null) // { kind, account, role? }
  const [ocupada, setOcupada] = useState(null) // id da conta com ação em andamento
  const [senhaGerada, setSenhaGerada] = useState(null) // { name, username, senha }

  useEffect(() => { setPage(1) }, [q, role, status])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return accounts.filter((a) => {
      const matchQ = !needle || `${a.name} ${a.username || ''} ${a.email || ''}`.toLowerCase().includes(needle)
      return matchQ && (role === 'todos' || a.role === role) && (status === 'todos' || a.status === status)
    })
  }, [accounts, q, role, status])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const hasFilters = q !== '' || role !== 'todos' || status !== 'todos'

  const admins = accounts.filter((a) => a.role === 'admin' && a.status === 'ativo').length
  const suspensas = accounts.filter((a) => a.status === 'suspenso').length

  const executar = async () => {
    if (!confirm) return
    const { kind, account, role: novoPapel } = confirm
    setOcupada(account.id)
    try {
      if (kind === 'senha') {
        const { data: r } = await adminService.senhaTemporaria(account.id)
        setSenhaGerada({ name: account.name, username: r?.conta?.username || account.username, senha: r?.senhaTemporaria })
      } else if (kind === 'remover') {
        await adminService.removerConta(account.id)
        toast.success(`Conta removida: ${account.name}.`)
      } else if (kind === 'papel') {
        await adminService.atualizarConta(account.id, { role: novoPapel })
        toast.success(`${account.name} agora é ${ROLE_LABELS[novoPapel]}.`)
      } else {
        const alvo = kind === 'suspender' ? 'suspenso' : 'ativo'
        await adminService.atualizarConta(account.id, { status: alvo })
        toast.success(kind === 'suspender' ? `Conta suspensa: ${account.name}.` : `Conta reativada: ${account.name}.`)
      }
      await refetch()
    } catch (e) {
      // 409 traz o motivo do servidor: própria conta ou último administrador.
      toast.error(mensagemDeErro(e, 'Não foi possível concluir.'))
    } finally {
      setOcupada(null)
    }
  }

  const exportar = () => {
    if (!filtered.length) {
      toast.error('Nenhuma conta corresponde aos filtros — nada a exportar.')
      return
    }
    exportCSV(
      filtered.map((a) => ({
        Nome: a.name,
        Usuário: a.username || '—',
        'E-mail': a.email || '—',
        Papel: ROLE_LABELS[a.role] || a.role,
        Situação: USER_STATUS[a.status]?.label || a.status,
        'Criada em': a.since ? formatDateTimeBR(a.since) : '—',
        'Último acesso': a.lastAccess ? formatDateTimeBR(a.lastAccess) : '—',
      })),
      'defesabr-contas.csv'
    )
    toast.success(`${filtered.length} conta(s) exportada(s) em CSV.`)
  }

  const dialogo = confirm ? CONFIRMACOES[confirm.kind](confirm.account, confirm.role) : null

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Contas da plataforma</h2>
            <p className="text-sm muted">
              {accounts.length} conta(s) · {admins} administrador(es) ativo(s) · {suspensas} suspensa(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => refetch()} className="btn-ghost"><RefreshCw size={15} /> Atualizar</button>
            <button onClick={exportar} className="btn-ghost"><Download size={15} /> Exportar CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, usuário ou e-mail…"
              aria-label="Buscar contas por nome, usuário ou e-mail"
              className="input pl-9"
            />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por papel" className="input">
            <option value="todos">Todos os papéis</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por situação" className="input">
            <option value="todos">Todas as situações</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{USER_STATUS[s].label}</option>)}
          </select>
        </div>

        <div className="mt-4">
          <DataState
            loading={loading && !data}
            error={error}
            empty={!rows.length}
            onRetry={refetch}
            skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
            errorTitle="Não foi possível carregar as contas"
            emptyProps={{
              tone: hasFilters ? 'filter' : 'neutral',
              title: hasFilters ? 'Nenhuma conta com esses filtros' : 'Nenhuma conta cadastrada',
              hint: hasFilters
                ? 'Combine menos critérios ou limpe os filtros.'
                : 'As contas nascem pelo cadastro na tela de entrada, sempre com papel Usuário.',
              action: hasFilters
                ? { label: 'Limpar filtros', onClick: () => { setQ(''); setRole('todos'); setStatus('todos') } }
                : undefined,
              compact: true,
            }}
          >
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                      <th className="py-2 pr-4 font-semibold">Conta</th>
                      <th className="py-2 pr-4 font-semibold">Papel</th>
                      <th className="py-2 pr-4 font-semibold">Situação</th>
                      <th className="py-2 pr-4 font-semibold">Último acesso</th>
                      <th className="py-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        isSelf={String(a.id) === String(meuId)}
                        busy={ocupada === a.id}
                        onRole={(value) => setConfirm({ kind: 'papel', account: a, role: value })}
                        onToggleStatus={() => setConfirm({ kind: a.status === 'suspenso' ? 'reativar' : 'suspender', account: a })}
                        onRemove={() => setConfirm({ kind: 'remover', account: a })}
                        onPassword={() => setConfirm({ kind: 'senha', account: a })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Pagination page={current} pages={pages} onChange={setPage} total={filtered.length} label="contas" />
              </div>
            </>
          </DataState>
        </div>

        <p className="mt-4 text-xs leading-relaxed muted">
          Não é possível alterar a própria conta nem deixar a instalação sem administrador ativo — as
          duas travas são do servidor. Toda conta nasce pelo cadastro como Usuário e pode ser promovida
          aqui. Quem esqueceu a senha recebe uma senha temporária pelo botão da chave.
        </p>
      </Section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={executar}
        tone={dialogo?.tone}
        icon={dialogo?.icon}
        title={dialogo?.title}
        description={dialogo?.description}
        confirmLabel={dialogo?.confirmLabel}
      />

      <Modal open={!!senhaGerada} onClose={() => setSenhaGerada(null)} title="Senha temporária gerada" maxWidth="max-w-md">
        {senhaGerada && (
          <div className="space-y-4">
            <p className="text-sm muted">
              Repasse a <strong>{senhaGerada.name}</strong> por um canal seguro. Ela não será mostrada de novo —
              o servidor guarda só o hash.
            </p>
            <dl className="space-y-2">
              <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <dt className="text-[10px] font-bold uppercase tracking-wider muted">Usuário</dt>
                <dd className="font-mono text-sm">{senhaGerada.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gold-500/40 bg-gold-500/5 p-3">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider muted">Senha temporária</dt>
                  <dd className="select-all font-mono text-lg font-bold tracking-wide">{senhaGerada.senha}</dd>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(senhaGerada.senha).then(() => toast.success('Senha copiada.')).catch(() => toast.error('Não foi possível copiar — selecione e copie à mão.'))}
                  className="btn-ghost shrink-0 text-sm"
                >
                  <Copy size={15} /> Copiar
                </button>
              </div>
            </dl>
            <button onClick={() => setSenhaGerada(null)} className="btn-primary w-full justify-center">Pronto</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AccountRow({ account, isSelf, busy, onRole, onToggleStatus, onRemove, onPassword }) {
  const st = USER_STATUS[account.status] || USER_STATUS.ativo
  const suspensa = account.status === 'suspenso'
  const selfNote = 'A própria conta não pode ser alterada por aqui — nem suspensa, nem rebaixada, nem removida.'

  return (
    <tr className="border-b border-gray-100 align-middle dark:border-white/[0.06]">
      <td className="py-2.5 pr-4">
        <span className="block font-medium">
          {account.name}
          {isSelf && <span className="ml-2 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-600 dark:text-gold-400">você</span>}
        </span>
        <span className="font-mono text-xs muted">{account.username || '—'}{account.email ? ` · ${account.email}` : ''}</span>
      </td>
      <td className="py-2.5 pr-4">
        <select
          value={account.role}
          onChange={(e) => { if (e.target.value !== account.role) onRole(e.target.value) }}
          disabled={isSelf || busy}
          title={isSelf ? selfNote : undefined}
          aria-label={`Papel de ${account.name}`}
          className="input h-9 min-w-[140px] py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
        </span>
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs muted">
        {account.lastAccess ? formatDateTimeBR(account.lastAccess) : 'nunca entrou'}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          {busy ? (
            <Loader2 size={16} className="animate-spin text-gray-400" aria-label="Aplicando" />
          ) : (
            <>
              <button
                onClick={onToggleStatus}
                disabled={isSelf}
                title={isSelf ? selfNote : suspensa ? 'Reativar' : 'Suspender'}
                aria-label={suspensa ? `Reativar ${account.name}` : `Suspender ${account.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:text-white"
              >
                {suspensa ? <RotateCcw size={15} /> : <Ban size={15} />}
              </button>
              <button
                onClick={onPassword}
                disabled={isSelf}
                title={isSelf ? 'A própria senha se troca em Minha conta → Segurança.' : 'Gerar senha temporária'}
                aria-label={`Gerar senha temporária para ${account.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:text-white"
              >
                <KeyRound size={15} />
              </button>
              <button
                onClick={onRemove}
                disabled={isSelf}
                title={isSelf ? selfNote : 'Remover'}
                aria-label={`Remover ${account.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-red-500 transition-colors enabled:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// =============================================================================
// FONTES E COLETA
// =============================================================================
function FontesSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.sources(), [], { keepPreviousData: true })
  const sources = useMemo(() => data?.items || [], [data])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [testando, setTestando] = useState(null)
  const [alternando, setAlternando] = useState(null)
  const [coletando, setColetando] = useState(false)
  const [checks, setChecks] = useState({})
  const [pausar, setPausar] = useState(null)

  const tipos = useMemo(() => [...new Set(sources.map((s) => s.type).filter(Boolean))].sort(), [sources])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return sources.filter((s) => {
      const matchQ = !needle || `${s.name} ${s.domain} ${s.type}`.toLowerCase().includes(needle)
      return matchQ
        && (statusFilter === 'todos' || s.status === statusFilter)
        && (tipoFilter === 'todos' || s.type === tipoFilter)
    })
  }, [sources, q, statusFilter, tipoFilter])

  // Agrupadas pela categoria real da fonte, que vem do servidor. Antes eram
  // três categorias fixas do catálogo antigo e todas caíam na mesma.
  const groups = useMemo(() => {
    const mapa = new Map()
    for (const s of filtered) {
      const chave = s.type || 'Sem categoria'
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(s)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [filtered])

  const alternar = async (s) => {
    setAlternando(s.id)
    try {
      await adminService.alternarFonte(s.id, !s.enabled)
      toast.success(s.enabled ? `Coleta de ${s.name} pausada.` : `Coleta de ${s.name} religada.`)
      await refetch()
    } catch (e) {
      toast.error(`${s.name}: ${mensagemDeErro(e, 'não foi possível alterar')}`)
    } finally {
      setAlternando(null)
    }
  }

  const testar = async (s) => {
    setTestando(s.id)
    try {
      const { data: r } = await adminService.testarFonte(s.id)
      setChecks((c) => ({ ...c, [s.id]: { ok: r?.ok !== false, latency: r?.duracaoMs ?? null, erro: r?.erro } }))
      if (r?.ok !== false) {
        toast.success(`${s.name}: respondeu em ${r?.duracaoMs ?? '?'} ms — ${r?.encontrados ?? 0} item(ns), ${r?.novos ?? 0} novo(s).`)
      } else {
        toast.error(`${s.name}: ${r?.erro || 'sem resposta'}`)
      }
      await refetch()
    } catch (e) {
      setChecks((c) => ({ ...c, [s.id]: { ok: false, latency: null, erro: mensagemDeErro(e, 'falha ao testar') } }))
      toast.error(`${s.name}: ${mensagemDeErro(e, 'falha ao testar')}`)
    } finally {
      setTestando(null)
    }
  }

  const coletarTudo = async () => {
    setColetando(true)
    const aviso = toast.loading('Coletando de todas as fontes e serviços — leva até um minuto…')
    try {
      const { data: r } = await adminService.coletarTudo()
      toast.success(
        `Coleta concluída em ${Math.round((r?.duracaoMs || 0) / 1000)} s — ${r?.noticias?.novos ?? 0} notícia(s) nova(s).`,
        { id: aviso },
      )
      await refetch()
    } catch (e) {
      toast.error(mensagemDeErro(e, 'A coleta não pôde ser concluída.'), { id: aviso })
    } finally {
      setColetando(false)
    }
  }

  const hasFilters = q !== '' || statusFilter !== 'todos' || tipoFilter !== 'todos'
  const ativas = sources.filter((s) => s.enabled).length
  const comFalha = sources.filter((s) => s.status === 'indisponivel').length

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Catálogo de fontes</h2>
            <p className="text-sm muted">
              {sources.length} fonte(s) · {ativas} com coleta ligada · {comFalha} com falha na última tentativa
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => refetch()} className="btn-ghost"><RefreshCw size={15} /> Atualizar</button>
            <button onClick={coletarTudo} disabled={coletando} className="btn-primary disabled:opacity-60">
              {coletando ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {coletando ? 'Coletando…' : 'Coletar tudo agora'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, domínio ou categoria…"
              aria-label="Buscar fontes por nome, domínio ou categoria"
              className="input pl-9"
            />
          </div>
          <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} aria-label="Filtrar fontes por categoria" className="input">
            <option value="todos">Todas as categorias</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar fontes por estado" className="input">
            <option value="todos">Todos os estados</option>
            {Object.entries(SOURCE_STATUS).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}
          </select>
        </div>

        <div className="mt-4">
          <DataState
            loading={loading && !data}
            error={error}
            empty={!groups.length}
            onRetry={refetch}
            skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
            errorTitle="Não foi possível carregar as fontes"
            emptyProps={{
              tone: hasFilters ? 'filter' : 'neutral',
              compact: true,
              title: hasFilters ? 'Nenhuma fonte com esses filtros' : 'Catálogo de fontes vazio',
              hint: hasFilters
                ? 'Amplie a busca ou volte a todas as categorias e estados.'
                : 'O servidor semeia as fontes na primeira subida. Catálogo vazio indica banco sem migração.',
              action: hasFilters
                ? { label: 'Limpar filtros', onClick: () => { setQ(''); setStatusFilter('todos'); setTipoFilter('todos') } }
                : undefined,
            }}
          >
            <div className="space-y-6">
              {groups.map(([categoria, itens]) => (
                <div key={categoria}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
                    {categoria} <span className="font-mono">({itens.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {itens.map((s) => (
                      <SourceRow
                        key={s.id}
                        source={s}
                        check={checks[s.id]}
                        testando={testando === s.id}
                        alternando={alternando === s.id}
                        ocupado={testando !== null || coletando}
                        onToggle={() => (s.enabled ? setPausar(s) : alternar(s))}
                        onTest={() => testar(s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </div>

        <p className="mt-5 text-xs muted">
          O estado vem da <strong>última tentativa real</strong> de coleta feita pelo servidor.
          Disponibilidade é a proporção de execuções em que a fonte respondeu — não é juízo sobre a
          qualidade editorial do veículo. Fontes que recusam cliente automatizado (Poder360, Marinha,
          FAB) não são cadastradas: ficariam em erro permanente.
        </p>
      </Section>

      <ConfirmDialog
        open={!!pausar}
        onClose={() => setPausar(null)}
        onConfirm={() => pausar && alternar(pausar)}
        icon={Pause}
        title="Pausar coleta da fonte"
        description={`${pausar?.name || ''} deixa de ser visitada pelo agendador até ser religada. O que já foi coletado continua no acervo.`}
        confirmLabel="Pausar"
      />
    </div>
  )
}

function SourceRow({ source, check, testando, alternando, ocupado, onToggle, onTest }) {
  const st = SOURCE_STATUS[source.status] || SOURCE_STATUS.configurada
  const disp = source.availability

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {source.name}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
          </span>
        </p>
        <p className="truncate font-mono text-xs muted">
          {source.domain} · {disp != null ? `disponibilidade ${disp}%` : 'sem execuções'} · {source.articles ?? 0} artigo(s)
          {source.last_fetch_at ? ` · última coleta ${formatDateTimeBR(source.last_fetch_at)}` : ''}
        </p>
        {source.last_error && !check && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Última falha: {source.last_error}</p>
        )}
        {check && (
          <p className={`mt-1 text-xs font-medium ${check.ok ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {check.ok ? `Teste agora: respondeu em ${check.latency ?? '?'} ms.` : `Teste agora: ${check.erro || 'sem resposta'}.`}
          </p>
        )}
      </div>

      <Can do="admin.sources">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            onClick={onToggle}
            disabled={alternando}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
              source.enabled ? 'bg-brand-500/20 text-brand-600 dark:text-brand-300' : 'bg-gray-500/15 text-gray-600 dark:text-gray-300'
            }`}
            aria-label={source.enabled ? `Pausar coleta de ${source.name}` : `Religar coleta de ${source.name}`}
          >
            {alternando ? <Loader2 size={13} className="animate-spin" /> : source.enabled ? <Pause size={13} /> : <Play size={13} />}
            {source.enabled ? 'Pausar' : 'Religar'}
          </button>
          <button
            onClick={onTest}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors enabled:hover:text-gray-900 disabled:opacity-40 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:text-white"
            aria-label={`Coletar agora de ${source.name}`}
          >
            <RefreshCw size={13} className={testando ? 'animate-spin' : undefined} />
            {testando ? 'Coletando…' : 'Coletar agora'}
          </button>
        </div>
      </Can>
    </div>
  )
}

// =============================================================================
// INTEGRAÇÕES
//
// Era um catálogo escrito à mão, com "SSO institucional (SAML/OIDC)" e um modelo
// de linguagem "planejado" quando o assistente por IA já funcionava, e um botão
// "Reconectar" que girava por 900 ms e devolvia um texto fixo. Agora são os
// serviços externos que o servidor de fato consulta, com o estado MEDIDO em
// cada execução — e sem botão que finja testar o que não testa.
// =============================================================================
function IntegracoesSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.health(), [])
  const externos = useMemo(
    () => (data?.services || []).filter((s) => s.group === 'Coleta' || s.group === 'IA'),
    [data],
  )

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Link2 size={17} className="text-brand-400 dark:text-brand-300" /> Serviços externos
            </h2>
            <p className="text-sm muted">Quem a plataforma consulta lá fora, e como foi a última vez.</p>
          </div>
          <button onClick={() => refetch()} className="btn-ghost"><RefreshCw size={15} /> Atualizar</button>
        </div>

        <DataState
          loading={loading}
          error={error}
          empty={!externos.length}
          onRetry={refetch}
          skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
          errorTitle="Não foi possível consultar as integrações"
          emptyProps={{ compact: true, title: 'Nenhuma integração registrada', hint: 'O servidor não devolveu capacidades de coleta.' }}
        >
          <div className="space-y-2">
            {externos.map((i) => {
              const st = HEALTH_STATUS[i.status] || HEALTH_STATUS.planned
              const m = i.metrics || {}
              return (
                <div key={i.id} className="rounded-lg bg-white/5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {i.name}
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide muted">{i.group}</span>
                    </p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs muted">{i.source}</p>
                  <p className="mt-1 text-xs muted">{i.note}</p>
                  {(m.ultimaExecucao || m.confiabilidade != null) && (
                    <p className="mt-1 font-mono text-[11px] muted">
                      {m.ultimaExecucao ? `última execução ${formatDateTimeBR(m.ultimaExecucao)}` : ''}
                      {m.duracaoMs != null ? ` · ${m.duracaoMs} ms` : ''}
                      {m.confiabilidade != null ? ` · ${m.confiabilidade}% das últimas execuções sem erro` : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </DataState>
      </Section>

      <Section className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
          <KeyRound size={17} className="text-brand-400 dark:text-brand-300" /> Onde ficam as chaves
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed muted">
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Chave de IA</strong> — de cada conta ou
            da instalação, definida em Minha conta → Segurança. Guardada cifrada (AES-256-GCM) no banco;
            a API devolve só os quatro últimos caracteres e o navegador nunca recebe o valor.
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Variáveis de ambiente</strong> —
            <span className="font-mono"> ANTHROPIC_API_KEY</span>, <span className="font-mono">RANSOMWARE_API_KEY</span>,
            <span className="font-mono"> GNEWS_API_KEY</span>, <span className="font-mono">NEWSDATA_API_KEY</span> e
            <span className="font-mono"> AUTH_SECRET</span> ficam no painel de quem hospeda, nunca no repositório.
          </li>
        </ul>
      </Section>
    </div>
  )
}

// =============================================================================
// AUDITORIA
// =============================================================================
const TIPOS_DE_EVENTO = { governanca: 'Governança', coleta: 'Coleta' }

function AuditoriaSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.audit({ limit: 300 }), [])
  const events = useMemo(() => data?.items || [], [data])

  const [kind, setKind] = useState('todos')
  const [level, setLevel] = useState('todos')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [kind, level, q])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      const matchQ = !needle || `${e.action} ${e.target} ${e.actor}`.toLowerCase().includes(needle)
      return matchQ && (kind === 'todos' || e.kind === kind) && (level === 'todos' || e.level === level)
    })
  }, [events, kind, level, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const hasFilters = kind !== 'todos' || level !== 'todos' || q !== ''

  const exportar = () => {
    if (!filtered.length) {
      toast.error('Nenhum evento corresponde aos filtros — nada a exportar.')
      return
    }
    exportCSV(
      filtered.map((e) => ({
        Quando: formatDateTimeBR(e.time),
        Tipo: TIPOS_DE_EVENTO[e.kind] || e.kind,
        Ator: e.actor,
        Ação: e.action,
        Alvo: e.target,
        Nível: AUDIT_LEVEL[e.level]?.label || e.level,
      })),
      'defesabr-auditoria.csv'
    )
    toast.success(`${filtered.length} evento(s) exportado(s) em CSV.`)
  }

  return (
    <Section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">Trilha de auditoria</h2>
          <p className="text-sm muted">
            Atos de governança, com quem os fez, e execuções dos coletores — {filtered.length} evento(s) no filtro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => refetch()} className="btn-ghost"><RefreshCw size={15} /> Atualizar</button>
          <button onClick={exportar} className="btn-ghost"><Download size={15} /> Exportar CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ação, alvo ou autor…"
            aria-label="Buscar eventos de auditoria"
            className="input pl-9"
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filtrar por tipo de evento" className="input">
          <option value="todos">Todos os tipos</option>
          {Object.entries(TIPOS_DE_EVENTO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filtrar por nível do evento" className="input">
          <option value="todos">Todos os níveis</option>
          {Object.entries(AUDIT_LEVEL).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}
        </select>
      </div>

      <div className="mt-4">
        <DataState
          loading={loading}
          error={error}
          empty={!rows.length}
          onRetry={refetch}
          skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
          errorTitle="Não foi possível carregar a trilha de auditoria"
          emptyProps={{
            tone: hasFilters ? 'filter' : 'neutral',
            compact: true,
            title: hasFilters ? 'Nenhum evento com esses filtros' : 'Trilha de auditoria vazia',
            hint: hasFilters
              ? 'Troque o tipo, o nível ou limpe a busca.'
              : 'Nenhum ato de governança nem execução de coleta registrado ainda.',
            action: hasFilters
              ? { label: 'Limpar filtros', onClick: () => { setKind('todos'); setLevel('todos'); setQ('') } }
              : undefined,
          }}
        >
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th className="py-2 pr-4 font-semibold">Quando</th>
                    <th className="py-2 pr-4 font-semibold">Autor</th>
                    <th className="py-2 pr-4 font-semibold">Ação</th>
                    <th className="py-2 font-semibold">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ev) => {
                    const lvl = AUDIT_LEVEL[ev.level] || AUDIT_LEVEL.info
                    return (
                      <tr key={ev.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                        <td className="py-2.5 pr-4 font-mono text-xs muted">{formatDateTimeBR(ev.time)}</td>
                        <td className="py-2.5 pr-4 text-xs">
                          <span className="block">{ev.actor}</span>
                          <span className="muted">{TIPOS_DE_EVENTO[ev.kind] || ev.kind}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="block">{ev.action}</span>
                          <span className="text-xs muted">{ev.target}</span>
                        </td>
                        <td className="py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lvl.classes}`}>{lvl.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination page={current} pages={pages} onChange={setPage} total={filtered.length} label="eventos" />
            </div>
          </>
        </DataState>
      </div>
    </Section>
  )
}

// =============================================================================
// SAÚDE E DIAGNÓSTICO
// =============================================================================
function SaudeSection() {
  const health = useResource(() => adminService.health(), [])
  const diag = useResource(() => adminService.diagnostics(), [])
  const [confirmClear, setConfirmClear] = useState(false)

  const services = health.data?.services || []
  const alertas = health.data?.alerts || []
  const d = diag.data

  const limparDadosLocais = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('defesabr-'))
    keys.forEach((k) => localStorage.removeItem(k))
    toast.success(`${keys.length} chave(s) removida(s). Recarregando…`)
    setTimeout(() => window.location.reload(), 700)
  }

  return (
    <div className="space-y-4">
      {alertas.length > 0 && (
        <Section className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a.id}
              role="alert"
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                a.nivel === 'critico' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${a.nivel === 'critico' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className="text-sm font-bold">{a.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed muted">{a.detalhe}</p>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Server size={17} className="text-brand-400 dark:text-brand-300" /> Saúde dos serviços
          </h2>
          {health.data && (
            <span className="text-sm muted">
              <strong className="font-mono">{health.data.operational}</strong> de {health.data.total - (health.data.optional || 0)} operacionais
              {health.data.optional ? ` · ${health.data.optional} não configurado(s)` : ''}
            </span>
          )}
        </div>

        <DataState
          loading={health.loading}
          error={health.error}
          empty={!services.length}
          onRetry={health.refetch}
          skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
          errorTitle="Não foi possível consultar a saúde dos serviços"
          emptyProps={{ compact: true, title: 'Nenhum serviço monitorado', hint: 'O servidor não devolveu capacidades.' }}
        >
          <div className="space-y-2">
            {services.map((s) => {
              const st = HEALTH_STATUS[s.status] || HEALTH_STATUS.planned
              return (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{s.name} <span className="text-xs font-normal muted">· {s.group}</span></p>
                    <p className="text-xs muted">{s.note}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {(s.uptime !== '—' || s.latency !== '—') && (
                      <span className="font-mono text-xs muted" title="Execuções sem erro entre as últimas dez · duração da última">
                        {s.uptime} · {s.latency}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </DataState>
      </Section>

      <Section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
          <TerminalSquare size={17} className="text-brand-400 dark:text-brand-300" /> Diagnóstico da instalação
        </h2>

        <DataState
          loading={diag.loading}
          error={diag.error}
          empty={!d}
          onRetry={diag.refetch}
          skeleton={<div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
          errorTitle="Não foi possível montar o diagnóstico"
          emptyProps={{ compact: true, title: 'Diagnóstico indisponível', hint: 'A API não respondeu à consulta de diagnóstico.' }}
        >
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Fact label="Endereço da API" value={d?.apiBaseUrl && d.apiBaseUrl !== '/api' ? d.apiBaseUrl : 'mesma origem (/api)'} />
              <Fact label="Versão" value={d?.version || '—'} />
              <Fact label="Ambiente" value={d?.environment?.ambiente || '—'} />
              <Fact label="Node" value={d?.environment?.node || '—'} />
              <Fact label="Banco" value={d?.environment?.banco || '—'} />
              <Fact label="No ar há" value={d?.environment?.uptimeSegundos != null ? duracao(d.environment.uptimeSegundos) : '—'} />
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
                Consultas mapeadas pela interface <span className="font-mono">({d?.endpoints?.length || 0})</span>
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg bg-white/5 p-3">
                <ul className="space-y-1 font-mono text-xs muted">
                  {(d?.endpoints || []).map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide muted">
                <HardDrive size={13} /> Armazenamento deste navegador <span className="font-mono">({d?.storage?.length || 0})</span>
              </p>
              {d?.storage?.length ? (
                <div className="flex flex-wrap gap-2">
                  {d.storage.map((k) => (
                    <span key={k} className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs muted">{k}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm muted">Nenhuma chave local gravada neste navegador.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Limpar dados deste navegador</p>
                <p className="text-xs muted">
                  Apaga as chaves <span className="font-mono">defesabr-*</span> daqui (sessão e preferências) e
                  recarrega. Nada no servidor é afetado.
                </p>
              </div>
              <button onClick={() => setConfirmClear(true)} className="btn-ghost shrink-0 text-red-500 dark:text-red-400">
                <Eraser size={15} /> Limpar
              </button>
            </div>
          </div>
        </DataState>
      </Section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={limparDadosLocais}
        icon={Eraser}
        title="Limpar dados deste navegador"
        description="A sessão e as preferências deste navegador serão apagadas e a aplicação recarregará como um primeiro acesso. Contas, pasta e acervo no servidor não são afetados."
        confirmLabel="Apagar e recarregar"
      />
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-sm">{value}</dd>
    </div>
  )
}

function duracao(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`
  return h ? `${h} h ${m} min` : `${m} min`
}
