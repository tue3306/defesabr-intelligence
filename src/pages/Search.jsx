import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Newspaper, Landmark, Rss, X, ChevronRight, Database } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DataState from '../components/ui/DataState'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useResource } from '../hooks/useResource'
import { busca } from '../services'
import { formatDateBR } from '../utils/dateUtils'

const TIPOS = {
  noticia: { rotulo: 'Notícias', icone: Newspaper, cor: '#2e7d46' },
  proposicao: { rotulo: 'Legislativo', icone: Landmark, cor: '#c0392b' },
  fonte: { rotulo: 'Fontes', icone: Rss, cor: '#caa733' },
}

/** Realça as ocorrências da consulta dentro de um trecho. */
function Realce({ texto = '', consulta = '' }) {
  const termos = consulta.trim().split(/\s+/).filter((t) => t.length > 2)
  if (!termos.length) return texto
  // Escapa metacaracteres para que a consulta do usuário não vire regex.
  const escapados = termos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const partes = String(texto).split(new RegExp(`(${escapados.join('|')})`, 'gi'))
  const baixos = termos.map((t) => t.toLowerCase())
  return partes.map((p, i) =>
    baixos.includes(p.toLowerCase())
      ? <mark key={i} className="rounded bg-gold-500/25 px-0.5 text-inherit">{p}</mark>
      : <span key={i}>{p}</span>
  )
}

// -----------------------------------------------------------------------------
// BUSCA
//
// Percorre notícias, proposições e fontes no BANCO, com LIKE sobre os campos de
// texto. É suficiente para este volume — e a tela diz isso, em vez de sugerir
// uma capacidade semântica que não existe.
// -----------------------------------------------------------------------------
export default function Search() {
  const [params, setParams] = useSearchParams()
  const consultaUrl = params.get('q') || ''
  const [campo, setCampo] = useState(consultaUrl)
  const [consulta, setConsulta] = useState(consultaUrl)
  const [tipo, setTipo] = useState('')

  // A URL é a fonte da verdade: link de busca compartilhado reabre o resultado.
  useEffect(() => { setCampo(consultaUrl); setConsulta(consultaUrl) }, [consultaUrl])
  useEffect(() => {
    const t = setTimeout(() => setConsulta(campo), 300)
    return () => clearTimeout(t)
  }, [campo])

  const { data, loading, error, refetch } = useResource(
    () => busca.consultar(consulta),
    [consulta],
    { enabled: consulta.trim().length > 0, keepPreviousData: true }
  )

  const todos = data?.items || []
  const grupos = data?.groups || []
  const itens = tipo ? todos.filter((i) => i.type === tipo) : todos

  const agrupados = useMemo(() => {
    const mapa = new Map()
    itens.forEach((i) => {
      if (!mapa.has(i.type)) mapa.set(i.type, [])
      mapa.get(i.type).push(i)
    })
    return Object.keys(TIPOS).filter((t) => mapa.has(t)).map((t) => ({ tipo: t, itens: mapa.get(t) }))
  }, [itens])

  const enviar = (e) => {
    e.preventDefault()
    const q = campo.trim()
    setParams(q ? { q } : {}, { replace: true })
    setConsulta(q)
  }

  const limpar = () => { setCampo(''); setConsulta(''); setTipo(''); setParams({}, { replace: true }) }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SearchIcon}
        title="Busca"
        description="Procure ao mesmo tempo em notícias coletadas, proposições e fontes."
        help="Busca por texto no banco. Encontra o que já foi coletado — não é um buscador da internet."
        breadcrumb={[{ label: 'Busca' }]}
      >
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <label htmlFor="busca" className="sr-only">Buscar</label>
            <input
              id="busca"
              value={campo}
              onChange={(e) => setCampo(e.target.value)}
              placeholder="Ex.: Amazônia, fronteira, submarino, orçamento…"
              className="input pl-10 pr-10"
              autoComplete="off"
              autoFocus
            />
            {campo && (
              <button
                type="button"
                onClick={limpar}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                aria-label="Limpar busca"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary shrink-0 justify-center">Buscar</button>
        </form>
      </PageHeader>

      {!consulta.trim() ? (
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Database size={17} className="text-brand-400" /> O que a busca alcança
          </h2>
          <p className="mt-0.5 text-sm muted">
            Só o que já foi coletado e está no banco. Ela não consulta a internet.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Object.entries(TIPOS).map(([id, t]) => {
              const Icone = t.icone
              const destino = { noticia: '/clipping', proposicao: '/legislativo', fonte: '/fontes' }[id]
              return (
                <li key={id}>
                  <Link to={destino} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
                    <Icone size={15} style={{ color: t.cor }} />
                    <span>{t.rotulo}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <>
          {grupos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTipo('')}
                aria-pressed={tipo === ''}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tipo === '' ? 'bg-gold-500 text-military-darker'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
                }`}
              >
                Tudo <span className="ml-1 tabular-nums opacity-80">{todos.length}</span>
              </button>
              {grupos.map((g) => {
                const meta = TIPOS[g.id] || {}
                const Icone = meta.icone || SearchIcon
                return (
                  <button
                    key={g.id}
                    onClick={() => setTipo(tipo === g.id ? '' : g.id)}
                    aria-pressed={tipo === g.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      tipo === g.id ? 'bg-gold-500 text-military-darker'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icone size={13} /> {g.label}
                    <span className="tabular-nums opacity-80">{g.count}</span>
                  </button>
                )
              })}
            </div>
          )}

          <DataState
            loading={loading && !data}
            error={error}
            empty={todos.length === 0}
            onRetry={refetch}
            skeleton={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
            emptyProps={{
              icon: SearchIcon,
              tone: 'filter',
              title: `Nada encontrado para "${consulta}"`,
              hint: 'A busca encontra apenas o que já foi coletado. Tente um termo mais amplo.',
              action: { label: 'Limpar busca', onClick: limpar, icon: X },
            }}
          >
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <p className="text-sm muted">
                {itens.length} resultado(s) para <strong className="text-gray-900 dark:text-gray-100">"{consulta}"</strong>
              </p>

              {agrupados.map(({ tipo: t, itens: lista }) => {
                const meta = TIPOS[t]
                const Icone = meta.icone
                return (
                  <section key={t}>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                      <Icone size={15} style={{ color: meta.cor }} />
                      {meta.rotulo}
                      <span className="tabular-nums">({lista.length})</span>
                      <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                    </h2>
                    <ul className="space-y-2">
                      {lista.map((i) => (
                        <li key={i.id}>
                          <Link to={i.to} className="card flex items-start gap-3 p-4 transition-colors hover:border-gold-500/40">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.cor }} />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold leading-snug tracking-tight">
                                  <Realce texto={i.title} consulta={consulta} />
                                </span>
                                {i.badge && (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                    style={{ background: `${meta.cor}22`, color: meta.cor }}>
                                    {i.badge}
                                  </span>
                                )}
                              </span>
                              {i.subtitle && <span className="mt-0.5 block text-xs muted">{i.subtitle}</span>}
                              {i.snippet && (
                                <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                  <Realce texto={i.snippet} consulta={consulta} />
                                </span>
                              )}
                              {i.date && <span className="mt-1 block text-[11px] muted">{formatDateBR(i.date)}</span>}
                            </span>
                            <ChevronRight size={16} className="mt-1 shrink-0 text-gray-500" />
                          </Link>
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
