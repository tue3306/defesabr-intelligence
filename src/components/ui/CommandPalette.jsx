import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Archive as ArchiveIcon,
  Search,
  LayoutDashboard,
  Newspaper,
  LineChart,
  Tv,
  GraduationCap,
  Settings,
  HelpCircle,
  Bell,
  Moon,
  Sun,
  CornerDownLeft,
  Home,
  DollarSign,
  Factory,
  FlaskConical,
  Landmark,
  BadgeCheck,
  Compass,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Lock,
  Globe2,
  Link2,
  Crosshair,
  Swords,
  Scale,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useCan } from '../../auth/useCan'
import { palavrasDaConsulta, prepararTexto, avaliarPalavras } from '../../utils/semanticSearch'
import { TELAS, catalogoDeConflitos, buscarConflitos } from '../../services/searchService'

// -----------------------------------------------------------------------------
// PALETA DE COMANDOS (Ctrl/Cmd + K) — navegação e ações rápidas.
//
// Os comandos respeitam as capacidades do perfil: o que a pessoa não pode
// acessar aparece marcado com cadeado (e leva ao caminho de desbloqueio),
// em vez de sumir sem explicação ou levar a uma tela de bloqueio surpresa.
// -----------------------------------------------------------------------------

// ─────────────────────────────────────────────────────────────────────────────
// OS GRUPOS SÃO AS SEÇÕES DO MENU, NA MESMA ORDEM
//
// A paleta é o caminho mais rápido para qualquer tela, e por isso alcança
// todas as do menu. A lista abaixo usava nomes antigos ("Estratégico",
// "Tático") que nenhum comando tinha mais: as seções do menu iam para o fim,
// depois de "Ações".
//
// Cada tela também responde às palavras de `TELAS` (searchService): "exporta"
// acha a Indústria de defesa, "tema escuro" acha Configurações.
// ─────────────────────────────────────────────────────────────────────────────
const GROUPS = ['Navegação', 'Notícias', 'Ataques cibernéticos', 'Mundo', 'Conflitos', 'Brasil em dados', 'Ajuda e método', 'Conta', 'Administração', 'Ações']

