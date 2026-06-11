import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, BarChart3, LineChart, Archive, Settings, HelpCircle,
  Shield, Tv, Lock, GraduationCap, Home, Sparkles, DollarSign, X,
  Target, Waves, Scale, Factory, Layers, Radio, Landmark, CalendarDays, BadgeCheck,
} from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuthStore } from '../../store/authStore'

// Navegação agrupada por seções (estilo plataforma oficial).
const NAV_SECTIONS = [
  {
    title: 'Visão geral',
    items: [
      { to: '/', label: 'Início', icon: Home, end: true },
      { to: '/painel', label: 'Painel', icon: LayoutDashboard, requiresAuth: true },
    ],
  },
  {
    title: 'Inteligência & Análise',
    items: [
      { to: '/clipping', label: 'Clipping Diário', icon: Newspaper, requiresAuth: true },
      { to: '/analise', label: 'Análise Semanal', icon: BarChart3, requiresAuth: true },
      { to: '/dossies', label: 'Dossiês "Em Foco"', icon: Layers, requiresAuth: true, badge: 'NOVO' },
      { to: '/narrativas', label: 'Monitor de Narrativas', icon: Radio, requiresAuth: true, requiresPermission: 'analyst' },
      { to: '/calendario', label: 'Calendário Estratégico', icon: CalendarDays, requiresAuth: true },
      { to: '/fontes', label: 'Confiabilidade das Fontes', icon: BadgeCheck, requiresAuth: true, requiresPermission: 'analyst' },
      { to: '/arquivo', label: 'Arquivo & Pasta', icon: Archive, requiresAuth: true },
    ],
  },
  {
    title: 'Brasil Estratégico',
    items: [
      { to: '/programas', label: 'Programas Estratégicos', icon: Target, requiresAuth: true, badge: 'NOVO' },
      { to: '/amazonia-azul', label: 'Amazônia Azul', icon: Waves, requiresAuth: true, badge: 'NOVO' },
      { to: '/fronteiras', label: 'Fronteiras & Amazônia', icon: Shield, requiresAuth: true },
      { to: '/balanca-militar', label: 'Balança Militar', icon: Scale, requiresAuth: true },
      { to: '/industria', label: 'Base Industrial (BID)', icon: Factory, requiresAuth: true },
      { to: '/legislativo', label: 'Radar Legislativo', icon: Landmark, requiresAuth: true },
    ],
  },
  {
    title: 'Dados',
    items: [
      { to: '/dados', label: 'Dados & Gráficos', icon: LineChart, requiresAuth: true },
      { to: '/economia', label: 'Economia & Defesa', icon: DollarSign, requiresAuth: true },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { to: '/aprender', label: 'Centro Educacional', icon: GraduationCap },
      { to: '/apresentacao', label: 'Apresentação', icon: Tv, requiresAuth: true },
    ],
  },
]

const bottomNav = [
  { to: '/planos', label: 'Planos', icon: Sparkles },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, requiresAuth: true },
  { to: '/sobre', label: 'Sobre', icon: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`on-dark fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-700/50 bg-military-darker transition-all duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-700/50 px-4">
          <Logo size="md" showText={!collapsed} />
          <button onClick={onClose} className="ml-auto rounded p-1 text-gray-400 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">{section.title}</p>
              )}
              {collapsed && <div className="mx-3 mb-1 border-t border-gray-700/40" />}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Item
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClose}
                    locked={item.requiresAuth && !isAuthenticated}
                    restricted={isAuthenticated && item.requiresPermission && !hasPermission(item.requiresPermission)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-700/50 p-3">
          {bottomNav.map((item) => (
            <Item
              key={item.to}
              item={item}
              collapsed={collapsed}
              onClick={onClose}
              locked={item.requiresAuth && !isAuthenticated}
              restricted={isAuthenticated && item.requiresPermission && !hasPermission(item.requiresPermission)}
            />
          ))}
        </div>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick, locked, restricted }) {
  const { to, label, icon: Icon, badge, end } = item
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? (locked ? `${label} (requer login)` : restricted ? `${label} (perfil Analista)` : label) : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-500/15 text-brand-300'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && locked && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300"
          title="Requer login"
        >
          <Lock size={10} />
        </span>
      )}
      {/* Item exige perfil de Analista (usuário logado sem permissão) */}
      {!collapsed && !locked && restricted && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-400"
          title="Recurso de Analista"
        >
          <Lock size={9} /> ANALISTA
        </span>
      )}
      {!collapsed && !locked && !restricted && badge && (
        <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-bold text-brand-300">
          {badge}
        </span>
      )}
      {collapsed && (locked || restricted) && <Lock size={11} className="shrink-0 text-amber-400" />}
    </NavLink>
  )
}
