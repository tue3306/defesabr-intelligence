import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  User, Shield, SlidersHorizontal, Camera, Check,
  LogOut, Sun, Moon, Star, Bell, KeySquare, Lock, Info,
} from 'lucide-react'
import { useAuthStore, ROLES } from '../store/authStore'
import { useProfileMeta, useCapabilities } from '../auth/useCan'
import { CAPABILITIES, PROFILES, PROFILE_ORDER, PLAN_LABELS } from '../auth/permissions'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTheme } from '../hooks/useTheme'
import { CATEGORIES } from '../data/mockData'
import { categoryColor } from '../utils/textUtils'
import ChaveDaIa from '../components/ia/ChaveDaIa'

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'permissoes', label: 'Permissões', icon: KeySquare },
  { id: 'preferencias', label: 'Preferências', icon: SlidersHorizontal },
]

// Ordem em que as camadas de capacidade são apresentadas — do básico ao
// privilegiado, para que a progressão do produto fique legível de cima a baixo.
const TIER_ORDER = ['Usuário', 'Profissional', 'Institucional', 'Analista', 'Administrador']

const TIER_HINT = {
  'Usuário': 'Leitura e acompanhamento — vem do papel de qualquer conta autenticada.',
  'Profissional': 'Profundidade analítica — vem do PLANO Profissional ou superior.',
  'Institucional': 'Escala de equipe e integração — vem do PLANO Institucional.',
  'Analista': 'Produção de inteligência — vem do PAPEL Analista.',
  'Administrador': 'Governança da plataforma — vem do PAPEL Administrador.',
}

export default function Account() {
  const [tab, setTab] = useState('perfil')
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/15 text-brand-300">
          {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <User size={22} />}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
          <p className="text-sm muted">{user?.username} · {ROLES[user?.role]?.label || user?.role}</p>
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
              tab === t.id ? 'border-gold-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <ProfileTab />}
      {tab === 'seguranca' && <SecurityTab />}
      {tab === 'permissoes' && <PermissionsTab />}
      {tab === 'preferencias' && <PreferencesTab />}

      <p className="text-center text-xs muted">Sem servidor de identidade: as alterações ficam neste navegador.</p>
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
    // A foto fica como dataURL no armazenamento deste navegador: nao ha
    // servico de arquivos, e inventar um endereco de CDN seria pior.
    reader.onload = () => { updateProfile({ avatar: reader.result }); toast.success('Foto atualizada') }
    reader.readAsDataURL(f)
  }

  // Persiste no navegador. Quando houver endpoint de perfil, esta chamada
  // passa a falar com ele — o formato do objeto ja e o mesmo.
  const save = () => { updateProfile({ name, email }); toast.success('Perfil salvo') }

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
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input" aria-label="Idioma">
              <option value="pt-BR">Português (BR)</option>

            </select>
          </div>
        </div>
        <button onClick={save} className="btn-primary mt-5"><Check size={16} /> Salvar alterações</button>
      </Card>
    </div>
  )
}

