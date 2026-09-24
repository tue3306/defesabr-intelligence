import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCheck, Inbox, Trash2, MailOpen, Mail, BellRing, X, RefreshCw,
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
  { id: 'noticia', label: 'Matérias' },
  { id: 'incidente', label: 'Incidentes' },
  { id: 'sistema', label: 'Sistema', capability: 'collection.monitor' },
]

const PER_PAGE = 20

// O que gera notificação — o mesmo que o servidor faz em lib/notificacoes.js.
const COMO_FUNCIONA = [
  {
    id: 'acervo',
    nome: 'Matéria de urgência alta ou crítica',
    detalhe: 'A cada coleta (a cada 15 minutos), cada matéria aprovada pelo filtro de relevância com urgência ALTA ou CRÍTICA publicada nas últimas 48 horas vira um aviso.',
  },
  {
    id: 'ciber',
    nome: 'Organização brasileira atacada',
    detalhe: 'Vítima brasileira com incidente crítico divulgado por grupo de extorsão nas últimas 48 horas. Órgãos do Estado aparecem marcados como tal.',
  },
  {
    id: 'sistema',
    nome: 'Falha de coleta',
    detalhe: 'Quando um coletor falha por inteiro — no máximo um aviso por coletor por dia.',
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

// -----------------------------------------------------------------------------
// CENTRAL DE NOTIFICAÇÕES
//
// Os avisos são gerados pelo servidor e o estado de leitura fica na conta: o
// que foi lido aqui aparece lido em qualquer navegador.
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
        description="Avisos gerados a cada coleta: matéria urgente e ataque a organização brasileira."
        breadcrumb={[{ label: 'Conta' }, { label: 'Notificações' }]}
        meta={[
          { label: 'Total', value: String(items.length) },
          { label: 'Não lidas', value: String(unread) },
        ]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button onClick={() => carregar()} disabled={carregando} className="btn-ghost text-sm">
              <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} /> Atualizar
            </button>
            {unread > 0 && (
              <button
                onClick={() => { marcarTodasLidas(); toast.success('Todas marcadas como lidas') }}
                className="btn-ghost text-sm"
              >
                <CheckCheck size={16} /> Marcar todas como lidas
              </button>
            )}
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1) }}
              aria-pressed={filter === f.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-gold-500 text-military-darker'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-gray-300 dark:bg-gray-600/40 sm:block" />

          <button
            onClick={() => { setTipo(''); setPage(1) }}
            aria-pressed={tipo === ''}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              tipo === '' ? 'bg-gray-200 text-gray-800 dark:bg-white/10 dark:text-gray-100' : 'muted hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Todos os tipos
          </button>
          {tipos.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTipo(t.id === tipo ? '' : t.id); setPage(1) }}
              aria-pressed={tipo === t.id}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                tipo === t.id ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'muted hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}

          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold muted hover:text-brand-400 dark:text-brand-300">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </PageHeader>

      {erro && !carregado ? (
        <ErrorState title="Não foi possível carregar as notificações" error={erro} onRetry={carregar} />
      ) : !carregado ? (
        <p className="text-center text-sm muted">Carregando notificações…</p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          tone={hasFilters ? 'filter' : 'neutral'}
          title={hasFilters ? 'Nada corresponde a este filtro' : 'Nenhuma notificação por enquanto'}
          hint={hasFilters
            ? 'Ajuste o estado de leitura ou o tipo.'
            : 'Os avisos entram aqui quando a coleta traz matéria urgente ou ataque a organização brasileira.'}
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
                <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
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
                      <span className="mt-0.5 shrink-0">
                        <Badge type="urgency" value={n.level} />
                      </span>
                      <div className="min-w-0 flex-1">
                        {/^https?:\/\//i.test(n.url || '') ? (
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => marcarLida(n.id)}
                            className="font-medium leading-snug hover:text-brand-500 hover:underline dark:hover:text-brand-300"
                          >
                            {n.title}
                          </a>
                        ) : n.route ? (
                          <Link
                            to={n.route}
                            onClick={() => marcarLida(n.id)}
                            className="font-medium leading-snug hover:text-brand-500 hover:underline dark:hover:text-brand-300"
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
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Um ponto dourado sozinho não diz nada a quem não o
                            distingue do fundo, nem a leitor de tela. */}
                        {!n.read && (
                          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
                            <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden="true" /> não lida
                          </span>
                        )}
                        <button
                          onClick={() => toggleRead(n)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
                          aria-label={n.read ? 'Marcar como não lida' : 'Marcar como lida'}
                          title={n.read ? 'Marcar como não lida' : 'Marcar como lida'}
                        >
                          {n.read ? <Mail size={15} /> : <MailOpen size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirm(n)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          aria-label="Remover notificação"
                          title="Remover notificação"
                        >
                          <Trash2 size={15} />
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

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <BellRing size={18} className="text-brand-400 dark:text-brand-300" /> O que gera notificação
        </h2>
        <ul className="mt-3 space-y-2">
          {COMO_FUNCIONA.filter((c) => !c.capability || can(c.capability)).map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <p className="text-sm font-semibold">{c.nome}</p>
              <p className="mt-0.5 text-xs leading-relaxed muted">{c.detalhe}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed muted">
          Não há envio por e-mail. Para não ser interrompido pelos avisos na tela — eles continuam
          registrados aqui —, use{' '}
          <Link to="/configuracoes" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Configurações → Avisos na tela
          </Link>.
        </p>
      </section>

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
