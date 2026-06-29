import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import {
  User, Shield, CreditCard, SlidersHorizontal, Camera, Check, KeyRound,
  Smartphone, Monitor, LogOut, QrCode, Copy, FileDown, Sun, Moon, Star,
  BadgeCheck, ArrowUpRight, Bell,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTheme } from '../hooks/useTheme'
import { PLANS, PLAN_LABEL } from '../data/plansData'
import { CATEGORIES } from '../data/mockData'
import { categoryColor } from '../utils/textUtils'

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
  { id: 'preferencias', label: 'Preferências', icon: SlidersHorizontal },
]

export default function Account() {
  const [tab, setTab] = useState('perfil')
  const user = useAuthStore((s) => s.user)
  const plan = useSubscriptionStore((s) => s.plan)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/15 text-brand-300">
          {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <User size={22} />}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
          <p className="text-sm muted">{user?.name} · plano {PLAN_LABEL[plan] || plan}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? 'border-gold-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <ProfileTab />}
      {tab === 'seguranca' && <SecurityTab />}
      {tab === 'assinatura' && <SubscriptionTab />}
      {tab === 'preferencias' && <PreferencesTab />}

      <p className="text-center text-xs muted">Área demonstrativa — alterações ficam salvas apenas neste navegador.</p>
    </div>
  )
}

function Card({ title, desc, children }) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {desc && <p className="mt-0.5 text-sm muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ───────────────────────── PERFIL ─────────────────────────
function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const fileRef = useRef(null)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [lang, setLang] = useState('pt-BR')

  const onAvatar = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => { updateProfile({ avatar: reader.result }); toast.success('Foto atualizada') } // DEMO: dataURL no localStorage
    reader.readAsDataURL(f)
  }

  const save = () => { updateProfile({ name, email }); toast.success('Perfil salvo') } // DEMO // TODO: conectar backend real

  return (
    <div className="space-y-6">
      <Card title="Foto e identidade">
        <div className="flex flex-wrap items-center gap-4">
          <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-500/15 text-brand-300">
            {user?.avatar ? <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" /> : <User size={28} />}
          </span>
          <div>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">
              <Camera size={15} /> Trocar foto
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatar} className="sr-only" aria-label="Enviar foto de perfil" />
            <p className="mt-1.5 text-xs muted">PNG ou JPG, até ~2 MB.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" value={name} onChange={setName} />
          <Field label="E-mail" type="email" value={email} onChange={setEmail} />
          <div>
            <label className="mb-1 block text-xs font-medium muted">Idioma</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input">
              <option value="pt-BR">Português (BR)</option>
              <option value="en" disabled>English (em breve)</option>
            </select>
          </div>
        </div>
        <button onClick={save} className="btn-primary mt-5"><Check size={16} /> Salvar alterações</button>
      </Card>
    </div>
  )
}

// ──────────────────────── SEGURANÇA ───────────────────────
const SEED_SESSIONS = [
  { id: 's1', device: 'Windows · Chrome', where: 'São Paulo, BR', when: 'agora', current: true, icon: Monitor },
  { id: 's2', device: 'Android · App', where: 'Rio de Janeiro, BR', when: 'há 2 dias', icon: Smartphone },
  { id: 's3', device: 'macOS · Safari', where: 'Brasília, BR', when: 'há 6 dias', icon: Monitor },
]

