import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, Home, Newspaper, Archive, Rss, Landmark, DollarSign, Scale,
  LineChart, Map as MapIcon, Activity, GraduationCap, HelpCircle, Sun, Moon, CornerDownLeft,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { normalize } from '../../utils/semanticSearch'

// -----------------------------------------------------------------------------
// PALETA DE COMANDOS (Ctrl/Cmd + K)
//
// Sem itens bloqueados: todo comando listado é executável. Um catálogo do que
// não dá para fazer treina a pessoa a ignorar a lista.
// -----------------------------------------------------------------------------
const GRUPOS = ['Navegação', 'Coleta', 'Dados públicos', 'Sistema', 'Ações']

export default function CommandPalette() {
  const navegar = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [aberto, setAberto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [ativo, setAtivo] = useState(0)
  const campoRef = useRef(null)
  const listaRef = useRef(null)

  const comandos = useMemo(() => {
    const ir = (to) => () => navegar(to)
    return [
      { id: 'inicio', grupo: 'Navegação', rotulo: 'Ir para o Início', icone: Home, exec: ir('/') },
      { id: 'busca', grupo: 'Navegação', rotulo: 'Abrir busca', icone: Search, exec: ir('/busca') },
      { id: 'clipping', grupo: 'Coleta', rotulo: 'Abrir Clipping', icone: Newspaper, exec: ir('/clipping') },
      { id: 'arquivo', grupo: 'Coleta', rotulo: 'Abrir Acervo', icone: Archive, exec: ir('/arquivo') },
      { id: 'fontes', grupo: 'Coleta', rotulo: 'Abrir Fontes', icone: Rss, exec: ir('/fontes') },
      { id: 'legis', grupo: 'Dados públicos', rotulo: 'Abrir Radar Legislativo', icone: Landmark, exec: ir('/legislativo') },
      { id: 'econ', grupo: 'Dados públicos', rotulo: 'Abrir Economia & Defesa', icone: DollarSign, exec: ir('/economia') },
      { id: 'balanca', grupo: 'Dados públicos', rotulo: 'Abrir Balança Militar', icone: Scale, exec: ir('/balanca-militar') },
      { id: 'dados', grupo: 'Dados públicos', rotulo: 'Abrir Dados & Gráficos', icone: LineChart, exec: ir('/dados') },
      { id: 'mapa', grupo: 'Dados públicos', rotulo: 'Abrir Mapa de cobertura', icone: MapIcon, exec: ir('/mapa') },
      { id: 'status', grupo: 'Sistema', rotulo: 'Abrir Status da plataforma', icone: Activity, exec: ir('/status') },
      { id: 'aprender', grupo: 'Sistema', rotulo: 'Abrir Centro educacional', icone: GraduationCap, exec: ir('/aprender') },
      { id: 'sobre', grupo: 'Sistema', rotulo: 'Sobre o projeto', icone: HelpCircle, exec: ir('/sobre') },
      {
        id: 'tema',
        grupo: 'Ações',
        rotulo: isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro',
        icone: isDark ? Sun : Moon,
        exec: toggleTheme,
      },
    ]
  }, [navegar, isDark, toggleTheme])

  useEffect(() => {
    const aoTeclar = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberto((o) => !o)
      } else if (e.key === 'Escape') {
        setAberto(false)
      }
    }
    const abrirPorEvento = () => setAberto(true)
    window.addEventListener('keydown', aoTeclar)
    window.addEventListener('defesabr:abrir-paleta', abrirPorEvento)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('defesabr:abrir-paleta', abrirPorEvento)
    }
  }, [])

  useEffect(() => {
    if (!aberto) return undefined
    setConsulta('')
    setAtivo(0)
    const t = setTimeout(() => campoRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [aberto])

  const resultados = useMemo(() => {
    const agulha = normalize(consulta)
    const lista = comandos.filter((c) => !agulha || normalize(c.rotulo).includes(agulha))
    if (consulta.trim()) {
      lista.push({
        id: 'busca-livre',
        grupo: 'Ações',
        rotulo: `Buscar "${consulta.trim()}" no acervo`,
        icone: Search,
        exec: () => navegar(`/busca?q=${encodeURIComponent(consulta.trim())}`),
      })
    }
    return lista
  }, [comandos, consulta, navegar])

  const agrupados = useMemo(() => {
    const mapa = new Map()
    resultados.forEach((c) => {
      if (!mapa.has(c.grupo)) mapa.set(c.grupo, [])
      mapa.get(c.grupo).push(c)
    })
    return GRUPOS.filter((g) => mapa.has(g)).map((g) => ({ grupo: g, itens: mapa.get(g) }))
  }, [resultados])

  useEffect(() => { setAtivo(0) }, [consulta])
  useEffect(() => {
    listaRef.current?.querySelector('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  const escolher = (cmd) => {
    if (!cmd) return
    cmd.exec?.()
    setAberto(false)
  }

  const aoTeclarNoCampo = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(resultados[ativo]) }
  }

  if (!aberto) return null

  let cursor = -1

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="card relative z-10 w-full max-w-lg overflow-hidden p-0 shadow-modal"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 dark:border-white/10">
          <Search size={18} className="text-gray-500" />
          <input
            ref={campoRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={aoTeclarNoCampo}
            placeholder="Buscar páginas e ações…"
            aria-label="Buscar comandos"
            className="w-full bg-transparent py-3.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-gray-100"
          />
          <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:border-transparent dark:bg-white/10 dark:text-gray-300 sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listaRef} role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {resultados.length === 0 && (
            <p className="px-3 py-8 text-center text-sm muted">Nenhum comando para "{consulta}".</p>
          )}
          {agrupados.map(({ grupo, itens }) => (
            <div key={grupo} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">{grupo}</p>
              <ul>
                {itens.map((cmd) => {
                  cursor += 1
                  const i = cursor
                  const Icone = cmd.icone
                  const estaAtivo = i === ativo
                  return (
                    <li key={cmd.id} role="option" aria-selected={estaAtivo}>
                      <button
                        data-ativo={estaAtivo}
                        onClick={() => escolher(cmd)}
                        onMouseEnter={() => setAtivo(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          estaAtivo
                            ? 'bg-gold-500/10 text-gray-900 dark:bg-white/[0.08] dark:text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icone size={17} className={estaAtivo ? 'text-gold-600 dark:text-gold-400' : 'text-gray-500'} />
                        <span className="flex-1 truncate">{cmd.rotulo}</span>
                        {estaAtivo && <CornerDownLeft size={14} className="shrink-0 text-gray-500" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-[11px] muted dark:border-white/10">
          <span className="hidden sm:inline">↑ ↓ navegar · ⏎ abrir · esc fechar</span>
          <span>{resultados.length} resultado{resultados.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
