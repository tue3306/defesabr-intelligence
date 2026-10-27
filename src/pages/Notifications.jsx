import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCheck, Inbox, Trash2, MailOpen, Mail, BellRing, X, RefreshCw, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import { ErrorState } from '../components/ui/DataState'
import { useNotificationStore } from '../store/notificationStore'
import { useCan } from '../auth/useCan'
import { timeAgo, formatDateTimeBR, formatDateBR, parseDate } from '../utils/dateUtils'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'read', label: 'Lidas' },
]

const TIPOS = [
  { id: 'noticia', label: 'Notícias' },
  { id: 'incidente', label: 'Incidentes' },
  { id: 'sistema', label: 'Sistema', capability: 'collection.monitor' },
]

const PER_PAGE = 20

// O que gera notificação — o mesmo que o servidor faz em lib/notificacoes.js.
const COMO_FUNCIONA = [
  {
    id: 'acervo',
    nome: 'Notícia de nível alto ou crítico',
    detalhe: 'A cada coleta (de 15 em 15 minutos), toda notícia de defesa aprovada com nível alto ou crítico, publicada nas últimas 48 horas, vira um aviso.',
  },
  {
    id: 'ciber',
    nome: 'Organização brasileira atacada',
    detalhe: 'Organização brasileira divulgada por um grupo criminoso de extorsão nas últimas 48 horas, com incidente crítico. Órgãos públicos aparecem marcados como tal.',
  },
  {
    id: 'sistema',
    nome: 'Falha de coleta',
    detalhe: 'Quando um coletor falha por inteiro. No máximo um aviso por coletor por dia.',
    capability: 'collection.monitor',
  },
]

/** Rótulo do grupo do dia: "Hoje", "Ontem" ou a data. */
function dayLabel(iso) {
  const d = parseDate(iso)
  const today = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000)
  if (diff <= 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `Há ${diff} dias`
  return formatDateBR(d)
}

const quando = (n) => n.eventAt || n.createdAt

// Botões segmentados (mesmo padrão de filtro das outras telas).
const segmento = (ativo, secundario = false) => `min-h-[36px] rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
  ativo
    ? (secundario ? 'bg-gray-200 text-gray-900 dark:bg-white/15 dark:text-white' : 'bg-gold-500 text-military-darker')
    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
}`
const iconeBotao = 'flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-400'

