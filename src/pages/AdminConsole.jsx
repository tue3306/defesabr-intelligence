import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Users, Database, PlugZap, ScrollText, HeartPulse,
  UserPlus, Download, Trash2, Ban, RotateCcw, RefreshCw, Search,
  Play, Pause, Server, TerminalSquare, HardDrive, Eraser, Link2, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import { SkeletonCard } from '../components/ui/Skeleton'
import Can from '../auth/Can'
import { useCan } from '../auth/useCan'
import { PLAN_LABELS } from '../auth/permissions'
import { useAuthStore, ROLES } from '../store/authStore'
import { adminService } from '../services'
import { useResource } from '../hooks/useResource'
import {
  USER_STATUS, HEALTH_STATUS, AUDIT_LEVEL, integrations as integrationCatalog,
} from '../data/adminData'
import { SOURCE_STATUS, SOURCE_CATEGORIES } from '../data/monitoredSources'
import { exportCSV } from '../utils/exportUtils'
import { formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// CONSOLE DE GOVERNANÇA (/admin) — o que o Administrador governa.
//
// Cada aba corresponde a um recurso da camada de serviços (contas, fontes,
// auditoria, saúde, diagnóstico). As ações de escrita acontecem em ESTADO LOCAL:
// não há backend para persistir, e fingir persistência seria desonesto. Com a
// API real, cada ação vira um PATCH/DELETE nos mesmos contratos.
// -----------------------------------------------------------------------------

const PER_PAGE = 10

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

  // A barra de abas reflete as capacidades reais: nada de mostrar um caminho
  // que a pessoa não pode percorrer.
  const visibleTabs = useMemo(() => TABS.filter((t) => can(t.capability)), [can])
  const active = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Console de Governança"
        description="Contas e papéis, fontes de coleta, integrações, trilha de auditoria e saúde dos serviços — o painel de controle da plataforma."
        help="As operações desta área alteram apenas a sessão atual do navegador. Quando houver backend, cada ação vira uma chamada autenticada aos mesmos endpoints já registrados."
        breadcrumb={[{ label: 'Administração' }, { label: 'Governança' }]}
        badges={<Badge type="demo" />}
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
          hint="O console reúne contas, fontes, integrações, auditoria e saúde. Nenhum desses recursos está habilitado para o seu papel."
          action={{ label: 'Voltar ao painel', to: '/painel' }}
        />
      )}

      {active === 'contas' && <ContasSection />}
      {active === 'fontes' && <FontesSection />}
      {active === 'integracoes' && <IntegracoesSection />}
      {active === 'auditoria' && <AuditoriaSection />}
      {active === 'saude' && <SaudeSection />}

      <p className="text-center text-xs muted">
        Dados ilustrativos. As alterações valem para esta sessão do navegador — não há servidor
        de identidade nem persistência compartilhada nesta demonstração.
      </p>
    </div>
  )
}

