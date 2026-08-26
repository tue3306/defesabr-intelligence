import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search as SearchIcon, Newspaper, Layers, ShieldAlert, Target, Radio,
  BadgeCheck, CalendarDays, Landmark, Archive, BookOpen, Compass,
  Lock, X, ArrowRight, Sparkles, Database, ChevronRight,
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

// Os tipos declaram o ícone por nome (dado puro); aqui ligamos ao componente.
const TYPE_ICONS = {
  Newspaper, Layers, ShieldAlert, Target, Radio, BadgeCheck,
  CalendarDays, Landmark, Archive, BookOpen, Compass,
}

const TYPE_COLOR = {
  noticia: '#2e7d46',
  dossie: '#8b5cf6',
  risco: '#c0392b',
  programa: '#475569',
  narrativa: '#d4841a',
  fonte: '#caa733',
  evento: '#64748b',
  proposicao: '#c0392b',
  clipping: '#2e7d46',
  termo: '#8b5cf6',
  modulo: '#5c616a',
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
// BUSCA GLOBAL
//
// Uma pergunta de inteligência raramente respeita a divisão por módulo: quem
// busca "Essequibo" quer o dossiê, o risco, a narrativa e o evento de agenda
// juntos. Resultados fora do alcance do perfil aparecem marcados — a busca
// informa que a informação existe, em vez de fingir que não.
// -----------------------------------------------------------------------------
export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
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
    () => searchService.query({ q: query, types: type || undefined }),
    [query, type],
    { enabled: query.trim().length > 0, keepPreviousData: true }
  )

  const suggestions = useResource(() => searchService.suggestions(), [])

  const items = data?.items || []
  const groups = data?.groups || []

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

  const blocked = items.filter((i) => i.capability && !can(i.capability)).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SearchIcon}
        title="Busca global"
        description="Procure em todos os módulos ao mesmo tempo — notícias, dossiês, riscos, programas, narrativas, fontes, agenda, legislativo e glossário."
        help="A busca entende termos relacionados do domínio: procurar por “submarino” também encontra PROSUB e conteúdo naval."
        breadcrumb={[{ label: 'Busca' }]}
        meta={[{ label: 'Índice', value: `${data?.indexed ?? searchService.indexSize()} registros` }]}
      >
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <label htmlFor="busca-global" className="sr-only">Buscar em todos os módulos</label>
            <input
              id="busca-global"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: Essequibo, PROSUB, garimpo ilegal, FIMI, ciberataque…"
              className="input pl-10 pr-10"
              autoComplete="off"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary shrink-0 justify-center">Buscar</button>
        </form>
      </PageHeader>

      {/* SEM CONSULTA — sugestões que demonstram o alcance do índice */}
      {!query.trim() && (
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Sparkles size={17} className="text-brand-400" /> Comece por aqui
            </h2>
            <p className="mt-0.5 text-sm muted">Consultas que atravessam vários módulos de uma vez.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(suggestions.data?.items || []).map((s) => (
                <button
                  key={s}
                  onClick={() => runSuggestion(s)}
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gold-500/50 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Database size={17} className="text-brand-400" /> O que é indexado
            </h2>
            <p className="mt-0.5 text-sm muted">
              Cada domínio da plataforma entra no mesmo índice, com pesos por campo.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {SEARCH_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t.icon] || Compass
                const locked = t.capability && !can(t.capability)
                return (
                  <li key={t.id}>
                    <Link
                      to={locked ? '/planos' : t.to}
                      className={`flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${locked ? 'opacity-60' : ''}`}
                    >
                      <Icon size={15} style={{ color: TYPE_COLOR[t.id] }} />
                      <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      {locked && <Lock size={11} className="shrink-0 text-gold-500" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {/* COM CONSULTA */}
      {query.trim() && (
        <>
          {/* Filtros por tipo */}
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setType('')}
                aria-pressed={type === ''}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  type === ''
                    ? 'bg-gold-500 text-military-darker'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                Tudo <span className="ml-1 tabular-nums opacity-80">{items.length}</span>
              </button>
              {groups.map((g) => {
                const Icon = TYPE_ICONS[g.icon] || Compass
                return (
                  <button
                    key={g.id}
                    onClick={() => setType(type === g.id ? '' : g.id)}
                    aria-pressed={type === g.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      type === g.id
                        ? 'bg-gold-500 text-military-darker'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={13} /> {g.label}
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
              hint: 'Tente um termo mais amplo, o nome de um programa (PROSUB, Gripen) ou uma região (Amazônia, Atlântico Sul).',
              action: { label: 'Limpar busca', onClick: clear, icon: X },
            }}
          >
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <p className="text-sm muted">
                {items.length} resultado(s) para <strong className="text-gray-800 dark:text-gray-200">“{query}”</strong>
                {blocked > 0 && (
                  <span className="text-gold-600 dark:text-gold-400">
                    {' '}· {blocked} exige{blocked > 1 ? 'm' : ''} um plano ou perfil superior
                  </span>
                )}
              </p>

              {grouped.map(({ meta, items: list }) => {
                const Icon = TYPE_ICONS[meta.icon] || Compass
                return (
                  <section key={meta.id}>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                      <Icon size={15} style={{ color: TYPE_COLOR[meta.id] }} />
                      {meta.label}
                      <span className="tabular-nums">({list.length})</span>
                      <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                    </h2>
                    <ul className="space-y-2">
                      {list.map((item) => (
                        <li key={item.id}>
                          <ResultRow item={item} query={query} allowed={!item.capability || can(item.capability)} />
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
function ResultRow({ item, query, allowed }) {
  const color = TYPE_COLOR[item.type] || '#5c616a'
  const to = allowed ? item.to : '/planos'

  return (
    <Link
      to={to}
      className={`card flex items-start gap-3 p-4 transition-colors hover:border-gold-500/40 ${allowed ? '' : 'opacity-75'}`}
    >
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold leading-snug tracking-tight">
            <Highlight text={item.title} query={query} />
          </h3>
          {item.badge && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: `${color}22`, color }}
            >
              {item.badge}
            </span>
          )}
          {!allowed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-600 dark:text-gold-400">
              <Lock size={9} /> bloqueado
            </span>
          )}
        </div>

        {item.subtitle && <p className="mt-0.5 text-xs muted">{item.subtitle}</p>}
        {item.snippet && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <Highlight text={item.snippet} query={query} />
          </p>
        )}

        {!allowed && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gold-600 dark:text-gold-400">
            Ver como desbloquear <ArrowRight size={11} />
          </p>
        )}
      </div>

      <ChevronRight size={16} className="mt-1 shrink-0 text-gray-400" />
    </Link>
  )
}
