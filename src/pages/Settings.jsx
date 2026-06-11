import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Rss, KeyRound, Bell, SlidersHorizontal, UserCog, Trash2, Plus, Circle, Eye, EyeOff,
  Palette, Star, Gauge, Stethoscope, Users, Sun, Moon, LogIn, ShieldCheck, CreditCard, BarChart3,
  Check, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore, PROFILES } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { useTheme } from '../hooks/useTheme'
import { FOCUS_AREAS, CATEGORIES } from '../data/mockData'
import { PLANS, SUBSCRIPTION_AREAS } from '../data/plansData'
import { isApiConfigured } from '../api/anthropic'
import { categoryColor } from '../utils/textUtils'
import { TensionEditor } from '../components/tension/TensionPanel'

function Section({ icon: Icon, title, badge, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400" /> {title}
        {badge && (
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-300">{badge}</span>
        )}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const s = useSettingsStore()
  const { user, isAuthenticated } = useAuthStore()
  const role = user?.role || 'visitante'

  const isAnalyst = role === 'analista' || role === 'admin'
  const isAdmin = role === 'admin'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm muted">
            Opções disponíveis conforme o seu perfil
            {isAuthenticated && <> — <span className="font-semibold text-brand-300">{PROFILES[role]?.label || role}</span></>}.
          </p>
        </div>
        {isAuthenticated && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-300">
            <ShieldCheck size={13} /> {PROFILES[role]?.label}
          </span>
        )}
      </div>

      {/* APARÊNCIA — todos */}
      <AppearanceSection />

      {/* VISITANTE não logado: convite */}
      {!isAuthenticated && (
        <Section icon={LogIn} title="Acesse para personalizar">
          <p className="text-sm muted">
            Entre na plataforma para configurar áreas de interesse, notificações e mais.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/planos" className="btn-primary">Ver planos</Link>
            <Link to="/" className="btn-ghost">Voltar ao início</Link>
          </div>
        </Section>
      )}

      {/* PLANO ATUAL — logados (Usuário Comum gerencia aqui) */}
      {isAuthenticated && <PlanSection />}

      {/* ÁREAS DE INTERESSE — logados */}
      {isAuthenticated && <InterestAreasSection />}

      {/* NOTIFICAÇÕES — logados */}
      {isAuthenticated && <NotificationsSection enabled={s.notificationsEnabled} onToggle={s.toggleNotifications} />}

      {/* ANALISTA: análise, fontes, tensão */}
      {isAnalyst && (
        <>
          <Section icon={SlidersHorizontal} title="Preferências de análise" badge="Analista">
            <div className="space-y-5">
              <div>
                <label className="mb-1 flex items-center justify-between text-sm font-medium">
                  Notícias por clipping <span className="font-mono text-brand-400">{s.newsPerClipping}</span>
                </label>
                <input type="range" min={3} max={10} value={s.newsPerClipping}
                  onChange={(e) => s.setNewsPerClipping(e.target.value)} className="w-full accent-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Foco padrão da análise</label>
                <select value={s.focusArea} onChange={(e) => s.setFocusArea(e.target.value)} className="input max-w-xs">
                  {FOCUS_AREAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          <Section icon={Gauge} title="Avaliação de nível de tensão" badge="Analista">
            <TensionEditor />
          </Section>

          <Section icon={Rss} title="Fontes monitoradas" badge="Analista">
            <SourcesEditor s={s} />
          </Section>
        </>
      )}

      {/* ADMIN: API key, usuários, diagnóstico */}
      {isAdmin && (
        <>
          <Section icon={KeyRound} title="Chave da API (Anthropic)" badge="Admin">
            <ApiKeyEditor s={s} />
          </Section>

          <Section icon={Users} title="Usuários" badge="Admin">
            <UsersTable />
          </Section>

          <Section icon={BarChart3} title="Analytics do site" badge="Admin">
            <Analytics />
          </Section>

          <Section icon={Stethoscope} title="Diagnóstico do sistema" badge="Admin">
            <Diagnostics />
          </Section>
        </>
      )}

      {/* PERFIL DEMO — sempre que logado (troca entre os 4 perfis) */}
      {isAuthenticated && <DemoProfileSection user={user} />}

      {/* dica de permissão */}
      {isAuthenticated && !isAnalyst && (
        <p className="text-center text-xs muted">
          Algumas opções (análise, fontes, tensão) aparecem apenas para Analista e Administrador.
          Use o seletor de perfil acima para visualizar.
        </p>
      )}
    </div>
  )
}

