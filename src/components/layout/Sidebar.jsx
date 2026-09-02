import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, BarChart3, LineChart, Archive, Settings, HelpCircle,
  Shield, Tv, Lock, GraduationCap, Home, Sparkles, DollarSign, X,
  Target, Waves, Scale, Factory, Layers, Radio, Landmark, CalendarDays, BadgeCheck,
  UserCircle, ShieldCheck, ShieldAlert, FileText, ClipboardList, Search,
} from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuthStore } from '../../store/authStore'
import { useCan, useProfile, useProfileMeta } from '../../auth/useCan'
import { PLAN_LABELS } from '../../auth/permissions'
import { useSubscriptionStore } from '../../store/subscriptionStore'

// -----------------------------------------------------------------------------
// NAVEGAÇÃO DECLARATIVA — cada item pede uma CAPACIDADE (src/auth/permissions.js).
//
// Duas formas de tratar a falta de permissão:
//   • `capability`      → o item aparece com cadeado (upsell honesto: existe,
//                         você ainda não tem). Use para profundidade de PLANO.
//   • `hideWithout`     → o item NEM APARECE sem a capacidade. Use para áreas de
//                         PAPEL (produção e governança): oferecer o console de
//                         administração a um leitor não é upsell, é ruído.
//
// Seções inteiras também podem exigir capacidade (`sectionCapability`).
// -----------------------------------------------------------------------------
const NAV_SECTIONS = [
  {
    title: 'Visão geral',
    items: [
      { to: '/', label: 'Início', icon: Home, end: true },
      { to: '/painel', label: 'Painel', icon: LayoutDashboard, requiresAuth: true },
      { to: '/busca', label: 'Busca global', icon: Search, requiresAuth: true },
    ],
  },
  {
    title: 'Inteligência & Análise',
    items: [
      { to: '/clipping', label: 'Clipping Diário', icon: Newspaper, requiresAuth: true },
      { to: '/fontes', label: 'Confiabilidade das Fontes', icon: BadgeCheck, requiresAuth: true, capability: 'sources.reliability' },
      { to: '/arquivo', label: 'Arquivo & Pasta', icon: Archive, requiresAuth: true },
    ],
  },
  {
    title: 'Brasil Estratégico',
    items: [
      { to: '/industria', label: 'Base Industrial (BID)', icon: Factory, requiresAuth: true },
      { to: '/legislativo', label: 'Radar Legislativo', icon: Landmark, requiresAuth: true, capability: 'legislative.access' },
    ],
  },
  {
    title: 'Dados & Relatórios',
    items: [
      { to: '/dados', label: 'Dados & Gráficos', icon: LineChart, requiresAuth: true },
      { to: '/economia', label: 'Economia & Defesa', icon: DollarSign, requiresAuth: true },
    ],
  },
  {
    // Só existe para quem PRODUZ inteligência (perfil Analista e acima).
    title: 'Produção',
    sectionCapability: 'workbench.access',
    items: [
    ],
  },
  {
    title: 'Recursos',
    items: [
      { to: '/aprender', label: 'Centro Educacional', icon: GraduationCap },
      { to: '/apresentacao', label: 'Apresentação', icon: Tv, requiresAuth: true, capability: 'presentation.mode' },
    ],
  },
  {
    // Só existe para o Administrador.
    title: 'Governança',
    sectionCapability: 'admin.access',
    items: [
      { to: '/admin', label: 'Console de Governança', icon: ShieldCheck, requiresAuth: true, capability: 'admin.access', hideWithout: true },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/planos', label: 'Planos', icon: Sparkles },
  { to: '/conta', label: 'Minha conta', icon: UserCircle, requiresAuth: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, requiresAuth: true },
  { to: '/sobre', label: 'Sobre', icon: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const can = useCan()
  const profile = useProfile()
  const profileMeta = useProfileMeta()
  const plan = useSubscriptionStore((s) => s.plan)

  // Monta a navegação efetiva do perfil: remove seções e itens que não fazem
  // sentido oferecer, mantendo os que valem como upsell.
  const sections = NAV_SECTIONS
    .filter((sec) => !sec.sectionCapability || can(sec.sectionCapability))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => !it.hideWithout || can(it.capability)),
    }))
    .filter((sec) => sec.items.length > 0)

  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-white/[0.06] dark:bg-military-darker
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4 dark:border-white/[0.06]">
          <Logo size="md" showText={!collapsed} />
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {section.title}
                </p>
              )}
              {collapsed && <div className="mx-3 mb-1 border-t border-gray-200 dark:border-white/[0.06]" />}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Item
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClose}
                    locked={item.requiresAuth && !isAuthenticated}
                    restricted={isAuthenticated && item.capability && !can(item.capability)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Selo do perfil ativo — deixa claro "de onde" a pessoa está vendo o produto */}
        {isAuthenticated && !collapsed && (
          <div className="mx-3 mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Perfil ativo</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold tracking-tight">
              <span className="h-2 w-2 rounded-full" style={{ background: profileMeta.color }} />
              {profileMeta.label}
            </p>
            <p className="text-[11px] muted">Plano {PLAN_LABELS[plan] || plan}</p>
          </div>
        )}
        {isAuthenticated && collapsed && (
          <div className="mb-2 flex justify-center" title={`Perfil: ${profileMeta.label}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: profileMeta.color }} />
          </div>
        )}

        <div className="space-y-1 border-t border-gray-200 p-3 dark:border-white/[0.06]">
          {BOTTOM_NAV.map((item) => (
            <Item
              key={item.to}
              item={item}
              collapsed={collapsed}
              onClick={onClose}
              locked={item.requiresAuth && !isAuthenticated}
              restricted={isAuthenticated && item.capability && !can(item.capability)}
            />
          ))}
        </div>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick, locked, restricted }) {
  const { to, label, icon: Icon, badge, end } = item
  const hint = locked ? `${label} (requer login)` : restricted ? `${label} (recurso do plano Profissional)` : label

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? hint : undefined}
      aria-label={collapsed ? hint : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gold-500'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}

      {!collapsed && locked && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-300"
          title="Requer login"
        >
          <Lock size={10} />
        </span>
      )}
      {/* Item disponível em um plano superior (upsell honesto) */}
      {!collapsed && !locked && restricted && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400"
          title="Recurso do plano Profissional"
        >
          <Lock size={9} /> PRO
        </span>
      )}
      {!collapsed && !locked && !restricted && badge && (
        <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400">
          {badge}
        </span>
      )}
      {collapsed && (locked || restricted) && <Lock size={11} className="shrink-0 text-amber-500" />}
    </NavLink>
  )
}
