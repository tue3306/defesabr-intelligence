import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Users, Database, PlugZap, ScrollText, SlidersHorizontal,
  Search, ExternalLink, Server, Layers,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  systemHealth, HEALTH_STATUS, integrations, auditLog, AUDIT_LEVEL,
  platformUsers, platformPlans, contentCategories, ingestion,
} from '../data/adminData'
import { monitoredSources, SOURCE_STATUS } from '../data/monitoredSources'
import { PROFILES } from '../auth/permissions'
import { formatDateTimeBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// CONSOLE DE ADMINISTRAÇÃO (§9) — governança da plataforma.
// Estrutura preparada para implementação real: cada seção corresponde a um
// recurso que, com backend, vira um endpoint (usuários, fontes, integrações,
// logs, parâmetros). Hoje opera com dados demonstrativos, sem fingir escrita.
// -----------------------------------------------------------------------------

const TABS = [
  { id: 'usuarios', label: 'Usuários & Perfis', icon: Users },
  { id: 'fontes', label: 'Fontes & Coleta', icon: Database },
  { id: 'integracoes', label: 'Integrações & IA', icon: PlugZap },
  { id: 'logs', label: 'Logs & Auditoria', icon: ScrollText },
  { id: 'parametros', label: 'Parâmetros', icon: SlidersHorizontal },
]

export default function AdminConsole() {
  const [tab, setTab] = useState('usuarios')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
              <ShieldCheck size={22} />
            </span>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                Administração
                <InfoTooltip text="Área de governança: usuários, fontes, integrações, auditoria e parâmetros. Nesta demonstração as operações de escrita ficam desativadas — a estrutura está pronta para o backend." />
              </h1>
              <p className="text-sm muted">Governança da plataforma · acesso restrito ao Administrador.</p>
            </div>
          </div>
          <Badge type="demo" />
        </div>

        {/* Navegação por seções */}
        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-300 text-gray-500 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'usuarios' && <UsersSection />}
      {tab === 'fontes' && <SourcesSection />}
      {tab === 'integracoes' && <IntegrationsSection />}
      {tab === 'logs' && <LogsSection />}
      {tab === 'parametros' && <ParamsSection />}

      <p className="text-center text-xs muted">
        Operações de escrita (criar/editar/remover) serão habilitadas quando houver backend.
        Esta área demonstra a estrutura de governança, não um sistema de gestão ativo.
      </p>
    </div>
  )
}

// ── USUÁRIOS & PERFIS ────────────────────────────────────────────────────────
const ROLE_LABEL = { admin: 'Administrador', user: 'Usuário' }
const PLAN_LABEL = { explorar: 'Explorar', profissional: 'Profissional', institucional: 'Institucional' }

