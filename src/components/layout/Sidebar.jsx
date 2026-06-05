import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Newspaper,
  BarChart3,
  LineChart,
  Archive,
  Settings,
  HelpCircle,
  Shield,
  Tv,
  Lock,
  GraduationCap,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clipping', label: 'Clipping Diário', icon: Newspaper, badge: 'NOVO', requiresAuth: true },
  { to: '/analise', label: 'Análise Semanal', icon: BarChart3, requiresAuth: true },
  { to: '/dados', label: 'Dados & Gráficos', icon: LineChart },
  { to: '/arquivo', label: 'Arquivo', icon: Archive },
  { to: '/aprender', label: 'Centro Educacional', icon: GraduationCap, badge: 'NOVO' },
  { to: '/apresentacao', label: 'Apresentação', icon: Tv },
]

const bottomNav = [
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/sobre', label: 'Sobre', icon: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-700/50 bg-military-darker transition-all duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-700/50 px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
            <Shield size={20} />
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">DefesaBR</p>
              <p className="text-[10px] uppercase tracking-widest text-brand-400">Intelligence</p>
            </div>
          )}
          <button onClick={onClose} className="ml-auto rounded p-1 text-gray-400 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNav.map((item) => (
            <Item key={item.to} item={item} collapsed={collapsed} onClick={onClose} locked={item.requiresAuth && !isAuthenticated} />
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-700/50 p-3">
          {bottomNav.map((item) => (
            <Item key={item.to} item={item} collapsed={collapsed} onClick={onClose} />
          ))}
        </div>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick, locked }) {
  const { to, label, icon: Icon, badge, end } = item
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? (locked ? `${label} (requer login)` : label) : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-500/15 text-brand-300'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
        }`
      }
    >
      <Icon size={19} className="shrink-0" />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && locked && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300"
          title="Requer login"
        >
          <Lock size={10} /> LOGIN
        </span>
      )}
      {!collapsed && !locked && badge && (
        <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-bold text-brand-300">
          {badge}
        </span>
      )}
      {collapsed && locked && <Lock size={11} className="shrink-0 text-amber-400" />}
    </NavLink>
  )
}