// ─── Bloco animado padrão do projeto ────────────────────────────────────────
function Section({ children, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// =============================================================================
// CONTAS E PAPÉIS
// =============================================================================
const ROLE_OPTIONS = ['user', 'analyst', 'admin']
const PLAN_OPTIONS = ['explorar', 'profissional', 'institucional']
const STATUS_OPTIONS = ['ativo', 'inativo', 'suspenso']

function ContasSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.users(), [])
  const myEmail = useAuthStore((s) => s.user?.email)

  // A lista chega do serviço e passa a viver localmente: as ações de governança
  // precisam sobreviver entre renders, e um refetch as descartaria.
  const [accounts, setAccounts] = useState([])
  useEffect(() => { if (data?.items) setAccounts(data.items) }, [data])

  const [q, setQ] = useState('')
  const [role, setRole] = useState('todos')
  const [plan, setPlan] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind, account }
  const newAccountSeq = useRef(0)

  useEffect(() => { setPage(1) }, [q, role, plan, status])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return accounts.filter((a) => {
      const matchQ = !needle || `${a.name} ${a.email} ${a.unit || ''}`.toLowerCase().includes(needle)
      return matchQ
        && (role === 'todos' || a.role === role)
        && (plan === 'todos' || a.plan === plan)
        && (status === 'todos' || a.status === status)
    })
  }, [accounts, q, role, plan, status])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const hasFilters = q !== '' || role !== 'todos' || plan !== 'todos' || status !== 'todos'

  const patchAccount = (id, patch, message) => {
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    toast.success(message)
  }

  const runConfirm = () => {
    if (!confirm) return
    const { kind, account } = confirm
    if (kind === 'remover') {
      setAccounts((list) => list.filter((a) => a.id !== account.id))
      toast.success(`Conta de ${account.name} removida.`)
    } else if (kind === 'suspender') {
      patchAccount(account.id, { status: 'suspenso' }, `${account.name} foi suspenso(a).`)
    } else {
      patchAccount(account.id, { status: 'ativo' }, `${account.name} foi reativado(a).`)
    }
    setConfirm(null)
  }

  const exportar = () => {
    if (!filtered.length) {
      toast.error('Nenhuma conta corresponde aos filtros — nada a exportar.')
      return
    }
    exportCSV(
      filtered.map((a) => ({
        Nome: a.name,
        'E-mail': a.email,
        Unidade: a.unit || '—',
        Papel: ROLES[a.role]?.label || a.role,
        Plano: PLAN_LABELS[a.plan] || a.plan,
        Situação: USER_STATUS[a.status]?.label || a.status,
        'Último acesso': a.lastAccess ? formatDateTimeBR(a.lastAccess) : '—',
      })),
      'defesabr-contas.csv'
    )
    toast.success(`${filtered.length} conta(s) exportada(s) em CSV.`)
  }

  const criarConta = (form) => {
    newAccountSeq.current += 1
    const novo = {
      id: `convite-${newAccountSeq.current}`,
      name: form.name,
      email: form.email,
      role: form.role,
      plan: form.plan,
      status: 'inativo', // convite pendente de primeiro acesso
      unit: 'Convite pendente',
      lastAccess: null,
    }
    setAccounts((list) => [novo, ...list])
    setInviteOpen(false)
    toast.success(`Convite registrado para ${form.email}.`)
  }

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Contas da plataforma</h2>
            <p className="text-sm muted">{filtered.length} de {accounts.length} conta(s) no filtro atual.</p>
          </div>
          <Can do="admin.users">
            <div className="flex flex-wrap gap-2">
              <button onClick={exportar} className="btn-ghost">
                <Download size={15} /> Exportar CSV
              </button>
              <button onClick={() => setInviteOpen(true)} className="btn-primary">
                <UserPlus size={15} /> Convidar conta
              </button>
            </div>
          </Can>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, e-mail ou unidade…"
              aria-label="Buscar contas por nome, e-mail ou unidade"
              className="input pl-9"
            />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por papel" className="input">
            <option value="todos">Todos os papéis</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
          </select>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filtrar por plano" className="input">
            <option value="todos">Todos os planos</option>
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por situação" className="input">
            <option value="todos">Todas as situações</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{USER_STATUS[s].label}</option>)}
          </select>
        </div>

        <div className="mt-4">
          <DataState
            loading={loading}
            error={error}
            empty={!rows.length}
            onRetry={refetch}
            skeleton={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
            errorTitle="Não foi possível carregar as contas"
            emptyProps={{
              tone: hasFilters ? 'filter' : 'neutral',
              title: hasFilters ? 'Nenhuma conta com esses filtros' : 'Nenhuma conta cadastrada',
              hint: hasFilters
                ? 'Combine menos critérios ou limpe os filtros para ver a base completa.'
                : 'Convide a primeira conta para começar a governar acessos.',
              action: hasFilters
                ? { label: 'Limpar filtros', onClick: () => { setQ(''); setRole('todos'); setPlan('todos'); setStatus('todos') } }
                : { label: 'Convidar conta', onClick: () => setInviteOpen(true), icon: UserPlus },
              compact: true,
            }}
          >
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                      <th className="py-2 pr-4 font-semibold">Conta</th>
                      <th className="py-2 pr-4 font-semibold">Unidade</th>
                      <th className="py-2 pr-4 font-semibold">Papel</th>
                      <th className="py-2 pr-4 font-semibold">Plano</th>
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
                        isSelf={!!myEmail && a.email === myEmail}
                        onRole={(value) => patchAccount(a.id, { role: value }, `${a.name} agora é ${ROLES[value].label}.`)}
                        onPlan={(value) => patchAccount(a.id, { plan: value }, `${a.name} passou ao plano ${PLAN_LABELS[value]}.`)}
                        onToggleStatus={() => setConfirm({ kind: a.status === 'suspenso' ? 'reativar' : 'suspender', account: a })}
                        onRemove={() => setConfirm({ kind: 'remover', account: a })}
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
      </Section>

      <Section>
        <DistributionCard accounts={accounts} />
      </Section>

      <InviteAccountModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreate={criarConta}
        existingEmails={accounts.map((a) => a.email.toLowerCase())}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        tone={confirm?.kind === 'reativar' ? 'default' : 'danger'}
        icon={confirm?.kind === 'remover' ? Trash2 : confirm?.kind === 'reativar' ? RotateCcw : Ban}
        title={
          confirm?.kind === 'remover' ? 'Remover conta'
            : confirm?.kind === 'reativar' ? 'Reativar conta'
              : 'Suspender conta'
        }
        description={
          confirm?.kind === 'remover'
            ? `A conta de ${confirm?.account?.name} sai da base e perde todo o acesso. Em produção, a trilha de auditoria guarda o registro da remoção.`
            : confirm?.kind === 'reativar'
              ? `${confirm?.account?.name} volta a acessar a plataforma com o papel e o plano atuais.`
              : `${confirm?.account?.name} deixa de acessar a plataforma até ser reativado(a). O histórico é preservado.`
        }
        confirmLabel={
          confirm?.kind === 'remover' ? 'Remover' : confirm?.kind === 'reativar' ? 'Reativar' : 'Suspender'
        }
      />
    </div>
  )
}