function SecurityTab() {
  const [twoFA, setTwoFA] = useState(false)
  const [sessions, setSessions] = useState(SEED_SESSIONS)
  const backupCodes = ['8F2K-9QX1', '4D7M-2WZ8', 'A1C5-7YH3', 'KP90-3RT6'] // DEMO

  const changePassword = (e) => { e.preventDefault(); toast.success('Senha alterada (demonstração)') } // DEMO // TODO: backend
  const revoke = (id) => { setSessions((s) => s.filter((x) => x.id !== id)); toast.success('Sessão encerrada') }
  const revokeAll = () => { setSessions((s) => s.filter((x) => x.current)); toast.success('Outras sessões encerradas') }

  return (
    <div className="space-y-6">
      <Card title="Senha" desc="Use uma senha forte e única.">
        <form onSubmit={changePassword} className="grid grid-cols-1 gap-3 sm:max-w-md">
          <input type="password" className="input" placeholder="Senha atual" autoComplete="current-password" />
          <input type="password" className="input" placeholder="Nova senha" autoComplete="new-password" />
          <input type="password" className="input" placeholder="Confirmar nova senha" autoComplete="new-password" />
          <button type="submit" className="btn-primary w-fit"><KeyRound size={15} /> Alterar senha</button>
        </form>
      </Card>

      <Card title="Verificação em duas etapas (2FA)" desc="Camada extra de segurança no login.">
        <div className="flex items-center justify-between">
          <span className="text-sm">{twoFA ? 'Ativada' : 'Desativada'}</span>
          <button
            onClick={() => { setTwoFA((v) => !v); toast(twoFA ? '2FA desativada' : '2FA ativada (demonstração)') }}
            role="switch" aria-checked={twoFA}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${twoFA ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {twoFA && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 text-center dark:border-white/10">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-white/5">
                <QrCode size={64} />
              </div>
              <p className="mt-2 text-xs muted">Leia no app autenticador (demonstração).</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
              <p className="text-xs font-semibold uppercase muted">Códigos de backup</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <button onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); toast.success('Códigos copiados') }} className="btn-ghost mt-3 text-xs">
                <Copy size={13} /> Copiar
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Sessões ativas" desc="Dispositivos conectados à sua conta.">
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <span className="flex min-w-0 items-center gap-3">
                <s.icon size={18} className="shrink-0 text-brand-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {s.device} {s.current && <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">este dispositivo</span>}
                  </span>
                  <span className="text-xs muted">{s.where} · {s.when}</span>
                </span>
              </span>
              {!s.current && (
                <button onClick={() => revoke(s.id)} className="btn-ghost px-2.5 py-1 text-xs text-red-500 dark:text-red-400">Encerrar</button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <button onClick={revokeAll} className="btn-ghost mt-3 text-sm"><LogOut size={15} /> Encerrar todas as outras</button>
        )}
      </Card>
    </div>
  )
}

