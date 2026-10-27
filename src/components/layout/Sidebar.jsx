import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, LineChart, Archive, Settings, HelpCircle, Tv, Lock, GraduationCap, Home, DollarSign, X, Scale, Factory, Landmark, BadgeCheck, UserCircle, ShieldCheck, ShieldAlert, FlaskConical, Crosshair, Link2, Globe2, Swords, Star,
} from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuthStore } from '../../store/authStore'
import { useCan } from '../../auth/useCan'
import { useUiStore } from '../../store/uiStore'

// -----------------------------------------------------------------------------
// NAVEGAÇÃO DECLARATIVA — cada item pede uma CAPACIDADE (src/auth/permissions.js).
//
// A ordem segue o uso: notícias primeiro (o que quase todo mundo veio ver),
// depois ataques, depois o quadro do país. Por dentro, cada seção guarda o
// `nivel` de inteligência (tático, operacional, estratégico).
//
// Itens de administração usam `hideWithout`: nem aparecem para quem não tem o
// papel. Seções inteiras também podem exigir capacidade (`sectionCapability`).
// A busca não tem item próprio: fica fixa na barra do topo (e no Ctrl + K).
// -----------------------------------------------------------------------------
const NAV_SECTIONS = [
  {
    title: 'Visão geral',
    items: [
      { to: '/painel', label: 'Painel', icon: LayoutDashboard, requiresAuth: true },
    ],
  },
  {
    title: 'Notícias e ligações',
    nivel: 'tatico',
    items: [
      { to: '/clipping', label: 'Notícias do dia', icon: Newspaper, requiresAuth: true },
      { to: '/correlacoes', label: 'Correlações', icon: Link2, requiresAuth: true },
      { to: '/arquivo', label: 'Arquivo & Pasta', icon: Archive, requiresAuth: true },
    ],
  },
  {
    title: 'Ataques cibernéticos',
    nivel: 'operacional',
    items: [
      { to: '/ciberameacas', label: 'Incidentes no Brasil', icon: ShieldAlert, requiresAuth: true },
      { to: '/atores', label: 'Grupos contra o Brasil', icon: Crosshair, requiresAuth: true },
    ],
  },
  {
    title: 'O quadro do país',
    nivel: 'estrategico',
    items: [
      { to: '/mapa', label: 'Mapa estratégico', icon: Globe2, requiresAuth: true },
      { to: '/mundo', label: 'Mundo & Conflitos', icon: Swords, requiresAuth: true },
      { to: '/economia', label: 'Economia & Defesa', icon: DollarSign, requiresAuth: true },
      { to: '/industria', label: 'Indústria de defesa', icon: Factory, requiresAuth: true },
      { to: '/legislativo', label: 'Radar Legislativo', icon: Landmark, requiresAuth: true },
      { to: '/dados', label: 'Séries e indicadores', icon: LineChart, requiresAuth: true },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { to: '/aprender', label: 'Centro Educacional', icon: GraduationCap },
      { to: '/', label: 'Página inicial', icon: Home, end: true },
      { to: '/metodologia', label: 'Como decidimos', icon: Scale },
      { to: '/apresentacao', label: 'Apresentação', icon: Tv, requiresAuth: true },
    ],
  },
  {
    // Só existe para o Administrador: operar a instalação.
    title: 'Administração',
    sectionCapability: 'admin.access',
    items: [
      { to: '/admin', label: 'Console de Governança', icon: ShieldCheck, requiresAuth: true, capability: 'admin.access', hideWithout: true },
      { to: '/coleta', label: 'Método & Coleta', icon: FlaskConical, requiresAuth: true, capability: 'collection.monitor', hideWithout: true },
      { to: '/fontes', label: 'Disponibilidade das Fontes', icon: BadgeCheck, requiresAuth: true, capability: 'sources.reliability', hideWithout: true },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/conta', label: 'Minha conta', icon: UserCircle, requiresAuth: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, requiresAuth: true },
  { to: '/sobre', label: 'Sobre', icon: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const can = useCan()

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

          {/* Conta e ajuda entram na mesma lista rolável: presas ao pé, elas
            * escondiam as últimas seções do menu em telas de notebook. */}
          <div>
            {!collapsed && (
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sua conta
              </p>
            )}
            {collapsed && <div className="mx-3 mb-1 border-t border-gray-200 dark:border-white/[0.06]" />}
            <div className="space-y-0.5">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { onClose?.(); useUiStore.getState().abrirInteresses() }}
                  title={collapsed ? 'Personalizar interesses' : undefined}
                  aria-label={collapsed ? 'Personalizar interesses' : undefined}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100"
                >
                  <Star size={18} className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">Personalizar interesses</span>}
                </button>
              )}
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
          </div>
        </nav>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick, locked, restricted }) {
  const { to, label, icon: Icon, badge, end } = item
  const hint = locked ? `${label} (requer login)` : restricted ? `${label} (restrito a administradores)` : label

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      data-tour={`menu-${to}`}
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
      {/* ACIMA DO NÍVEL DE LEITURA ATUAL — e não "PRO".
        * O selo dizia PRO, que num produto de código aberto sem cobrança
        * anuncia uma compra inexistente. Toda conta nasce com o nível
        * completo; este selo só aparece para quem rebaixou o próprio nível
        * na página de Níveis de acesso, e é isso que ele passa a dizer. */}
      {!collapsed && !locked && restricted && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400"
          title="Acima do nível de leitura selecionado — ajuste em Níveis de acesso"
        >
          <Lock size={9} /> NÍVEL
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