function AppearanceSection() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Section icon={Palette} title="Aparência e idioma">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Tema</span>
          <button onClick={toggleTheme} className="btn-ghost text-sm">
            {isDark ? <><Sun size={15} /> Claro</> : <><Moon size={15} /> Escuro</>}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Idioma</span>
          <select className="input max-w-[160px]" defaultValue="pt-BR">
            <option value="pt-BR">Português (BR)</option>
            <option value="en" disabled>English (em breve)</option>
          </select>
        </div>
      </div>
    </Section>
  )
}

// [ALTERADO] Plano atual + gerenciamento (Usuário Comum)
function PlanSection() {
  const plan = useSubscriptionStore((st) => st.plan)
  const area = useSubscriptionStore((st) => st.area)
  const current = PLANS.find((p) => p.id === plan) || PLANS[0]
  const areaLabel = SUBSCRIPTION_AREAS.find((a) => a.id === area)?.label

  return (
    <Section icon={CreditCard} title="Plano atual">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{current.name} <span className="text-sm font-normal muted">· {current.price} {current.period}</span></p>
          {plan === 'simples' && (
            <p className="mt-0.5 text-sm muted">
              Área escolhida: <span className="font-semibold text-brand-300">{areaLabel || '—'}</span>
              {' '}· demais áreas <span className="text-amber-300">disponíveis no Plano Completo</span>
            </p>
          )}
          {plan === 'completo' && <p className="mt-0.5 text-sm text-emerald-300">Todas as áreas liberadas.</p>}
          {plan === 'gratuito' && <p className="mt-0.5 text-sm muted">Apenas notícias públicas e mapa básico.</p>}
        </div>
        <Link to="/planos" className="btn-ghost shrink-0">Gerenciar plano</Link>
      </div>
    </Section>
  )
}

const ANALYTICS = [
  { label: 'Usuários ativos (30d)', value: '1.284', delta: '+12%' },
  { label: 'Visualizações de página', value: '48,7 mil', delta: '+8%' },
  { label: 'Assinantes pagos', value: '326', delta: '+5%' },
  { label: 'Taxa de conversão', value: '4,2%', delta: '+0,6 p.p.' },
]

function Analytics() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ANALYTICS.map((a) => (
        <div key={a.label} className="rounded-lg bg-white/5 p-3">
          <p className="text-xs muted">{a.label}</p>
          <p className="mt-1 text-2xl font-bold">{a.value}</p>
          <p className="text-xs font-semibold text-emerald-400">{a.delta}</p>
        </div>
      ))}
    </div>
  )
}

function InterestAreasSection() {
  const interestAreas = useSettingsStore((st) => st.interestAreas)
  const toggleInterestArea = useSettingsStore((st) => st.toggleInterestArea)
  return (
    <Section icon={Star} title="Áreas de maior interesse">
      <p className="mb-3 text-sm muted">Escolha os temas que mais te interessam para destacar no seu conteúdo.</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const on = interestAreas.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleInterestArea(cat)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                on ? 'border-transparent text-white' : 'border-gray-600/50 text-gray-400 hover:text-gray-200'
              }`}
              style={on ? { background: categoryColor(cat) } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : categoryColor(cat) }} />
              {cat}
            </button>
          )
        })}
      </div>
      {interestAreas.length > 0 && (
        <p className="mt-3 text-xs muted">{interestAreas.length} área(s) selecionada(s).</p>
      )}
    </Section>
  )
}

function NotificationsSection({ enabled, onToggle }) {
  return (
    <Section icon={Bell} title="Notificações">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm">Receber alertas de notícias críticas</span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-600'}`}
          role="switch"
          aria-checked={enabled}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </label>
    </Section>
  )
}