const PALAVRAS_DA_TELA = Object.fromEntries(TELAS.map((t) => [t.id, t.palavras]))
const PALAVRAS_EXTRAS = {
  inicio: ['página inicial', 'apresentação do projeto'],
  busca: ['procurar', 'pesquisar', 'pesquisa'],
  sobre: ['quem somos', 'projeto', 'contato'],
  apresentacao: ['TV', 'telão', 'tela cheia', 'reunião'],
  tema: ['tema escuro', 'modo escuro', 'tema claro', 'modo claro', 'modo noturno', 'dark', 'aparência'],
  tour: ['tutorial', 'ajuda', 'boas-vindas', 'primeiros passos'],
}

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
      { id: 'busca', group: 'Navegação', label: 'Abrir Busca global', icon: Search, run: go('/busca'), auth: true },
      { id: 'aprender', group: 'Ajuda e método', label: 'Abrir Centro Educacional', icon: GraduationCap, run: go('/aprender') },
      { id: 'metodologia', group: 'Ajuda e método', label: 'Abrir Metodologia', icon: Scale, run: go('/metodologia') },
      { id: 'sobre', group: 'Ajuda e método', label: 'Sobre o projeto', icon: HelpCircle, run: go('/sobre') },

      // Estratégico — o quadro do país. O mapa vem primeiro porque é o centro.
      { id: 'mapa', group: 'Mundo', label: 'Abrir Mapa estratégico', icon: Globe2, run: go('/mapa'), auth: true },
      { id: 'mundo', group: 'Mundo', label: 'Abrir Mundo & Conflitos', icon: Swords, run: go('/mundo'), auth: true },
      { id: 'economia', group: 'Brasil em dados', label: 'Abrir Economia & Defesa', icon: DollarSign, run: go('/economia'), auth: true },
      { id: 'industria', group: 'Brasil em dados', label: 'Abrir Indústria de defesa', icon: Factory, run: go('/industria'), auth: true },
      { id: 'legislativo', group: 'Brasil em dados', label: 'Abrir Projetos de lei', icon: Landmark, run: go('/legislativo'), auth: true },
      { id: 'dados', group: 'Brasil em dados', label: 'Abrir Séries e indicadores', icon: LineChart, run: go('/dados'), auth: true },

      // Tático — setores e correlação.
      { id: 'clipping', group: 'Notícias', label: 'Abrir Notícias do dia', icon: Newspaper, run: go('/clipping'), auth: true },
      { id: 'correlacoes', group: 'Notícias', label: 'Abrir Correlações', icon: Link2, run: go('/correlacoes'), auth: true },
      { id: 'arquivo', group: 'Notícias', label: 'Abrir Minha pasta e arquivo', icon: ArchiveIcon, run: go('/arquivo'), auth: true },

      // Operacional — o incidente, com nome e data.
      { id: 'ciberameacas', group: 'Ataques cibernéticos', label: 'Abrir Incidentes no Brasil', icon: ShieldAlert, run: go('/ciberameacas'), auth: true },
      { id: 'atores', group: 'Ataques cibernéticos', label: 'Abrir Grupos contra o Brasil', icon: Crosshair, run: go('/atores'), auth: true },

      { id: 'apresentacao', group: 'Ações', label: 'Iniciar modo apresentação', icon: Tv, run: go('/apresentacao'), auth: true },

      // Administração — só aparece para quem administra
      { id: 'admin', group: 'Administração', label: 'Abrir Console de Governança', icon: ShieldCheck, run: go('/admin'), auth: true, cap: 'admin.access', hideWithout: true },
      { id: 'coleta', group: 'Administração', label: 'Abrir Método & Coleta', icon: FlaskConical, run: go('/coleta'), auth: true, cap: 'collection.monitor', hideWithout: true },
      { id: 'fontes', group: 'Administração', label: 'Abrir Disponibilidade das Fontes', icon: BadgeCheck, run: go('/fontes'), auth: true, cap: 'sources.reliability', hideWithout: true },

      // Conta
      { id: 'conta', group: 'Conta', label: 'Minha conta', icon: UserCircle, run: go('/conta'), auth: true },
      { id: 'notificacoes', group: 'Conta', label: 'Ver notificações', icon: Bell, run: go('/notificacoes'), auth: true },
      { id: 'config', group: 'Conta', label: 'Abrir Configurações', icon: Settings, run: go('/configuracoes'), auth: true },

      // Ações
      { id: 'tema', group: 'Ações', label: isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro', icon: isDark ? Sun : Moon, run: toggleTheme },
      { id: 'tour', group: 'Ações', label: 'Rever as boas-vindas', icon: Compass, run: () => window.dispatchEvent(new Event('defesabr:open-tour')), auth: true, soUsuario: true },
    ]

    return items
      .filter((c) => !c.hideWithout || can(c.cap))
      .filter((c) => !c.auth || isAuthenticated)
      // As boas-vindas são de conta de usuário; o administrador não as recebe.
      .filter((c) => !c.soUsuario || !can('admin.access'))
      .map((c) => {
        const palavras = [...(PALAVRAS_DA_TELA[c.id] || []), ...(PALAVRAS_EXTRAS[c.id] || [])]
        return {
          ...c,
          locked: c.cap ? !can(c.cap) : false,
          palavras,
          textoNome: prepararTexto(c.label),
          textoTudo: prepararTexto(c.label, palavras),
        }
      })
  }, [navigate, isDark, toggleTheme, isAuthenticated, can])

  // Conflitos de Mundo & Conflitos, pelo nome — o mesmo catálogo da tela.
  const [conflitos, setConflitos] = useState([])
  useEffect(() => {
    if (!open || !isAuthenticated) return
    let vivo = true
    catalogoDeConflitos().then((lista) => { if (vivo) setConflitos(lista) })
    return () => { vivo = false }
  }, [open, isAuthenticated])

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
    const raizes = palavrasDaConsulta(query)
    if (!query.trim()) return commands
    // Por palavras, em qualquer ordem e sem acento; o nome da tela pesa mais
    // que as palavras associadas a ela.
    const list = raizes.length
      ? commands
        .map((c) => {
          const r = avaliarPalavras(raizes, c.textoTudo)
          const noNome = avaliarPalavras(raizes, c.textoNome)
          const motivo = noNome.todas
            ? null
            : c.palavras.find((p) => avaliarPalavras(raizes, prepararTexto(p)).acertos > 0) || null
          return { ...c, motivo, ok: r.todas, pontos: r.acertos * 2 + noNome.acertos * 3 }
        })
        .filter((c) => c.ok)
        .sort((a, b) => b.pontos - a.pontos)
      : []
    buscarConflitos(query, conflitos).forEach((t) => list.push({
      id: `conflito-${t.id}`,
      group: 'Conflitos',
      label: t.nome,
      icon: Swords,
      run: () => navigate(`/mundo/teatro/${encodeURIComponent(t.id)}`),
    }))
    if (query.trim()) {
      list.push({
        id: 'buscar-tudo',
        group: 'Ações',
        label: `Buscar "${query.trim()}" em todos os módulos`,
        icon: Search,
        run: () => navigate(`/busca?q=${encodeURIComponent(query.trim())}`),
      })
    }
    return list
  }, [commands, query, navigate, conflitos])

  // Agrupa preservando a ordem canônica dos grupos.
  //
  // Grupo que não esteja em GROUPS vai para o FIM em vez de sumir. Antes ele
  // era descartado: `Administração` não constava da lista, e os três comandos
  // de administrador nunca chegavam à tela — embora continuassem no total do
  // rodapé e no alcance das setas. Um grupo novo não pode desaparecer em
  // silêncio só por faltar uma string aqui.
  const grouped = useMemo(() => {
    const map = new Map()
    results.forEach((c) => {
      const g = c.group || 'Ações'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(c)
    })
    const ordem = [
      ...GROUPS.filter((g) => map.has(g)),
      ...[...map.keys()].filter((g) => !GROUPS.includes(g)),
    ]
    return ordem.map((g) => ({ group: g, items: map.get(g) }))
  }, [results])

  // A MESMA lista que a tela desenha, achatada. `results` está na ordem de
  // criação dos comandos; a tela desenha na ordem dos GRUPOS. Eram dois
  // espaços de índice diferentes, e a navegação por teclado usava o errado:
  // a seta destacava uma linha e o Enter abria outra. Tudo o que depende da
  // posição visível — setas, Enter e a contagem do rodapé — lê daqui.
  const visiveis = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  useEffect(() => { setActive(0) }, [query])

  // Mantém o item ativo visível ao navegar com as setas.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (cmd) => {
    if (!cmd) return
    // Comando bloqueado leva ao painel, não a um beco sem saída. Antes ia para
    // /planos, que era o caminho de desbloqueio — a página saiu, e o único
    // bloqueio que resta é de PAPEL, que nenhuma tela destrava.
    if (cmd.locked) {
      navigate('/painel')
    } else {
      cmd.run?.()
    }
    setOpen(false)
  }

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, visiveis.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(visiveis[active]) }
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
          {visiveis.length === 0 && (
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
                        <span className="min-w-0 flex-1 truncate">
                          {cmd.label}
                          {cmd.motivo && <span className="ml-2 text-xs muted">· {cmd.motivo}</span>}
                        </span>
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
          <span>{visiveis.length} resultado{visiveis.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
