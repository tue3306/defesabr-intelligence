import { NavLink } from 'react-router-dom'
import {
  X, Newspaper, Archive, Rss, Landmark, DollarSign, Scale, LineChart,
  Map as MapIcon, Activity, Search, GraduationCap, HelpCircle, Home,
} from 'lucide-react'
import Logo from '../ui/Logo'

// -----------------------------------------------------------------------------
// NAVEGAÇÃO
//
// Sem portões de permissão: não há contas nesta versão, então todo item leva a
// uma tela que qualquer visitante abre. Um menu com cadeados que ninguém pode
// abrir seria um catálogo do que falta.
//
// A ordem segue o fluxo do dado: coleta → dados públicos → sistema. É a mesma
// ordem em que alguém precisa entender a plataforma.
// -----------------------------------------------------------------------------
const SECOES = [
  {
    titulo: 'Visão geral',
    itens: [
      { to: '/', label: 'Início', icone: Home, exato: true },
      { to: '/busca', label: 'Busca', icone: Search },
    ],
  },
  {
    titulo: 'Coleta',
    itens: [
      { to: '/clipping', label: 'Clipping', icone: Newspaper },
      { to: '/arquivo', label: 'Acervo', icone: Archive },
      { to: '/fontes', label: 'Fontes', icone: Rss },
    ],
  },
  {
    titulo: 'Dados públicos',
    itens: [
      { to: '/legislativo', label: 'Legislativo', icone: Landmark },
      { to: '/economia', label: 'Economia', icone: DollarSign },
      { to: '/balanca-militar', label: 'Balança Militar', icone: Scale },
      { to: '/dados', label: 'Dados & Gráficos', icone: LineChart },
      { to: '/mapa', label: 'Mapa de cobertura', icone: MapIcon },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { to: '/status', label: 'Status', icone: Activity },
    ],
  },
]

const RODAPE = [
  { to: '/aprender', label: 'Aprender', icone: GraduationCap },
  { to: '/sobre', label: 'Sobre', icone: HelpCircle },
]

export default function Sidebar({ open, onClose, collapsed }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

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
            className="ml-auto rounded p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {SECOES.map((secao) => (
            <div key={secao.titulo}>
              {!collapsed ? (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {secao.titulo}
                </p>
              ) : (
                <div className="mx-3 mb-1 border-t border-gray-200 dark:border-white/[0.06]" />
              )}
              <div className="space-y-0.5">
                {secao.itens.map((item) => (
                  <Item key={item.to} item={item} collapsed={collapsed} onClick={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-200 p-3 dark:border-white/[0.06]">
          {RODAPE.map((item) => (
            <Item key={item.to} item={item} collapsed={collapsed} onClick={onClose} />
          ))}
        </div>
      </aside>
    </>
  )
}

function Item({ item, collapsed, onClick }) {
  const { to, label, icone: Icone, exato } = item
  return (
    <NavLink
      to={to}
      end={exato}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gold-500'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100'
        }`
      }
    >
      <Icone size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}