// ──────────────────────── ASSINATURA ──────────────────────
function SubscriptionTab() {
  const plan = useSubscriptionStore((s) => s.plan)
  const billing = useSubscriptionStore((s) => s.billing)
  const setPlan = useSubscriptionStore((s) => s.setPlan)
  const invoices = useSubscriptionStore((s) => s.invoices)
  const addInvoice = useSubscriptionStore((s) => s.addInvoice)
  const current = PLANS.find((p) => p.id === plan) || PLANS[0]

  // DEMO: faturas-semente quando há um plano pago e ainda não há histórico.
  const history = invoices.length
    ? invoices
    : plan !== 'explorar'
      ? [
          { id: 'INV-2026-06', date: '01/06/2026', amount: billing === 'anual' ? 'R$ 890,00' : 'R$ 89,00', status: 'Pago' },
          { id: 'INV-2026-05', date: '01/05/2026', amount: 'R$ 89,00', status: 'Pago' },
        ]
      : []

  const downloadInvoice = (inv) => {
    // DEMO: gera um PDF de fatura proceduralmente (jsPDF). // TODO: backend real
    const pdf = new jsPDF('p', 'mm', 'a4')
    pdf.setFillColor(28, 31, 36); pdf.rect(0, 0, 210, 26, 'F')
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16)
    pdf.text('DefesaBR Intelligence', 15, 14)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(202, 167, 51)
    pdf.text('Fatura (demonstrativa)', 15, 20)
    pdf.setTextColor(30, 30, 30); pdf.setFontSize(11)
    pdf.text(`Fatura: ${inv.id}`, 15, 40)
    pdf.text(`Data: ${inv.date}`, 15, 48)
    pdf.text(`Plano: ${current.name}`, 15, 56)
    pdf.text(`Valor: ${inv.amount}`, 15, 64)
    pdf.text(`Status: ${inv.status}`, 15, 72)
    pdf.setFontSize(8); pdf.setTextColor(140, 140, 140)
    pdf.text('Documento demonstrativo — nenhuma cobrança foi realizada.', 15, 285)
    pdf.save(`fatura-${inv.id}.pdf`)
    addInvoice(inv)
  }

  return (
    <div className="space-y-6">
      <Card title="Plano atual">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold">
              {current.name}
              {plan !== 'explorar' && <BadgeCheck size={18} className="text-emerald-500 dark:text-emerald-400" />}
            </p>
            <p className="text-sm muted">{current.tagline} · cobrança {billing}</p>
          </div>
          <Link to="/planos" className="btn-primary shrink-0"><ArrowUpRight size={16} /> {plan === 'explorar' ? 'Fazer upgrade' : 'Trocar plano'}</Link>
        </div>
        {plan !== 'explorar' && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
            <button onClick={() => { setPlan('explorar'); toast('Plano cancelado — você está no Explorar', { icon: '↧' }) }} className="btn-ghost text-sm">
              Cancelar assinatura
            </button>
            <button onClick={() => toast.success('Renovação automática mantida (demonstração)')} className="btn-ghost text-sm">
              Renovar
            </button>
          </div>
        )}
      </Card>

      <Card title="Forma de pagamento">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
          <span className="flex items-center gap-3 text-sm">
            <CreditCard size={18} className="text-brand-400" />
            <span className="font-mono">•••• •••• •••• 4242</span>
            <span className="muted">exp. 08/29</span>
          </span>
          <button onClick={() => toast('Atualização de cartão (demonstração)')} className="btn-ghost px-2.5 py-1 text-xs">Atualizar</button>
        </div>
      </Card>

      <Card title="Histórico de pagamentos">
        {history.length === 0 ? (
          <p className="text-sm muted">Nenhuma fatura ainda. Assine um plano para começar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                  <th className="py-2 pr-4">Fatura</th><th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Valor</th><th className="py-2 pr-4">Status</th><th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 dark:border-white/[0.05]">
                    <td className="py-2.5 pr-4 font-mono">{inv.id}</td>
                    <td className="py-2.5 pr-4">{inv.date}</td>
                    <td className="py-2.5 pr-4 font-semibold">{inv.amount}</td>
                    <td className="py-2.5 pr-4"><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">{inv.status}</span></td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => downloadInvoice(inv)} className="btn-ghost px-2.5 py-1 text-xs"><FileDown size={13} /> PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────── PREFERÊNCIAS ──────────────────────
function PreferencesTab() {
  const { isDark, toggleTheme } = useTheme()
  const interestAreas = useSettingsStore((s) => s.interestAreas)
  const toggleInterestArea = useSettingsStore((s) => s.toggleInterestArea)
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled)
  const toggleNotifications = useSettingsStore((s) => s.toggleNotifications)

  return (
    <div className="space-y-6">
      <Card title="Aparência">
        <div className="flex items-center justify-between">
          <span className="text-sm">Tema</span>
          <button onClick={toggleTheme} className="btn-ghost text-sm">
            {isDark ? <><Sun size={15} /> Claro</> : <><Moon size={15} /> Escuro</>}
          </button>
        </div>
      </Card>

      <Card title="Áreas de maior interesse" desc="Destacam o conteúdo mais relevante para você.">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const on = interestAreas.includes(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleInterestArea(cat)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  on ? 'border-transparent text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                style={on ? { background: categoryColor(cat) } : undefined}
              >
                {on ? <Check size={13} /> : <Star size={13} style={{ color: categoryColor(cat) }} />}
                {cat}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="Notificações" desc="Como você quer ser avisado.">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><Bell size={16} className="text-brand-400" /> Alertas de notícias críticas (no app)</span>
          <button
            onClick={toggleNotifications} role="switch" aria-checked={notificationsEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${notificationsEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
        <label className="mt-3 flex cursor-not-allowed items-center justify-between opacity-60">
          <span className="text-sm">Resumo semanal por e-mail</span>
          <span className="text-xs muted">requer backend</span>
        </label>
      </Card>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium muted">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  )
}
