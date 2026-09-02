import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Newspaper, BarChart3, LineChart, Archive as ArchiveIcon,
  Tv, GraduationCap, Settings, HelpCircle, Bell, Moon, Sun, CornerDownLeft, Home,
  Sparkles, DollarSign, Target, Waves, Shield, Scale, Factory, Layers, Radio,
  Landmark, CalendarDays, BadgeCheck, Compass, ShieldAlert, FileText, ClipboardList,
  ShieldCheck, UserCircle, Lock,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useCan } from '../../auth/useCan'
import { normalize } from '../../utils/semanticSearch'

// -----------------------------------------------------------------------------
// PALETA DE COMANDOS (Ctrl/Cmd + K) — navegação e ações rápidas.
//
// Os comandos respeitam as capacidades do perfil: o que a pessoa não pode
// acessar aparece marcado com cadeado (e leva ao caminho de desbloqueio),
// em vez de sumir sem explicação ou levar a uma tela de bloqueio surpresa.
// -----------------------------------------------------------------------------

const GROUPS = ['Navegação', 'Inteligência', 'Brasil Estratégico', 'Produção', 'Conta', 'Ações']

export default function CommandPalette() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const can = useCan()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const commands = useMemo(() => {
    const go = (to) => () => navigate(to)
    const items = [
      // Navegação
      { id: 'inicio', group: 'Navegação', label: 'Ir para o Início', icon: Home, run: go('/') },
      { id: 'painel', group: 'Navegação', label: 'Abrir Painel', icon: LayoutDashboard, run: go('/painel'), auth: true },
      { id: 'planos', group: 'Navegação', label: 'Ver planos de assinatura', icon: Sparkles, run: go('/planos') },
      { id: 'aprender', group: 'Navegação', label: 'Abrir Centro Educacional', icon: GraduationCap, run: go('/aprender') },
      { id: 'sobre', group: 'Navegação', label: 'Sobre o projeto', icon: HelpCircle, run: go('/sobre') },

      // Inteligência
      { id: 'clipping', group: 'Inteligência', label: 'Abrir Clipping Diário', icon: Newspaper, run: go('/clipping'), auth: true },
      { id: 'analise', group: 'Inteligência', label: 'Abrir Análise Semanal', icon: BarChart3, run: go('/analise'), auth: true },
      { id: 'dossies', group: 'Inteligência', label: 'Abrir Dossiês "Em Foco"', icon: Layers, run: go('/dossies'), auth: true },
      { id: 'riscos', group: 'Inteligência', label: 'Abrir Matriz de Riscos', icon: ShieldAlert, run: go('/riscos'), auth: true, cap: 'risk.access' },
      { id: 'narrativas', group: 'Inteligência', label: 'Abrir Monitor de Narrativas', icon: Radio, run: go('/narrativas'), auth: true, cap: 'narratives.access' },
      { id: 'calendario', group: 'Inteligência', label: 'Abrir Calendário Estratégico', icon: CalendarDays, run: go('/calendario'), auth: true },
      { id: 'fontes', group: 'Inteligência', label: 'Abrir Confiabilidade das Fontes', icon: BadgeCheck, run: go('/fontes'), auth: true, cap: 'sources.reliability' },
      { id: 'arquivo', group: 'Inteligência', label: 'Abrir Arquivo & Pasta', icon: ArchiveIcon, run: go('/arquivo'), auth: true },
      { id: 'busca', group: 'Navegação', label: 'Abrir Busca global', icon: Search, run: go('/busca'), auth: true },

      // Brasil Estratégico
      { id: 'programas', group: 'Brasil Estratégico', label: 'Abrir Programas Estratégicos', icon: Target, run: go('/programas'), auth: true },
      { id: 'amazonia', group: 'Brasil Estratégico', label: 'Abrir Amazônia Azul', icon: Waves, run: go('/amazonia-azul'), auth: true },
      { id: 'fronteiras', group: 'Brasil Estratégico', label: 'Abrir Fronteiras & Amazônia', icon: Shield, run: go('/fronteiras'), auth: true },
      { id: 'balanca', group: 'Brasil Estratégico', label: 'Abrir Balança Militar', icon: Scale, run: go('/balanca-militar'), auth: true },
      { id: 'industria', group: 'Brasil Estratégico', label: 'Abrir Base Industrial (BID)', icon: Factory, run: go('/industria'), auth: true },
      { id: 'legislativo', group: 'Brasil Estratégico', label: 'Abrir Radar Legislativo', icon: Landmark, run: go('/legislativo'), auth: true, cap: 'legislative.access' },
      { id: 'dados', group: 'Brasil Estratégico', label: 'Abrir Dados & Gráficos', icon: LineChart, run: go('/dados'), auth: true },
      { id: 'economia', group: 'Brasil Estratégico', label: 'Abrir Economia & Defesa', icon: DollarSign, run: go('/economia'), auth: true },

      // Produção
      { id: 'mesa', group: 'Produção', label: 'Abrir Mesa de trabalho', icon: ClipboardList, run: go('/mesa'), auth: true, cap: 'workbench.access' },
      { id: 'relatorios', group: 'Produção', label: 'Abrir Central de Relatórios', icon: FileText, run: go('/relatorios'), auth: true, cap: 'reports.export' },
      { id: 'apresentacao', group: 'Produção', label: 'Iniciar modo apresentação', icon: Tv, run: go('/apresentacao'), auth: true, cap: 'presentation.mode' },
      { id: 'admin', group: 'Produção', label: 'Abrir Console de Governança', icon: ShieldCheck, run: go('/admin'), auth: true, cap: 'admin.access', hideWithout: true },

      // Conta
      { id: 'conta', group: 'Conta', label: 'Minha conta', icon: UserCircle, run: go('/conta'), auth: true },
      { id: 'notificacoes', group: 'Conta', label: 'Ver notificações', icon: Bell, run: go('/notificacoes'), auth: true },
      { id: 'config', group: 'Conta', label: 'Abrir Configurações', icon: Settings, run: go('/configuracoes'), auth: true },

      // Ações
      { id: 'tema', group: 'Ações', label: isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro', icon: isDark ? Sun : Moon, run: toggleTheme },
      { id: 'tour', group: 'Ações', label: 'Rever tour guiado', icon: Compass, run: () => window.dispatchEvent(new Event('defesabr:open-tour')), auth: true },
    ]

    return items
      .filter((c) => !c.hideWithout || can(c.cap))
      .filter((c) => !c.auth || isAuthenticated)
      .map((c) => ({ ...c, locked: c.cap ? !can(c.cap) : false }))
  }, [navigate, isDark, toggleTheme, isAuthenticated, can])

  // Atalho global de abertura + Escape para fechar + evento externo (Navbar mobile).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const openFromEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('defesabr:open-palette', openFromEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('defesabr:open-palette', openFromEvent)
    }
  }, [])

  // Reseta estado ao abrir e foca o campo.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  const results = useMemo(() => {
    const needle = normalize(query)
    const list = commands.filter((c) => !needle || normalize(c.label).includes(needle))
    if (query.trim()) {
      list.push({
        id: 'busca',
        group: 'Ações',
        label: `Buscar "${query.trim()}" em todos os módulos`,
        icon: Search,
        run: () => navigate(`/busca?q=${encodeURIComponent(query.trim())}`),
      })
    }
    return list
  }, [commands, query, navigate])

  // Agrupa preservando a ordem canônica dos grupos.
  const grouped = useMemo(() => {
    const map = new Map()
    results.forEach((c) => {
      const g = c.group || 'Ações'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(c)
    })
    return GROUPS.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g) }))
  }, [results])

  useEffect(() => { setActive(0) }, [query])

  // Mantém o item ativo visível ao navegar com as setas.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (cmd) => {
    if (!cmd) return
    // Comando bloqueado leva ao caminho de desbloqueio, não a um beco sem saída.
    if (cmd.locked) {
      navigate('/planos')
    } else {
      cmd.run?.()
    }
    setOpen(false)
  }

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]) }
  }

  if (!open) return null

  // Índice global contínuo entre os grupos (para a navegação por teclado).
  let cursor = -1

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="card relative z-10 w-full max-w-lg animate-scale-in overflow-hidden p-0 shadow-modal"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700/40">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar páginas, ações ou conteúdo…"
            aria-label="Buscar comandos"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-resultados"
            className="w-full bg-transparent py-3.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-gray-100"
          />
          <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-transparent dark:bg-white/10 dark:text-gray-300 sm:block">
            ESC
          </kbd>
        </div>

        <div id="paleta-resultados" ref={listRef} role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm muted">Nenhum comando encontrado para “{query}”.</p>
          )}
          {grouped.map(({ group, items }) => (
            <div key={group} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group}</p>
              <ul>
                {items.map((cmd) => {
                  cursor += 1
                  const i = cursor
                  const Icon = cmd.icon
                  const isActive = i === active
                  return (
                    <li key={cmd.id} role="option" aria-selected={isActive}>
                      <button
                        data-active={isActive}
                        onClick={() => choose(cmd)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-gold-500/10 text-gray-900 dark:bg-white/[0.08] dark:text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon size={17} className={isActive ? 'text-gold-600 dark:text-gold-400' : 'text-gray-400'} />
                        <span className="flex-1 truncate">{cmd.label}</span>
                        {cmd.locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400">
                            <Lock size={9} /> PRO
                          </span>
                        )}
                        {isActive && !cmd.locked && <CornerDownLeft size={14} className="shrink-0 text-gray-400" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-[11px] muted dark:border-gray-700/40">
          <span className="hidden sm:inline">↑ ↓ navegar · ⏎ abrir · esc fechar</span>
          <span>{results.length} resultado{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
