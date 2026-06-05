import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, Bell, Moon, Sun, LogIn, LogOut, User, PanelLeftClose, PanelLeft } from 'lucide-react'
import SearchBar from '../ui/SearchBar'
import Badge from '../ui/Badge'
import LoginModal from '../auth/LoginModal'
import { useAuthStore } from '../../store/authStore'
import { useNewsStore } from '../../store/newsStore'
import { useTheme } from '../../hooks/useTheme'
import { timeAgo } from '../../utils/dateUtils'

export default function Navbar({ onToggleMobile, onToggleCollapse, collapsed }) {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuthStore()
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const markAllRead = useNewsStore((s) => s.markAllRead)
  const markRead = useNewsStore((s) => s.markRead)

  const [loginOpen, setLoginOpen] = useState(false)
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-700/50 bg-military-darker/95 px-4 backdrop-blur">
      <button onClick={onToggleMobile} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 lg:hidden" aria-label="Abrir menu">
        <Menu size={20} />
      </button>
      <button
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-gray-400 hover:bg-white/5 lg:inline-flex"
        aria-label="Recolher menu lateral"
      >
        {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
      </button>

      <div className="hidden max-w-md flex-1 sm:block">
        <SearchBar
          placeholder="Busca global (Enter para buscar com IA)…"
          onSearch={(q) => q && navigate(`/arquivo?q=${encodeURIComponent(q)}`)}
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Notificações */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((o) => !o) }}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-white/5"
            aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
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
            <div className="card absolute right-0 z-40 mt-2 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden p-0 shadow-xl sm:w-80">
              <div className="flex items-center justify-between border-b border-gray-700/40 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  Notificações
                  {unread > 0 && (
                    <span className="rounded-full bg-military-red/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                      {unread} nova{unread > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-brand-400 hover:text-brand-300">
                    Marcar lidas
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-sm muted">Nenhuma notificação por enquanto</p>
                </div>
              ) : (
                <>
                  <ul className="max-h-[60vh] overflow-y-auto sm:max-h-80">
                    {notifications.slice(0, 8).map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => markRead(n.id)}
                          className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                            n.read ? 'opacity-55' : ''
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            <Badge type="urgency" value={n.level} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-gray-200">{n.title}</span>
                            <span className="text-xs muted">{timeAgo(n.time)}</span>
                          </span>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/notificacoes"
                    onClick={() => setNotifOpen(false)}
                    className="block border-t border-gray-700/40 px-3 py-2.5 text-center text-sm font-semibold text-brand-400 hover:bg-white/5"
                  >
                    Ver todas as notificações
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tema */}
        <button onClick={toggleTheme} className="rounded-lg p-2 text-gray-400 hover:bg-white/5" aria-label="Alternar tema">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Usuário */}
        {isAuthenticated ? (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg p-1.5 pr-3 hover:bg-white/5"
              aria-label="Menu do usuário"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                <User size={16} />
              </span>
              <span className="hidden text-sm font-medium md:inline">{user?.name}</span>
            </button>
            {userOpen && (
              <div className="card absolute right-0 z-40 mt-2 w-52 p-2 shadow-xl">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs muted">{user?.email}</p>
                  <span className="mt-1 inline-block rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-300">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); setUserOpen(false) }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-200 hover:bg-white/5"
                >
                  <LogOut size={15} /> Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setLoginOpen(true)} className="btn-primary ml-1 px-3 py-1.5 text-sm">
            <LogIn size={15} /> Entrar
          </button>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  )
}