function AccountRow({ account, isSelf, onRole, onPlan, onToggleStatus, onRemove }) {
  const st = USER_STATUS[account.status] || USER_STATUS.inativo
  const suspenso = account.status === 'suspenso'
  // Trava de segurança: ninguém rebaixa nem remove a própria conta — seria a
  // forma mais rápida de deixar a plataforma sem administrador.
  const selfNote = 'Esta é a sua conta: alterar o próprio papel ou removê-la poderia deixar a plataforma sem governança.'

  return (
    <tr className="border-b border-gray-100 align-middle dark:border-white/[0.06]">
      <td className="py-2.5 pr-4">
        <span className="block font-medium">
          {account.name}
          {isSelf && <span className="ml-2 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-600 dark:text-gold-400">você</span>}
        </span>
        <span className="text-xs muted">{account.email}</span>
      </td>
      <td className="py-2.5 pr-4 text-xs muted">{account.unit || '—'}</td>
      <td className="py-2.5 pr-4">
        <Can
          do="admin.users"
          fallback={<span className="text-xs">{ROLES[account.role]?.label || account.role}</span>}
        >
          <select
            value={account.role}
            onChange={(e) => onRole(e.target.value)}
            disabled={isSelf}
            title={isSelf ? selfNote : undefined}
            aria-label={`Papel de ${account.name}`}
            className="input h-9 min-w-[130px] py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
          </select>
        </Can>
      </td>
      <td className="py-2.5 pr-4">
        <Can
          do="admin.users"
          fallback={<span className="text-xs">{PLAN_LABELS[account.plan] || account.plan}</span>}
        >
          <select
            value={account.plan}
            onChange={(e) => onPlan(e.target.value)}
            aria-label={`Plano de ${account.name}`}
            className="input h-9 min-w-[130px] py-1 text-xs"
          >
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </select>
        </Can>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
        </span>
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs muted">
        {account.lastAccess ? formatDateTimeBR(account.lastAccess) : 'nunca acessou'}
      </td>
      <td className="py-2.5">
        <Can do="admin.users" fallback={<span className="text-xs muted">somente leitura</span>}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleStatus}
              disabled={isSelf}
              title={isSelf ? selfNote : undefined}
              aria-label={suspenso ? `Reativar ${account.name}` : `Suspender ${account.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:enabled:hover:text-white"
            >
              {suspenso ? <RotateCcw size={15} /> : <Ban size={15} />}
            </button>
            <button
              onClick={onRemove}
              disabled={isSelf}
              title={isSelf ? selfNote : undefined}
              aria-label={`Remover ${account.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-red-500 transition-colors enabled:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </Can>
      </td>
    </tr>
  )
}

// Distribuição das contas — leitura rápida da composição da base.
function DistributionCard({ accounts }) {
  const byRole = ROLE_OPTIONS.map((r) => ({ id: r, label: ROLES[r].label, count: accounts.filter((a) => a.role === r).length }))
  const byPlan = PLAN_OPTIONS.map((p) => ({ id: p, label: PLAN_LABELS[p], count: accounts.filter((a) => a.plan === p).length }))
  const total = accounts.length || 1

  const Bar = ({ label, count }) => (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs muted">{count} · {Math.round((count / total) * 100)}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / total) * 100}%` }} />
      </div>
    </div>
  )

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-base font-bold tracking-tight">Distribuição da base</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide muted">Por papel</p>
          {byRole.map((r) => <Bar key={r.id} label={r.label} count={r.count} />)}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide muted">Por plano</p>
          {byPlan.map((p) => <Bar key={p.id} label={p.label} count={p.count} />)}
        </div>
      </div>
      <p className="mt-4 text-xs muted">
        Papel define o que a pessoa <strong>faz</strong>; plano define o quanto ela <strong>vê</strong>.
        Os dois eixos são independentes.
      </p>
    </div>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function InviteAccountModal({ open, onClose, onCreate, existingEmails }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'user', plan: 'explorar' })
  const [erro, setErro] = useState(null)

  // Cada abertura começa do zero — nada de reaproveitar rascunho antigo.
  useEffect(() => {
    if (open) { setForm({ name: '', email: '', role: 'user', plan: 'explorar' }); setErro(null) }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (!form.name.trim()) return setErro('Informe o nome da pessoa.')
    if (!EMAIL_RE.test(email)) return setErro('Informe um e-mail válido (ex.: nome@organizacao.gov.br).')
    if (existingEmails.includes(email)) return setErro('Já existe uma conta com este e-mail.')
    onCreate({ ...form, name: form.name.trim(), email })
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar conta" maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm muted">
          O convite entra na base como <strong>inativo</strong> até o primeiro acesso. Papel e plano
          podem ser ajustados depois, a qualquer momento.
        </p>

        <div>
          <label htmlFor="convite-nome" className="mb-1 block text-sm font-medium">Nome completo</label>
          <input
            id="convite-nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Beatriz Nunes"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="convite-email" className="mb-1 block text-sm font-medium">E-mail institucional</label>
          <input
            id="convite-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="nome@organizacao.gov.br"
            className="input font-mono"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="convite-papel" className="mb-1 block text-sm font-medium">Papel</label>
            <select
              id="convite-papel"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="input"
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
            <p className="mt-1 text-xs muted">{ROLES[form.role].description}</p>
          </div>
          <div>
            <label htmlFor="convite-plano" className="mb-1 block text-sm font-medium">Plano</label>
            <select
              id="convite-plano"
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="input"
            >
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
            </select>
            <p className="mt-1 text-xs muted">Define a profundidade de leitura disponível.</p>
          </div>
        </div>

        {erro && <p role="alert" className="text-sm font-medium text-red-500 dark:text-red-400">{erro}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost justify-center">Cancelar</button>
          <button type="submit" className="btn-primary justify-center"><UserPlus size={15} /> Registrar convite</button>
        </div>
      </form>
    </Modal>
  )
}

// =============================================================================
// FONTES E COLETA
// =============================================================================
function FontesSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.sources(), [])
  const [sources, setSources] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [testing, setTesting] = useState(null)
  const [checks, setChecks] = useState({})
  const [confirm, setConfirm] = useState(null)
  const timer = useRef(null)

  // `collecting` é a intenção de coleta configurada aqui; `status` continua
  // sendo o estado real do conector no catálogo.
  useEffect(() => {
    if (data?.items) setSources(data.items.map((s) => ({ ...s, collecting: s.status === 'ativa' })))
  }, [data])

  useEffect(() => () => clearTimeout(timer.current), [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return sources.filter((s) => {
      const matchQ = !needle || `${s.name} ${s.domain} ${s.type}`.toLowerCase().includes(needle)
      return matchQ
        && (statusFilter === 'todos' || s.status === statusFilter)
        && (categoryFilter === 'todas' || s.category === categoryFilter)
    })
  }, [sources, q, statusFilter, categoryFilter])

  const groups = SOURCE_CATEGORIES
    .map((cat) => ({ ...cat, items: filtered.filter((s) => s.category === cat.id) }))
    .filter((g) => g.items.length)

  const toggleCollecting = (s) => {
    setSources((list) => list.map((x) => (x.id === s.id ? { ...x, collecting: !x.collecting } : x)))
    toast.success(s.collecting ? `Coleta de ${s.name} pausada.` : `Coleta de ${s.name} marcada como ativa.`)
  }

  const testar = (s) => {
    setTesting(s.id)
    // Resultado ESTÁVEL derivado do id: a mesma fonte devolve sempre o mesmo
    // diagnóstico, como um teste real devolveria enquanto nada mudasse.
    const h = hashId(s.id)
    const ok = h % 5 !== 0
    const latency = 120 + (h % 380)
    timer.current = setTimeout(() => {
      setChecks((c) => ({ ...c, [s.id]: { ok, latency } }))
      setTesting(null)
      if (ok) toast.success(`${s.name}: alcançável, ~${latency} ms (verificação simulada).`)
      else toast.error(`${s.name}: sem resposta — bloqueio de CORS ou limite do proxy.`)
    }, 900)
  }

  const remover = () => {
    if (!confirm) return
    setSources((list) => list.filter((x) => x.id !== confirm.id))
    toast.success(`${confirm.name} saiu do catálogo de coleta.`)
    setConfirm(null)
  }

  const hasFilters = q !== '' || statusFilter !== 'todos' || categoryFilter !== 'todas'
  const ativas = sources.filter((s) => s.collecting).length

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Catálogo de fontes</h2>
            <p className="text-sm muted">
              {sources.length} fonte(s) cadastrada(s) · {ativas} com coleta marcada como ativa.
            </p>
          </div>
          <button onClick={refetch} className="btn-ghost"><RefreshCw size={15} /> Recarregar catálogo</button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, domínio ou tipo…"
              aria-label="Buscar fontes por nome, domínio ou tipo"
              className="input pl-9"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filtrar fontes por categoria" className="input">
            <option value="todas">Todas as categorias</option>
            {SOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar fontes por status" className="input">
            <option value="todos">Todos os status</option>
            {Object.entries(SOURCE_STATUS).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}
          </select>
        </div>

        <div className="mt-4">
          <DataState
            loading={loading}
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
                ? 'Amplie a busca ou volte a todas as categorias e status.'
                : 'Sem fontes cadastradas não há o que coletar nem o que classificar.',
              action: hasFilters
                ? { label: 'Limpar filtros', onClick: () => { setQ(''); setStatusFilter('todos'); setCategoryFilter('todas') } }
                : undefined,
            }}
          >
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
                    {group.label} <span className="font-mono">({group.items.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((s) => (
                      <SourceRow
                        key={s.id}
                        source={s}
                        check={checks[s.id]}
                        testing={testing === s.id}
                        busy={testing !== null}
                        onToggle={() => toggleCollecting(s)}
                        onTest={() => testar(s)}
                        onRemove={() => setConfirm(s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </div>

        <p className="mt-5 text-xs muted">
          Honestidade sobre a coleta: um site estático não consegue buscar estes veículos
          diretamente (CORS e robots). Marcar uma fonte como ativa aqui registra a intenção de
          coleta — a execução real exige backend ou proxy implementando o conector.
        </p>
      </Section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remover}
        title="Remover fonte do catálogo"
        description={`${confirm?.name || ''} deixa de ser monitorada e sai dos filtros de classificação. O histórico já coletado é preservado.`}
        confirmLabel="Remover fonte"
      />
    </div>
  )
}

function SourceRow({ source, check, testing, busy, onToggle, onTest, onRemove }) {
  const st = SOURCE_STATUS[source.status] || SOURCE_STATUS.pendente

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {source.name}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
          </span>
          {source.collecting && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              coleta ativa
            </span>
          )}
        </p>
        <p className="truncate font-mono text-xs muted">{source.domain} · {source.type} · confiab. {source.reliability}</p>
        {check && (
          <p className={`mt-1 text-xs font-medium ${check.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {check.ok ? `Última verificação: alcançável (~${check.latency} ms).` : 'Última verificação: sem resposta pelo proxy.'}
          </p>
        )}
      </div>

      <Can do="admin.sources">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              source.collecting ? 'bg-brand-500/20 text-brand-600 dark:text-brand-300' : 'bg-gray-500/15 text-gray-500 dark:text-gray-400'
            }`}
            aria-label={source.collecting ? `Pausar coleta de ${source.name}` : `Ativar coleta de ${source.name}`}
          >
            {source.collecting ? <Pause size={13} /> : <Play size={13} />}
            {source.collecting ? 'Pausar' : 'Ativar'}
          </button>
          <button
            onClick={onTest}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors enabled:hover:text-gray-900 disabled:opacity-40 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:text-white"
            aria-label={`Testar conexão com ${source.name}`}
          >
            <RefreshCw size={13} className={testing ? 'animate-spin' : undefined} />
            {testing ? 'Testando…' : 'Testar conexão'}
          </button>
          <button
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-500/10"
            aria-label={`Remover ${source.name} do catálogo`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Can>
    </div>
  )
}

// =============================================================================
// INTEGRAÇÕES
// =============================================================================
function IntegracoesSection() {
  const [items, setItems] = useState(() => integrationCatalog.map((i) => ({ ...i, lastCheck: null })))
  const [checking, setChecking] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const reconectar = (integration) => {
    setChecking(integration.id)
    const h = hashId(integration.id)
    // Integração ainda não implantada nunca "reconecta": dizer o contrário
    // seria inventar um sucesso que não existe.
    const outcome = integration.status === 'planned'
      ? { ok: false, message: 'Integração ainda não implantada — depende de backend/proxy.' }
      : h % 4 === 0
        ? { ok: false, message: 'Handshake recusado pelo provedor (verificação simulada).' }
        : { ok: true, message: `Credencial válida, resposta em ~${140 + (h % 260)} ms.` }

    timer.current = setTimeout(() => {
      setItems((list) => list.map((x) => (
        x.id === integration.id ? { ...x, lastCheck: { ...outcome, at: new Date().toISOString() } } : x
      )))
      setChecking(null)
      if (outcome.ok) toast.success(`${integration.name}: ${outcome.message}`)
      else toast.error(`${integration.name}: ${outcome.message}`)
    }, 900)
  }

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Link2 size={17} className="text-brand-400" /> Integrações externas
        </h2>
        <p className="mb-4 text-sm muted">
          Cada integração é um contrato com um provedor: tipo, estado e a observação que explica
          o que falta para ela ficar de pé.
        </p>

        <div className="space-y-2">
          {items.map((i) => {
            const st = HEALTH_STATUS[i.status] || HEALTH_STATUS.planned
            return (
              <div key={i.id} className="flex flex-col gap-3 rounded-lg bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {i.name}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide muted">{i.kind}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                  </p>
                  <p className="text-xs muted">{i.note}</p>
                  {i.lastCheck && (
                    <p className={`mt-1 text-xs font-medium ${i.lastCheck.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {formatDateTimeBR(i.lastCheck.at)} · {i.lastCheck.message}
                    </p>
                  )}
                </div>
                <Can do="admin.integrations">
                  <button
                    onClick={() => reconectar(i)}
                    disabled={checking !== null}
                    className="btn-ghost shrink-0 disabled:opacity-40"
                    aria-label={`Reconectar ${i.name}`}
                  >
                    <RefreshCw size={15} className={checking === i.id ? 'animate-spin' : undefined} />
                    {checking === i.id ? 'Verificando…' : 'Reconectar'}
                  </button>
                </Can>
              </div>
            )
          })}
        </div>
      </Section>

      <Section className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
          <ShieldCheck size={17} className="text-brand-400" /> Onde ficam as chaves
        </h2>
        <p className="text-sm leading-relaxed muted">
          Nenhuma credencial de provedor deve viver no front-end: tudo que o navegador carrega é
          legível por quem abre o inspetor. O caminho correto é o servidor guardar a chave e expor
          um endpoint autenticado — o front chama o seu backend, nunca o provedor diretamente.
          A chave de IA que existe em Configurações é um recurso de demonstração local, válido
          apenas neste navegador e nunca em produção.
        </p>
      </Section>
    </div>
  )
}

// =============================================================================
// AUDITORIA
// =============================================================================
function AuditoriaSection() {
  const { data, loading, error, refetch } = useResource(() => adminService.audit(), [])
  const events = data?.items || []

  const [level, setLevel] = useState('todos')
  const [actor, setActor] = useState('todos')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [level, actor, q])

  const actors = useMemo(() => [...new Set(events.map((e) => e.actor))].sort(), [events])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      const matchQ = !needle || `${e.action} ${e.target} ${e.actor}`.toLowerCase().includes(needle)
      return matchQ && (level === 'todos' || e.level === level) && (actor === 'todos' || e.actor === actor)
    })
  }, [events, level, actor, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const hasFilters = level !== 'todos' || actor !== 'todos' || q !== ''

  const exportar = () => {
    if (!filtered.length) {
      toast.error('Nenhum evento corresponde aos filtros — nada a exportar.')
      return
    }
    exportCSV(
      filtered.map((e) => ({
        Quando: formatDateTimeBR(e.time),
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
          <p className="text-sm muted">Quem fez o quê, quando e sobre qual objeto — {filtered.length} evento(s) no filtro.</p>
        </div>
        <Can do="admin.logs">
          <button onClick={exportar} className="btn-ghost"><Download size={15} /> Exportar CSV</button>
        </Can>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ação, alvo ou ator…"
            aria-label="Buscar eventos de auditoria"
            className="input pl-9"
          />
        </div>
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filtrar por nível do evento" className="input">
          <option value="todos">Todos os níveis</option>
          {Object.entries(AUDIT_LEVEL).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Filtrar por ator" className="input">
          <option value="todos">Todos os atores</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
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
              ? 'Troque o nível, o ator ou limpe a busca para ver a trilha completa.'
              : 'Nenhuma ação de governança foi registrada até agora.',
            action: hasFilters
              ? { label: 'Limpar filtros', onClick: () => { setLevel('todos'); setActor('todos'); setQ('') } }
              : undefined,
          }}
        >
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th className="py-2 pr-4 font-semibold">Quando</th>
                    <th className="py-2 pr-4 font-semibold">Ator</th>
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
                        <td className="py-2.5 pr-4 text-xs">{ev.actor}</td>
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
  const d = diag.data

  const limparDadosLocais = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('defesabr-'))
    keys.forEach((k) => localStorage.removeItem(k))
    toast.success(`${keys.length} chave(s) removida(s). Recarregando…`)
    // Recarrega para que os stores voltem aos valores iniciais.
    setTimeout(() => window.location.reload(), 700)
  }

  return (
    <div className="space-y-4">
      <Section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Server size={17} className="text-brand-400" /> Saúde dos serviços
          </h2>
          {health.data && (
            <span className="text-sm muted">
              <strong className="font-mono">{health.data.operational}</strong> de {health.data.total} operacionais
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
          emptyProps={{ compact: true, title: 'Nenhum serviço monitorado', hint: 'Registre serviços para acompanhar disponibilidade e latência.' }}
        >
          <div className="space-y-2">
            {services.map((s) => {
              const st = HEALTH_STATUS[s.status] || HEALTH_STATUS.planned
              return (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs muted">{s.note}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs muted">uptime {s.uptime} · {s.latency}</span>
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
          <TerminalSquare size={17} className="text-brand-400" /> Diagnóstico da instalação
        </h2>

        <DataState
          loading={diag.loading}
          error={diag.error}
          empty={!d}
          onRetry={diag.refetch}
          skeleton={<div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
          errorTitle="Não foi possível montar o diagnóstico"
          emptyProps={{ compact: true, title: 'Diagnóstico indisponível', hint: 'A camada de dados não respondeu à consulta de diagnóstico.' }}
        >
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Fact label="Modo de dados" value={d?.mode === 'api' ? 'API real' : 'Demonstração (mock)'} />
              <Fact label="URL da API" value={d?.apiBaseUrl || 'não configurada'} />
              <Fact label="Versão" value={d?.version || '—'} />
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
                Endpoints registrados <span className="font-mono">({d?.endpoints?.length || 0})</span>
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg bg-white/5 p-3">
                <ul className="space-y-1 font-mono text-xs muted">
                  {(d?.endpoints || []).map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
              <p className="mt-2 text-xs muted">
                São os mesmos caminhos que o backend real precisará servir — trocar de origem é
                mudar duas variáveis de ambiente, não reescrever a interface.
              </p>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide muted">
                <HardDrive size={13} /> Armazenamento local <span className="font-mono">({d?.storage?.length || 0})</span>
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

            <Can do="admin.health">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Limpar dados locais</p>
                  <p className="text-xs muted">
                    Apaga as chaves <span className="font-mono">defesabr-*</span> deste navegador (sessão,
                    preferências, pasta salva) e recarrega a aplicação do zero.
                  </p>
                </div>
                <button onClick={() => setConfirmClear(true)} className="btn-ghost shrink-0 text-red-500 dark:text-red-400">
                  <Eraser size={15} /> Limpar dados locais
                </button>
              </div>
            </Can>
          </div>
        </DataState>
      </Section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={limparDadosLocais}
        icon={Eraser}
        title="Limpar dados locais"
        description="Sessão, preferências e conteúdos salvos deste navegador serão apagados e a aplicação recarregará como um primeiro acesso. Nada em outros dispositivos é afetado."
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

// Hash estável de um id — base dos resultados simulados. Determinístico de
// propósito: `Math.random()` daria diagnósticos diferentes a cada render.
function hashId(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 100000
  return h
}
