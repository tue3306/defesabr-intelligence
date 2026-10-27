import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search as SearchIcon, Newspaper, Layers, ShieldAlert, Target, Radio,
  BadgeCheck, CalendarDays, Landmark, Archive, BookOpen, Compass,
  X, Sparkles, Database, ChevronRight, ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useCan } from '../auth/useCan'
import { useResource } from '../hooks/useResource'
import { searchService } from '../services'
import { SEARCH_TYPES } from '../services/searchService'
import { plural, urgencyMeta } from '../utils/textUtils'

// Os tipos declaram o ícone por nome (dado puro); aqui ligamos ao componente.
const TYPE_ICONS = {
  Newspaper, Layers, ShieldAlert, Target, Radio, BadgeCheck,
  CalendarDays, Landmark, Archive, BookOpen, Compass,
}

const TYPE_COLOR = {
  noticia: '#2e7d46',
  proposicao: '#c0392b',
  termo: '#8b5cf6',
  fonte: '#caa733',
}

/** Realça as ocorrências da consulta dentro de um trecho de texto. */
function Highlight({ text = '', query = '' }) {
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 2)
  if (!terms.length) return text
  // Escapa metacaracteres para que a consulta do usuário não vire regex.
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = String(text).split(pattern)
  return parts.map((part, i) =>
    pattern.test(part) && terms.some((t) => part.toLowerCase() === t.toLowerCase())
      ? <mark key={i} className="rounded bg-gold-500/25 px-0.5 text-inherit">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

// -----------------------------------------------------------------------------
// BUSCA GLOBAL — notícias, proposições, glossário e (para quem administra)
// fontes, numa consulta só. Resultado que a conta não pode abrir não aparece.
// -----------------------------------------------------------------------------
export default function Search() {
  const [params, setParams] = useSearchParams()
  const can = useCan()

  const urlQuery = params.get('q') || ''
  const [input, setInput] = useState(urlQuery)
  const [query, setQuery] = useState(urlQuery)
  const [type, setType] = useState('')

  // A URL é a fonte da verdade: link de busca compartilhado reabre o resultado.
  useEffect(() => {
    setInput(urlQuery)
    setQuery(urlQuery)
  }, [urlQuery])

  // Busca com atraso curto enquanto se digita, sem esperar o Enter.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 280)
    return () => clearTimeout(t)
  }, [input])

  const { data, loading, error, refetch } = useResource(
    () => searchService.query({ q: query }),
    [query],
    { enabled: query.trim().length > 0, keepPreviousData: true }
  )

  const suggestions = useResource(() => searchService.suggestions(), [])

  // Memoizado porque entra nas dependências do `useMemo` abaixo. O filtro por
  // tipo é feito aqui: o servidor o ignora.
  const permitidos = useMemo(
    () => (data?.items || []).filter((i) => !i.capability || can(i.capability)),
    [data, can],
  )
  const items = useMemo(() => (type ? permitidos.filter((i) => i.type === type) : permitidos), [permitidos, type])
  const groups = (data?.groups || [])
    .map((g) => ({ ...g, count: permitidos.filter((i) => i.type === g.id).length }))
    .filter((g) => g.count > 0)

  // Se a nova busca não tem resultado do tipo marcado, o filtro volta para
  // "Tudo" (senão o botão some e não há como desmarcá-lo).
  useEffect(() => {
    if (type && data && !permitidos.some((i) => i.type === type)) setType('')
  }, [type, data, permitidos])

  // Agrupa por tipo preservando a ordem canônica de SEARCH_TYPES.
  const grouped = useMemo(() => {
    const map = new Map()
    items.forEach((i) => {
      if (!map.has(i.type)) map.set(i.type, [])
      map.get(i.type).push(i)
    })
    return SEARCH_TYPES.filter((t) => map.has(t.id)).map((t) => ({ meta: t, items: map.get(t.id) }))
  }, [items])

  const submit = (e) => {
    e.preventDefault()
    const q = input.trim()
    setParams(q ? { q } : {}, { replace: true })
    setQuery(q)
  }

  const runSuggestion = (s) => {
    setInput(s)
    setParams({ q: s }, { replace: true })
  }

  const clear = () => {
    setInput('')
    setQuery('')
    setType('')
    setParams({}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SearchIcon}
        title="Busca global"
        description="Procure de uma vez nas notícias, nas propostas de lei em andamento e no glossário."
        help="A busca encontra o trecho digitado no título ou no resumo, sem diferenciar acento nem maiúscula. Não usa sinônimos: “submarino” só encontra PROSUB se a palavra estiver no texto."
        breadcrumb={[{ label: 'Busca' }]}
      >
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <label htmlFor="busca-global" className="sr-only">O que você procura?</label>
            <input
              id="busca-global"
              type="search"
              name="q"
              enterKeyHint="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: submarino, fronteira, Marinha, ciberataque…"
              className="input pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
              autoComplete="off"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-gray-200"
                aria-label="Limpar busca"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary shrink-0 justify-center">Buscar</button>
        </form>
      </PageHeader>

      {/* SEM CONSULTA — sugestões e onde a busca procura, num cartão só */}
      {!query.trim() && (
        <section className="card p-5" aria-labelledby="sugestoes-busca">
          <h2 id="sugestoes-busca" className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Sparkles size={17} className="text-brand-400 dark:text-brand-300" aria-hidden="true" /> Não sabe por onde começar?
          </h2>
          <p className="mt-0.5 text-sm muted">Toque numa sugestão para ver o que o acervo tem sobre o assunto.</p>
          {suggestions.loading && !suggestions.data ? (
            <p className="mt-3 text-sm muted" role="status">Carregando sugestões…</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {(suggestions.data?.items || []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runSuggestion(s)}
                  className="min-h-[36px] rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gold-500/50 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-gray-200 pt-4 dark:border-white/10">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide muted">
              <Database size={14} aria-hidden="true" /> Onde a busca procura
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SEARCH_TYPES.filter((t) => !t.capability || can(t.capability)).map((t) => {
                const Icon = TYPE_ICONS[t.icon] || Compass
                return (
                  <li key={t.id}>
                    <Link
                      to={t.to}
                      className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-gray-500/5 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <Icon size={15} style={{ color: TYPE_COLOR[t.id] }} aria-hidden="true" />
                      {t.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* COM CONSULTA */}
      {query.trim() && (
        <>
          {/* Filtros por tipo */}
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo">
              <button
                type="button"
                onClick={() => setType('')}
                aria-pressed={type === ''}
                className={`min-h-[32px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  type === ''
                    ? 'bg-gold-500 text-military-darker'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                Tudo <span className="ml-1 tabular-nums opacity-80">{permitidos.length}</span>
              </button>
              {groups.map((g) => {
                const Icon = TYPE_ICONS[g.icon] || Compass
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setType(type === g.id ? '' : g.id)}
                    aria-pressed={type === g.id}
                    className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      type === g.id
                        ? 'bg-gold-500 text-military-darker'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={13} aria-hidden="true" /> {g.label}
                    <span className="tabular-nums opacity-80">{g.count}</span>
                  </button>
                )
              })}
            </div>
          )}

          <DataState
            loading={loading && !data}
            error={error}
            empty={items.length === 0}
            onRetry={refetch}
            skeleton={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
            emptyProps={{
              icon: SearchIcon,
              tone: 'filter',
              title: `Nada encontrado para “${query}”`,
              hint: 'Tente um trecho mais curto ou outra grafia. A busca procura o texto exato, sem sinônimos.',
              action: { label: 'Limpar busca', onClick: clear, icon: X },
            }}
          >
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <p className="text-sm muted" role="status">
                {plural(items.length, 'resultado')} para <strong className="text-gray-800 dark:text-gray-200">“{query}”</strong>
              </p>

              {grouped.map(({ meta, items: list }) => {
                const Icon = TYPE_ICONS[meta.icon] || Compass
                return (
                  <section key={meta.id}>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                      <Icon size={15} style={{ color: TYPE_COLOR[meta.id] }} aria-hidden="true" />
                      {meta.label}
                      <span className="tabular-nums">({list.length})</span>
                      <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" aria-hidden="true" />
                    </h2>
                    <ul className="space-y-2">
                      {list.map((item) => (
                        <li key={item.id}>
                          <ResultRow item={item} query={query} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          </DataState>
        </>
      )}
    </div>
  )
}

// ── Um resultado ─────────────────────────────────────────────────────────────
function ResultRow({ item, query }) {
  const color = TYPE_COLOR[item.type] || '#5c616a'
  // Notícia abre no veículo que a publicou; o resto, na tela que a mostra.
  const externo = !!item.href
  const Raiz = externo ? 'a' : Link
  const destino = externo
    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
    : { to: item.to }

  return (
    <Raiz
      {...destino}
      className="card flex items-start gap-3 p-4 transition-colors hover:border-gold-500/40"
    >
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-sm font-bold leading-snug tracking-tight">
            <Highlight text={item.title} query={query} />
          </h3>
          {item.badge && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urgencyMeta[item.badge] ? `border ${urgencyMeta[item.badge].classes}` : 'text-gray-800 dark:text-gray-200'}`}
              style={urgencyMeta[item.badge] ? undefined : { background: `${color}22` }}
            >
              {urgencyMeta[item.badge]?.label || item.badge}
            </span>
          )}
        </div>

        {item.subtitle && <p className="mt-0.5 text-xs muted">{item.subtitle}</p>}
        {item.snippet && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <Highlight text={item.snippet} query={query} />
          </p>
        )}

      </div>

      {externo ? (
        <>
          <ExternalLink size={15} className="mt-1 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="sr-only">(abre o site do veículo em nova aba)</span>
        </>
      ) : <ChevronRight size={16} className="mt-1 shrink-0 text-gray-400" aria-hidden="true" />}
    </Raiz>
  )
}