function SourcesEditor({ s }) {
  const [url, setUrl] = useState('')
  return (
    <>
      <div className="space-y-2">
        {s.rssSources.map((src) => (
          <div key={src.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Circle size={9} className={src.status === 'online' ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'} />
              <span className="font-medium">{src.name}</span>
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => s.toggleSource(src.id)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${src.enabled ? 'bg-brand-500/20 text-brand-300' : 'bg-gray-600/30 text-gray-400'}`}>
                {src.enabled ? 'Ativa' : 'Inativa'}
              </button>
              <button onClick={() => s.removeSource(src.id)} className="text-red-400 hover:text-red-300" aria-label="Remover fonte">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (url.trim()) { s.addSource(url.trim()); setUrl(''); toast.success('Fonte adicionada') } }}
        className="mt-3 flex gap-2"
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com/feed.rss" className="input" />
        <button type="submit" className="btn-ghost shrink-0"><Plus size={16} /> Adicionar</button>
      </form>
    </>
  )
}

function ApiKeyEditor({ s }) {
  const [showKey, setShowKey] = useState(false)
  return (
    <>
      <p className="mb-3 text-sm muted">
        Opcional. Sobrescreve a variável de ambiente apenas neste navegador.{' '}
        {isApiConfigured() ? <span className="text-emerald-400">● IA configurada</span> : <span className="text-yellow-400">● modo demonstração</span>}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={showKey ? 'text' : 'password'} value={s.apiKeyOverride}
            onChange={(e) => s.setApiKeyOverride(e.target.value)} placeholder="sk-ant-..." className="input pr-10 font-mono" />
          <button type="button" onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" aria-label="Mostrar/ocultar chave">
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button onClick={() => { s.setApiKeyOverride(''); toast.success('Chave removida') }} className="btn-ghost shrink-0">Limpar</button>
      </div>
      <p className="mt-2 text-xs text-yellow-400/80">⚠️ Em produção, não exponha a chave no front-end. Use um backend/proxy.</p>
    </>
  )
}

const MOCK_USERS = [
  { name: 'Administrador', email: 'admin@defesabr.com', role: 'Administrador', status: 'ativo' },
  { name: 'Ana Lima', email: 'ana@defesabr.com', role: 'Analista', status: 'ativo' },
  { name: 'João Souza', email: 'joao@exemplo.com', role: 'Assinante Gratuito', status: 'ativo' },
  { name: 'Marina Reis', email: 'marina@exemplo.com', role: 'Assinante Gratuito', status: 'inativo' },
]

function UsersTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">E-mail</th>
            <th className="py-2 pr-4">Perfil</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_USERS.map((u) => (
            <tr key={u.email} className="border-b border-gray-700/30">
              <td className="py-2 pr-4 font-medium">{u.name}</td>
              <td className="py-2 pr-4 muted">{u.email}</td>
              <td className="py-2 pr-4">{u.role}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-600/30 text-gray-400'}`}>
                  {u.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs muted">Gestão de usuários (demonstração).</p>
    </div>
  )
}

function Diagnostics() {
  const sources = useSettingsStore((st) => st.rssSources)
  const online = sources.filter((x) => x.enabled && x.status === 'online').length
  const total = sources.filter((x) => x.enabled).length
  const ai = isApiConfigured()
  const items = [
    { name: 'Claude API', ok: ai, note: ai ? 'configurada' : 'modo demo' },
    { name: 'Fontes RSS', ok: online === total, note: `${online}/${total} online` },
    { name: 'AwesomeAPI (câmbio)', ok: true, note: 'ok' },
    { name: 'World Bank', ok: true, note: 'ok' },
    { name: 'Build', ok: true, note: 'v1.0.0' },
  ]
  return (
    <ul className="space-y-2 text-sm">
      {items.map((a) => (
        <li key={a.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-gray-300">{a.name}</span>
          <span className="flex items-center gap-1.5 text-xs muted">
            <span className={`h-2 w-2 rounded-full ${a.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} /> {a.note}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DemoProfileSection({ user }) {
  const loginAsDemo = useAuthStore((st) => st.loginAsDemo)
  const logout = useAuthStore((st) => st.logout)
  const caps = PROFILES[user?.role]?.capabilities || []
  return (
    <Section icon={UserCog} title="Perfil (modo demo)">
      {/* O que o perfil atual pode/não pode fazer */}
      {caps.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-700/40 bg-white/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
            Seu acesso como {PROFILES[user?.role]?.label}
          </p>
          <ul className="space-y-1.5">
            {caps.map((c) => (
              <li key={c.text} className="flex items-start gap-2 text-sm">
                {c.ok
                  ? <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  : <Lock size={14} className="mt-0.5 shrink-0 text-gray-500" />}
                <span className={c.ok ? 'text-gray-200' : 'muted'}>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mb-3 text-sm">
        Conectado como <strong>{user?.name}</strong> — alterne para ver como cada perfil enxerga o site:
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.keys(PROFILES).map((r) => {
          const p = PROFILES[r]
          const active = user?.role === r
          return (
            <button
              key={r}
              onClick={() => {
                // [ALTERADO] Visitante = sair (experiência pública)
                if (r === 'visitante') { logout(); toast('Modo visitante (deslogado)', { icon: '👋' }) }
                else { loginAsDemo(r); toast.success(`Perfil: ${p.label}`) }
              }}
              className={`rounded-lg border p-3 text-left transition-colors ${active ? 'border-brand-500 bg-brand-500/10' : 'border-gray-600/50 hover:border-brand-500/40'}`}
            >
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-0.5 text-xs muted">{p.description}</p>
            </button>
          )
        })}
      </div>
    </Section>
  )
}
