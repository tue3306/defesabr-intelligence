import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Menu, Bell, Moon, Sun, LogIn, LogOut, User, PanelLeftClose, PanelLeft,
  UserCog, Settings as SettingsIcon, Check, ShieldCheck, ClipboardList, Search,
  Repeat, ArrowRight,
} from 'lucide-react'
import SearchBar from '../ui/SearchBar'
import Badge from '../ui/Badge'
import AuthModal from '../auth/AuthModal'
import { useAuthStore } from '../../store/authStore'
import { useContasDemo, ROTULO_PAPEL } from '../../auth/useContasDemo'
import { useNewsStore } from '../../store/newsStore'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useCan, useProfileMeta } from '../../auth/useCan'
import { PLAN_LABELS } from '../../auth/permissions'
import { useTheme } from '../../hooks/useTheme'
import { timeAgo } from '../../utils/dateUtils'

// Ordem de exibição do seletor de perfil (demonstração): dos 4 perfis do produto.
const PERSONA_ORDER = ['visitante', 'usuario', 'analista', 'admin']

// Para onde cada perfil é levado ao trocar — a "casa" daquele perfil.
const PERSONA_HOME = {
  visitante: '/',
  usuario: '/painel',
  analista: '/painel',
  admin: '/admin',
}

export default function Navbar({ onToggleMobile, onToggleCollapse, collapsed }) {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { contas, entrarComo } = useContasDemo()
  const plan = useSubscriptionStore((s) => s.plan)
  const can = useCan()
  const profileMeta = useProfileMeta()
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const markAllRead = useNewsStore((s) => s.markAllRead)
  const markRead = useNewsStore((s) => s.markRead)

  const [authAberto, setAuthAberto] = useState(false)
  const [authAba, setAuthAba] = useState('entrar')
  const abrirAuth = (aba) => { setAuthAba(aba); setAuthAberto(true) }
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef()
  const userRef = useRef()

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setNotifOpen(false); setUserOpen(false) }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Trocar de perfil passa a ser um LOGIN de verdade: a conta de exemplo do
  // papel escolhido, autenticada no servidor. Antes isto escrevia
  // `{ role: 'admin' }` no localStorage e nada verificava.
  const trocarPerfil = async (papel) => {
    setUserOpen(false)
    const r = await entrarComo(papel)
    if (r?.ok) navigate('/painel')
  }

  const initials = (user?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-military-darker/80">
      <button
        onClick={onToggleMobile}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden"
        aria-label="Abrir menu de navegação"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 lg:inline-flex"
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
      </button>

      <div className="hidden max-w-md flex-1 sm:block">
        <SearchBar
          placeholder="Buscar em todos os módulos (Ctrl + K para comandos)…"
          onSearch={(q) => navigate(q ? `/busca?q=${encodeURIComponent(q)}` : '/busca')}
        />
      </div>

      {/* Busca compacta no mobile: leva à paleta de comandos */}
      <button
        onClick={() => window.dispatchEvent(new Event('defesabr:open-palette'))}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 sm:hidden"
        aria-label="Abrir busca e comandos"
      >
        <Search size={20} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Atalho de produção — só para quem produz */}
        {can('workbench.access') && (
          <Link
            to="/mesa"
            className="hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 md:inline-flex"
            aria-label="Mesa de trabalho do analista"
            title="Mesa de trabalho"
          >
            <ClipboardList size={20} />
          </Link>
        )}

        {/* Notificações (somente para usuários autenticados) */}
        {isAuthenticated && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell size={20} className={unread > 0 ? 'animate-wiggle' : ''} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-military-red opacity-60" />
                  <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-military-red px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="card fixed left-3 right-3 top-[4.25rem] z-50 animate-scale-in overflow-hidden p-0 shadow-dropdown sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-700/40">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    Notificações
                    {unread > 0 && (
                      <span className="rounded-full bg-military-red/20 px-1.5 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300">
                        {unread} nova{unread > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs font-medium text-brand-500 hover:text-brand-400 dark:text-brand-400">
                      Marcar lidas
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3 py-10 text-center">
                    <Bell size={28} className="mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                    <p className="text-sm muted">Nenhuma notificação por enquanto</p>
                  </div>
                ) : (
                  <>
                    <ul className="max-h-[60vh] overflow-y-auto sm:max-h-80">
                      {notifications.slice(0, 8).map((n) => (
                        <li key={n.id}>
                          <button
                            onClick={() => markRead(n.id)}
                            className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${
                              n.read ? 'opacity-55' : ''
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              <Badge type="urgency" value={n.level} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-800 dark:text-gray-200">{n.title}</span>
                              <span className="text-xs muted">{timeAgo(n.time)}</span>
                            </span>
                            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/notificacoes"
                      onClick={() => setNotifOpen(false)}
                      className="block border-t border-gray-200 px-3 py-2.5 text-center text-sm font-semibold text-brand-500 hover:bg-gray-100 dark:border-gray-700/40 dark:text-brand-400 dark:hover:bg-white/10"
                    >
                      Ver todas as notificações
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tema */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Usuário */}
        {isAuthenticated ? (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg p-1.5 pr-3 hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Menu da conta"
              aria-expanded={userOpen}
              aria-haspopup="true"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: profileMeta.color }}
              >
                {initials || <User size={16} />}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-medium leading-tight">{user?.name}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide muted">{profileMeta.label}</span>
              </span>
            </button>

            {userOpen && (
              <div className="card absolute right-0 z-40 mt-2 w-72 origin-top-right animate-scale-in p-2 shadow-dropdown">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs muted">{user?.email}</p>
                  {user?.unit && <p className="mt-0.5 truncate text-[11px] muted">{user.unit}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                      style={{ background: profileMeta.color }}
                    >
                      {ROTULO_PAPEL[user?.role] || profileMeta.label}
                    </span>
                    <span className="inline-block rounded bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400">
                      {PLAN_LABELS[plan] || plan}
                    </span>
                  </div>
                </div>

                {/* Atalhos de conta */}
                <div className="mt-1 border-t border-gray-200 pt-1 dark:border-gray-700/40">
                  <MenuLink to="/conta" icon={UserCog} label="Minha conta" onClick={() => setUserOpen(false)} />
                  {can('workbench.access') && (
                    <MenuLink to="/mesa" icon={ClipboardList} label="Mesa de trabalho" onClick={() => setUserOpen(false)} />
                  )}
                  {can('admin.access') && (
                    <MenuLink to="/admin" icon={ShieldCheck} label="Console de governança" onClick={() => setUserOpen(false)} />
                  )}
                  <MenuLink to="/configuracoes" icon={SettingsIcon} label="Configurações" onClick={() => setUserOpen(false)} />
                </div>

                {/* Trocar de perfil — cada item faz um login real */}
                {contas.length > 0 && (
                  <div className="mt-1 border-t border-gray-200 pt-2 dark:border-gray-700/40">
                    <p className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide muted">
                      <Repeat size={11} /> Entrar como
                    </p>
                    <div className="space-y-1">
                      {contas.map((c) => {
                        const atual = user?.role === c.role
                        return (
                          <button
                            key={c.email}
                            onClick={() => trocarPerfil(c.role)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                              atual ? 'bg-gold-500/10' : 'hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-gray-900 dark:text-white">
                                {ROTULO_PAPEL[c.role] || c.role}
                              </span>
                              <span className="block truncate text-[10px] muted">{c.name}</span>
                            </span>
                            {atual
                              ? <Check size={14} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                              : <ArrowRight size={13} className="shrink-0 text-gray-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { logout(); setUserOpen(false); navigate('/') }}
                  className="mt-2 flex w-full items-center gap-2 rounded-md border-t border-gray-200 px-2 py-2 pt-3 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700/40 dark:text-gray-200 dark:hover:bg-white/10"
                >
                  <LogOut size={15} /> Sair da conta
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => abrirAuth('entrar')} className="btn-primary ml-1 px-3 py-1.5 text-sm">
            <LogIn size={15} /> Entrar
          </button>
        )}
      </div>

      <AuthModal open={authAberto} onClose={() => setAuthAberto(false)} abaInicial={authAba} />
    </header>
  )
}

function MenuLink({ to, icon: Icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
    >
      <Icon size={15} /> {label}
    </Link>
  )
}
