import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Newspaper, BarChart3, LineChart, Archive as ArchiveIcon,
  Tv, GraduationCap, Settings, HelpCircle, Bell, Moon, Sun, CornerDownLeft,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { normalize } from '../../utils/semanticSearch'

// Paleta de comandos global (Ctrl/Cmd + K): navegação e ações rápidas.
export default function CommandPalette() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  const commands = useMemo(
    () => [
      { id: 'home', label: 'Ir para o Dashboard', icon: LayoutDashboard, run: () => navigate('/') },
      { id: 'clipping', label: 'Abrir Clipping Diário', icon: Newspaper, run: () => navigate('/clipping') },
      { id: 'analise', label: 'Abrir Análise Semanal', icon: BarChart3, run: () => navigate('/analise') },
      { id: 'dados', label: 'Abrir Dados & Gráficos', icon: LineChart, run: () => navigate('/dados') },
      { id: 'arquivo', label: 'Abrir Arquivo de clippings', icon: ArchiveIcon, run: () => navigate('/arquivo') },
      { id: 'aprender', label: 'Abrir Centro Educacional', icon: GraduationCap, run: () => navigate('/aprender') },
      { id: 'apresentacao', label: 'Iniciar Apresentação', icon: Tv, run: () => navigate('/apresentacao') },
      { id: 'notificacoes', label: 'Ver Notificações', icon: Bell, run: () => navigate('/notificacoes') },
      { id: 'config', label: 'Abrir Configurações', icon: Settings, run: () => navigate('/configuracoes') },
      { id: 'sobre', label: 'Sobre o projeto', icon: HelpCircle, run: () => navigate('/sobre') },
      { id: 'tema', label: isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro', icon: isDark ? Sun : Moon, run: toggleTheme },
    ],
    [navigate, isDark, toggleTheme]
  )

  // Atalho global de abertura + Escape para fechar.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Reseta estado ao abrir e foca o input.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const list = commands.filter((c) => !query || normalize(c.label).includes(normalize(query)))
    if (query.trim()) {
      list.push({
        id: 'busca',
        label: `Buscar "${query.trim()}" no arquivo`,
        icon: Search,
        run: () => navigate(`/arquivo?q=${encodeURIComponent(query.trim())}`),
      })
    }
    return list
  }, [commands, query, navigate])

  useEffect(() => { setActive(0) }, [query])

  const choose = (cmd) => {
    cmd?.run?.()
    setOpen(false)
  }

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]) }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Paleta de comandos" className="card relative z-10 w-full max-w-lg overflow-hidden p-0 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-gray-700/40 px-4">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar páginas, ações ou conteúdo…"
            aria-label="Buscar comandos"
            className="w-full bg-transparent py-3.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
          />
          <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300 sm:block">ESC</kbd>
        </div>

        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm muted">Nenhum comando encontrado.</li>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <li key={cmd.id}>
                <button
                  onClick={() => choose(cmd)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    i === active ? 'bg-brand-500/15 text-brand-100' : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={17} className={i === active ? 'text-brand-300' : 'text-gray-400'} />
                  <span className="flex-1">{cmd.label}</span>
                  {i === active && <CornerDownLeft size={14} className="text-gray-400" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body
  )
}