function UsersSection() {
  const [q, setQ] = useState('')
  const [planFilter, setPlanFilter] = useState('todos')

  const list = platformUsers.filter((u) => {
    const matchQ = `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())
    const matchPlan = planFilter === 'todos' || u.plan === planFilter
    return matchQ && matchPlan
  })

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              aria-label="Buscar usuários"
              className="input pl-9"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            aria-label="Filtrar por plano"
            className="input max-w-[200px]"
          >
            <option value="todos">Todos os planos</option>
            {platformPlans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th className="py-2 pr-4 font-semibold">Usuário</th>
                <th className="py-2 pr-4 font-semibold">Papel</th>
                <th className="py-2 pr-4 font-semibold">Plano</th>
                <th className="py-2 pr-4 font-semibold">Último acesso</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                  <td className="py-2.5 pr-4">
                    <span className="block font-medium">{u.name}</span>
                    <span className="text-xs muted">{u.email}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === 'admin' ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400' : 'bg-white/5 muted'}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs">{PLAN_LABEL[u.plan]}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs muted">{formatDateTimeBR(u.lastAccess)}</td>
                  <td className="py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="py-6 text-center text-sm muted">Nenhum usuário corresponde ao filtro.</p>
          )}
        </div>
      </div>

      {/* Matriz de permissões — deixa a autorização explícita e auditável */}
      <div className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Layers size={17} className="text-brand-400" /> Matriz de perfis
        </h2>
        <p className="mb-4 text-sm muted">Hierarquia de capacidades definida em <code className="font-mono text-xs">src/auth/permissions.js</code>.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {['free', 'pro', 'admin'].map((id) => (
            <div key={id} className="rounded-lg bg-white/5 p-4">
              <p className="text-sm font-bold tracking-tight">{PROFILES[id].label}</p>
              <p className="mt-0.5 text-xs muted">{PROFILES[id].tagline}</p>
              <p className="mt-2 font-mono text-2xl font-extrabold">
                {platformUsers.filter((u) => (id === 'admin' ? u.role === 'admin' : id === 'pro' ? u.role !== 'admin' && u.plan !== 'explorar' : u.role !== 'admin' && u.plan === 'explorar')).length}
              </p>
              <p className="text-[11px] muted">contas neste perfil</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── FONTES & COLETA ──────────────────────────────────────────────────────────
function SourcesSection() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Database size={17} className="text-brand-400" /> Fontes cadastradas ({monitoredSources.length})
          </h2>
          <Link to="/fontes" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
            Ver catálogo completo <ExternalLink size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th className="py-2 pr-4 font-semibold">Fonte</th>
                <th className="py-2 pr-4 font-semibold">Tipo</th>
                <th className="py-2 pr-4 font-semibold">País</th>
                <th className="py-2 pr-4 font-semibold">Confiab.</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {monitoredSources.map((s) => {
                const st = SOURCE_STATUS[s.status]
                return (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                    <td className="py-2.5 pr-4">
                      <span className="block font-medium">{s.name}</span>
                      <span className="font-mono text-xs muted">{s.domain}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs">{s.type}</td>
                    <td className="py-2.5 pr-4 text-xs">{s.country}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{s.reliability}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
          <Server size={17} className="text-brand-400" /> Pipeline de ingestão
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Coletas (24h)" value={ingestion.coletasUltimas24h} />
          <Stat label="Normalizados" value={ingestion.itensNormalizados} />
          <Stat label="Na fila" value={ingestion.fila} />
          <Stat label="Fontes ativas" value={ingestion.fontesAtivas} />
        </div>
        <p className="mt-3 text-xs muted">{ingestion.observacao}</p>
      </div>
    </div>
  )
}

// ── INTEGRAÇÕES & IA ─────────────────────────────────────────────────────────
function IntegrationsSection() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
          <PlugZap size={17} className="text-brand-400" /> Integrações
        </h2>
        <div className="space-y-2">
          {integrations.map((i) => {
            const st = HEALTH_STATUS[i.status] || HEALTH_STATUS.planned
            return (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{i.name}</p>
                  <p className="truncate text-xs muted">{i.kind} · {i.note}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>{st.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
          <Server size={17} className="text-brand-400" /> Saúde dos serviços
        </h2>
        <div className="space-y-2">
          {systemHealth.map((s) => {
            const st = HEALTH_STATUS[s.status]
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs muted">{s.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden font-mono text-xs muted sm:inline">{s.uptime} · {s.latency}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs muted">
          A chave da IA nunca fica no front-end. A configuração de provedor/segredo é feita em
          Configurações e, em produção, deve viver atrás de um backend/proxy.
        </p>
      </div>
    </div>
  )
}

// ── LOGS & AUDITORIA ─────────────────────────────────────────────────────────
function LogsSection() {
  const [level, setLevel] = useState('todos')
  const list = auditLog.filter((e) => level === 'todos' || e.level === level)

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <ScrollText size={17} className="text-brand-400" /> Trilha de auditoria
        </h2>
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filtrar por nível" className="input max-w-[180px]">
          <option value="todos">Todos os níveis</option>
          <option value="info">Info</option>
          <option value="warn">Alerta</option>
          <option value="error">Erro</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
              <th className="py-2 pr-4 font-semibold">Quando</th>
              <th className="py-2 pr-4 font-semibold">Ator</th>
              <th className="py-2 pr-4 font-semibold">Ação</th>
              <th className="py-2 font-semibold">Nível</th>
            </tr>
          </thead>
          <tbody>
            {list.map((ev) => {
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
        {list.length === 0 && <p className="py-6 text-center text-sm muted">Nenhum evento neste nível.</p>}
      </div>
    </div>
  )
}

// ── PARÂMETROS (planos e categorias) ─────────────────────────────────────────
function ParamsSection() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="mb-4 text-base font-bold tracking-tight">Planos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th className="py-2 pr-4 font-semibold">Plano</th>
                <th className="py-2 pr-4 font-semibold">Preço</th>
                <th className="py-2 pr-4 font-semibold">Assentos</th>
                <th className="py-2 pr-4 font-semibold">Inclui</th>
                <th className="py-2 font-semibold">Contas</th>
              </tr>
            </thead>
            <tbody>
              {platformPlans.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                  <td className="py-2.5 pr-4 font-medium">{p.label}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{p.price}</td>
                  <td className="py-2.5 pr-4 text-xs">{p.seats}</td>
                  <td className="py-2.5 pr-4 text-xs muted">{p.features}</td>
                  <td className="py-2.5 font-mono text-xs">{p.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 text-base font-bold tracking-tight">Categorias de conteúdo</h2>
        <p className="mb-4 text-sm muted">Usadas na classificação da ingestão e nos filtros da plataforma.</p>
        <div className="flex flex-wrap gap-2">
          {contentCategories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm">
              {c.label}
              <span className="font-mono text-xs muted">{c.items}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="font-mono text-xl font-extrabold">{value}</p>
      <p className="text-[11px] muted">{label}</p>
    </div>
  )
}