// ──────────────────────── SEGURANÇA ───────────────────────
//
// ESTA ABA ERA INTEIRAMENTE FICÇÃO, e num produto de segurança isso é pior do
// que em qualquer outro lugar. Ela mostrava:
//
//   • três "sessões ativas" — Windows em São Paulo, Android no Rio, macOS em
//     Brasília — com botão de encerrar. Nenhuma existia. A pessoa podia
//     "encerrar" um acesso que nunca houve e sair achando que tinha revogado
//     algo;
//   • quatro códigos de backup de 2FA escritos à mão, copiáveis para a área
//     de transferência, que não destravam nada;
//   • um formulário de troca de senha que não trocava senha nenhuma.
//
// Inventar informação de segurança é o defeito mais grave possível numa
// plataforma cujo argumento é não inventar dado. Quem lê "nenhum acesso
// suspeito" e acredita toma decisão com base nisso.
//
// O que ficou é o que a plataforma sabe de verdade sobre a sessão de quem
// está lendo — e a lista honesta do que ela ainda não faz.
function SecurityTab() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)

  // O token é um payload em base64url seguido da assinatura. Ler o payload no
  // cliente não é furo: ele não guarda segredo — só id, papel e vencimento —,
  // e o que impede forjá-lo é a assinatura, conferida no servidor.
  let expiraEm = null
  try {
    const corpo = token ? JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) : null
    expiraEm = corpo?.exp ? new Date(corpo.exp) : null
  } catch { /* token ilegível: a tela mostra ausência */ }

  const NAO_EXISTE = [
    ['Troca de senha', 'Exige um fluxo de reautenticação e um endpoint que ainda não existe.'],
    ['Recuperação por e-mail', 'Depende de envio de mensagem, que a plataforma não faz.'],
    ['Verificação em duas etapas', 'Exige servidor de identidade e segredo por conta.'],
    ['Lista de dispositivos conectados', 'O token é sem estado: o servidor não guarda sessão, então não há o que listar.'],
    ['Entrar com conta Google', 'Previsto. A coluna `auth_provider` já existe para receber isso.'],
  ]

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────
        * A CHAVE DO MODELO MORA AQUI, E NÃO EM CONFIGURAÇÕES
        *
        * Ela é credencial pessoal — do mesmo tipo que a senha, e do mesmo tipo
        * que a sessão descrita logo abaixo. Configurações é a tela que alguém
        * abre para mudar o tema, às vezes com outra pessoa olhando; não é lugar
        * de pedir um segredo que custa dinheiro a quem o cola.
        *
        * O valor nunca chega ao navegador: é gravado cifrado no servidor e a
        * API devolve só os quatro últimos caracteres. Ver o componente e
        * `server/src/lib/segredoGuardado.js`.
        * ───────────────────────────────────────────────────────────────── */}
      <Card
        title="Assistente por IA"
        desc="A sua chave do modelo. Fica cifrada no servidor e o navegador nunca a lê de volta."
      >
        <ChaveDaIa />
      </Card>

      <Card title="Esta sessão" desc="O que a plataforma sabe sobre o seu acesso agora.">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info2 termo="Usuário" valor={user?.username || '—'} />
          <Info2 termo="Papel" valor={ROLES[user?.role]?.label || user?.role || '—'} />
          <Info2 termo="Origem da identidade" valor={user?.authProvider === 'local' ? 'Senha local (scrypt)' : user?.authProvider || '—'} />
          <Info2
            termo="Sessão expira em"
            valor={expiraEm ? expiraEm.toLocaleString('pt-BR') : '—'}
          />
          <Info2 termo="Último acesso" valor={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : '—'} />
          <Info2 termo="Conta criada em" valor={user?.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '—'} />
        </dl>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-xs leading-relaxed">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
          <span className="text-gray-700 dark:text-gray-300">
            O papel acima não é decorativo: cada rota protegida o confere no servidor a cada
            requisição, e responde 401 sem sessão ou 403 com papel insuficiente. Alterá-lo no
            armazenamento do navegador muda o que a interface desenha e não abre nenhuma rota.
          </span>
        </p>

        <button onClick={logout} className="btn-ghost mt-4 text-sm">
          <LogOut size={15} /> Encerrar esta sessão
        </button>
      </Card>

      <Card title="O que ainda não existe" desc="Declarado em vez de simulado.">
        <ul className="space-y-2.5">
          {NAO_EXISTE.map(([titulo, porque]) => (
            <li key={titulo} className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <Lock size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-xs leading-relaxed muted">{porque}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Info2({ termo, valor }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <dt className="text-[10px] font-bold uppercase tracking-wider muted">{termo}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{valor}</dd>
    </div>
  )
}

// ─────────────────────── PREFERÊNCIAS ──────────────────────
// -----------------------------------------------------------------------------
// PERMISSÕES — transparência sobre o que este acesso realmente pode fazer.
//
// Em vez de descobrir um bloqueio ao esbarrar nele, a pessoa vê de antemão o
// mapa completo: o que já tem, o que falta e de qual eixo (papel ou plano)
// cada capacidade vem.
// -----------------------------------------------------------------------------
function PermissionsTab() {
  const user = useAuthStore((s) => s.user)
  const plan = useSubscriptionStore((s) => s.plan)
  const profileMeta = useProfileMeta()
  const active = useCapabilities()
  const activeSet = new Set(active)

  // Agrupa TODO o catálogo por camada, marcando o que este acesso possui.
  const groups = TIER_ORDER.map((tier) => {
    const items = Object.entries(CAPABILITIES)
      .filter(([, meta]) => meta.tier === tier)
      .map(([id, meta]) => ({ id, label: meta.label, granted: activeSet.has(id) }))
    return { tier, items, granted: items.filter((i) => i.granted).length }
  }).filter((g) => g.items.length > 0)

  const total = Object.keys(CAPABILITIES).length

  return (
    <div className="space-y-6">
      <Card
        title="Perfil efetivo"
        desc="O perfil nasce do cruzamento de dois eixos independentes: o PAPEL define o que você pode fazer; o PLANO define o quanto você pode ver."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-l-4 p-4" style={{ borderColor: profileMeta.color, background: `${profileMeta.color}12` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider muted">Perfil efetivo</p>
            <p className="mt-0.5 text-lg font-bold tracking-tight">{profileMeta.label}</p>
            <p className="text-xs muted">{profileMeta.tagline}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider muted">Papel</p>
            <p className="mt-0.5 text-lg font-bold tracking-tight">{ROLES[user?.role]?.label || 'Visitante'}</p>
            <p className="text-xs muted">{ROLES[user?.role]?.description || 'Sem sessão autenticada.'}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider muted">Plano</p>
            <p className="mt-0.5 text-lg font-bold tracking-tight">{PLAN_LABELS[plan] || plan}</p>
            <p className="text-xs muted">Define a profundidade analítica disponível.</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed muted">{profileMeta.description}</p>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${Math.round((active.length / total) * 100)}%`, background: profileMeta.color }}
            />
          </span>
          <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
            {active.length}/{total}
          </span>
        </div>
        <p className="mt-1 text-xs muted">capacidades ativas no catálogo da plataforma</p>
      </Card>

      <Card
        title="Capacidades por camada"
        desc="Cada linha é uma permissão concreta do produto. As marcadas você já possui; as demais indicam o caminho de evolução."
      >
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.tier}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                  {group.tier}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                    group.granted === group.items.length
                      ? 'bg-military-green/20 text-emerald-800 dark:text-emerald-300'
                      : group.granted === 0
                        ? 'bg-white/10 text-gray-500 dark:text-gray-400'
                        : 'bg-military-amber/20 text-amber-800 dark:text-amber-300'
                  }`}>
                    {group.granted}/{group.items.length}
                  </span>
                </h3>
              </div>
              <p className="mt-0.5 text-xs muted">{TIER_HINT[group.tier]}</p>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm ${
                      item.granted ? 'bg-white/5' : 'opacity-55'
                    }`}
                  >
                    {item.granted
                      ? <Check size={15} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      : <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />}
                    <span className="min-w-0">
                      <span className="block leading-snug">{item.label}</span>
                      <span className="block font-mono text-[10px] muted">{item.id}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      <Card
        title="Os perfis do modelo de permissão"
        desc="São arquétipos, não contas: descrevem o que cada papel alcança. A instalação nasce com duas contas — Usuário e Administrador —, e o papel Analista é herdado pelo Administrador."
      >
        <ul className="space-y-2">
          {PROFILE_ORDER.map((id) => {
            const profile = PROFILES[id]
            const current = profileMeta.id === id
            return (
              <li
                key={id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  current ? 'border-gold-500 bg-gold-500/5' : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: profile.color }} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold tracking-tight">
                    {profile.label}
                    {current && (
                      <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-600 dark:text-gold-400">
                        você está aqui
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed muted">{profile.description}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-500/10 p-3 text-xs leading-relaxed">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
          <span className="text-gray-700 dark:text-gray-300">
            O projeto é de código aberto e nasce com duas contas — uma de Administrador e uma de
            Usuário. Trocar entre elas pelo menu do topo faz um login de verdade, com a senha
            conferida no servidor; não é uma troca de perfil no navegador.
          </span>
        </p>
      </Card>
    </div>
  )
}

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
          <span className="flex items-center gap-2 text-sm"><Bell size={16} className="text-brand-400 dark:text-brand-300" /> Alertas de notícias críticas (no app)</span>
          <button
            onClick={toggleNotifications} role="switch" aria-checked={notificationsEnabled} aria-label="Alertas de notícias críticas no app"
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" aria-label={label} />
    </div>
  )
}