// -----------------------------------------------------------------------------
// CENTRAL DE NOTIFICAÇÕES — avisos gerados pelo servidor. O estado de leitura
// fica na conta: o que foi lido aqui aparece lido em qualquer navegador.
// -----------------------------------------------------------------------------
export default function Notifications() {
  const can = useCan()
  const items = useNotificationStore((s) => s.items)
  const unread = useNotificationStore((s) => s.unread)
  const carregado = useNotificationStore((s) => s.carregado)
  const carregando = useNotificationStore((s) => s.carregando)
  const erro = useNotificationStore((s) => s.erro)
  const carregar = useNotificationStore((s) => s.carregar)
  const marcarTodasLidas = useNotificationStore((s) => s.marcarTodasLidas)
  const marcarLida = useNotificationStore((s) => s.marcarLida)
  const marcarNaoLida = useNotificationStore((s) => s.marcarNaoLida)
  const dispensar = useNotificationStore((s) => s.dispensar)

  const [filter, setFilter] = useState('all')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)

  // Abrir a central traz o estado mais novo, sem esperar o próximo minuto.
  useEffect(() => { carregar() }, [carregar])

  const tipos = TIPOS.filter((t) => !t.capability || can(t.capability))

  const list = useMemo(() => {
    let l = items
    if (filter === 'unread') l = l.filter((n) => !n.read)
    if (filter === 'read') l = l.filter((n) => n.read)
    if (tipo) l = l.filter((n) => n.kind === tipo)
    return l
  }, [items, filter, tipo])

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  // Limitada ao total: em "Não lidas", marcar como lida tira o item da lista, e
  // a última página podia ficar vazia com notificações ainda nas anteriores.
  const current = Math.min(page, pages)
  const pageItems = list.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const grouped = useMemo(() => {
    const map = new Map()
    pageItems.forEach((n) => {
      const key = dayLabel(quando(n))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(n)
    })
    return [...map.entries()]
  }, [pageItems])

  const toggleRead = (n) => (n.read ? marcarNaoLida(n.id) : marcarLida(n.id))

  const remove = (n) => {
    dispensar(n.id)
    toast.success('Notificação removida da sua central')
  }

  const clearFilters = () => { setFilter('all'); setTipo(''); setPage(1) }
  const hasFilters = filter !== 'all' || !!tipo

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Bell}
        title="Notificações"
        description="Avisos de notícias urgentes e de ataques a organizações brasileiras, gerados a cada coleta."
        breadcrumb={[{ label: 'Conta' }, { label: 'Notificações' }]}
        meta={[
          { label: 'Total', value: String(items.length) },
          { label: 'Não lidas', value: String(unread) },
        ]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => carregar()} disabled={carregando} className="btn-ghost text-sm">
              <RefreshCw size={15} className={carregando ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </button>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => { marcarTodasLidas(); toast.success('Todas marcadas como lidas') }}
                className="btn-ghost text-sm"
              >
                <CheckCheck size={16} aria-hidden="true" /> Marcar todas como lidas
              </button>
            )}
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg border border-gray-300 p-0.5 dark:border-white/10" role="group" aria-label="Filtrar por leitura">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilter(f.id); setPage(1) }}
                aria-pressed={filter === f.id}
                className={segmento(filter === f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="inline-flex flex-wrap rounded-lg border border-gray-300 p-0.5 dark:border-white/10" role="group" aria-label="Filtrar por tipo">
            <button
              type="button"
              onClick={() => { setTipo(''); setPage(1) }}
              aria-pressed={tipo === ''}
              className={segmento(tipo === '', true)}
            >
              Todos os tipos
            </button>
            {tipos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTipo(t.id === tipo ? '' : t.id); setPage(1) }}
                aria-pressed={tipo === t.id}
                className={segmento(tipo === t.id, true)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-xs font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300">
              <X size={12} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
      </PageHeader>

      {erro && !carregado ? (
        <ErrorState title="Não foi possível carregar as notificações" error={erro} onRetry={carregar} />
      ) : !carregado ? (
        <p className="text-center text-sm muted" role="status">Carregando notificações…</p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          tone={hasFilters ? 'filter' : 'neutral'}
          title={hasFilters ? 'Nada corresponde a este filtro' : 'Nenhuma notificação por enquanto'}
          hint={hasFilters
            ? 'Troque o filtro de leitura ou de tipo para ver as outras.'
            : 'Os avisos chegam aqui quando a coleta traz notícia urgente ou ataque a organização brasileira.'}
          action={hasFilters
            ? { label: 'Limpar filtros', onClick: clearFilters, icon: X }
            : { label: 'Ir ao painel', to: '/painel' }}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, dayItems]) => (
            <section key={day}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider muted">
                {day}
                <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" aria-hidden="true" />
                <span className="tabular-nums">{dayItems.length}</span>
              </h2>
              <ul className="space-y-2">
                {dayItems.map((n) => (
                  <li key={n.id}>
                    <article
                      className={`card flex items-start gap-3 p-4 transition-colors hover:border-gold-500/40 ${
                        n.read ? 'opacity-65' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge type="urgency" value={n.level} />
                          {/* Texto junto do ponto: cor sozinha não informa. */}
                          {!n.read && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
                              <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden="true" /> não lida
                            </span>
                          )}
                        </div>
                        {/^https?:\/\//i.test(n.url || '') ? (
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => marcarLida(n.id)}
                            className="break-words font-medium leading-snug hover:text-brand-500 hover:underline dark:hover:text-brand-300"
                          >
                            {n.title}
                          </a>
                        ) : n.route ? (
                          <Link
                            to={n.route}
                            onClick={() => marcarLida(n.id)}
                            className="break-words font-medium leading-snug hover:text-brand-500 hover:underline dark:hover:text-brand-300"
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <p className="font-medium leading-snug">{n.title}</p>
                        )}
                        <p className="text-xs muted" title={formatDateTimeBR(quando(n))}>
                          {n.detail ? `${n.detail} · ` : ''}{timeAgo(quando(n))}
                        </p>
                      </div>
                      <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleRead(n)}
                          className={`${iconeBotao} hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-gray-200`}
                          aria-label={n.read ? 'Marcar como não lida' : 'Marcar como lida'}
                          title={n.read ? 'Marcar como não lida' : 'Marcar como lida'}
                        >
                          {n.read ? <Mail size={16} aria-hidden="true" /> : <MailOpen size={16} aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm(n)}
                          className={`${iconeBotao} hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400`}
                          aria-label="Remover notificação"
                          title="Remover notificação"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Pagination page={current} pages={pages} onChange={setPage} total={list.length} label="notificações" />
        </div>
      )}

      {/* Explicação recolhível: quem já sabe não precisa rolar por ela. */}
      <details className="card group p-0">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <BellRing size={16} className="shrink-0 text-brand-500 dark:text-brand-300" aria-hidden="true" />
          O que gera uma notificação?
          <ChevronRight size={15} className="ml-auto shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="border-t border-gray-200 px-5 py-4 dark:border-white/10">
          <ul className="space-y-3">
            {COMO_FUNCIONA.filter((c) => !c.capability || can(c.capability)).map((c) => (
              <li key={c.id}>
                <p className="text-sm font-semibold">{c.nome}</p>
                <p className="mt-0.5 text-sm leading-relaxed muted">{c.detalhe}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed muted">
            Não há envio por e-mail. Para não ser interrompido pelos avisos na tela (eles continuam
            registrados aqui), use{' '}
            <Link to="/configuracoes" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Configurações → Avisos na tela
            </Link>.
          </p>
        </div>
      </details>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove(confirm)}
        title="Remover notificação"
        description={confirm ? '“' + confirm.title + '” sai da sua central de notificações.' : ''}
        confirmLabel="Remover"
      />
    </div>
  )
}
