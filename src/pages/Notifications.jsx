import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCheck, Inbox, Trash2, MailOpen, Mail, BellRing, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import { useNewsStore } from '../store/newsStore'
import { URGENCY_LEVELS } from '../data/mockData'
import { urgencyMeta } from '../utils/textUtils'
import { timeAgo, formatDateTimeBR, formatDateBR, parseDate } from '../utils/dateUtils'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'read', label: 'Lidas' },
]

const PER_PAGE = 20

// ─────────────────────────────────────────────────────────────────────────────
// O QUE GERA NOTIFICAÇÃO
//
// Havia três regras semeadas com canal "E-mail + painel" e um botão "Nova
// regra" que abria um formulário completo — nome, área, urgência, canal — para
// no fim avisar que nada tinha sido gravado. Não há motor de regras nem envio
// de e-mail. O que existe está descrito abaixo, e é real.
// ─────────────────────────────────────────────────────────────────────────────
const COMO_FUNCIONA = [
  {
    id: 'acervo',
    nome: 'Matéria de urgência alta ou crítica',
    detalhe: 'Enquanto a plataforma está aberta, o acervo é consultado a cada 5 minutos; matéria nova com urgência ALTA ou CRÍTICA vira notificação.',
  },
  {
    id: 'ciber',
    nome: 'Organização brasileira atacada',
    detalhe: 'Vítima brasileira divulgada por grupo de extorsão nas últimas 48 horas. Órgãos do Estado aparecem marcados como tal.',
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

// -----------------------------------------------------------------------------
// CENTRAL DE NOTIFICAÇÕES
//
// O histórico do que chegou, agrupado por dia, e a descrição do que gera aviso.
// Fica neste navegador: é um registro local, e sair da conta o apaga.
// -----------------------------------------------------------------------------
export default function Notifications() {
  const notifications = useNewsStore((s) => s.notifications)
  const markAllRead = useNewsStore((s) => s.markAllRead)
  const markRead = useNewsStore((s) => s.markRead)
  const markUnread = useNewsStore((s) => s.markUnread)
  const removeNotification = useNewsStore((s) => s.removeNotification)

  const [filter, setFilter] = useState('all')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)

  const visible = notifications

  const unread = visible.filter((n) => !n.read).length

  const list = useMemo(() => {
    let l = visible
    if (filter === 'unread') l = l.filter((n) => !n.read)
    if (filter === 'read') l = l.filter((n) => n.read)
    if (level) l = l.filter((n) => n.level === level)
    return l
  }, [visible, filter, level])

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const pageItems = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Agrupa a página atual por dia, preservando a ordem recebida.
  const grouped = useMemo(() => {
    const map = new Map()
    pageItems.forEach((n) => {
      const key = dayLabel(n.time)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(n)
    })
    return [...map.entries()]
  }, [pageItems])

  const toggleRead = (n) => {
    if (n.read) markUnread(n.id)
    else markRead(n.id)
  }

  const remove = (n) => {
    removeNotification(n.id)
    toast.success('Notificação removida')
  }

  const clearFilters = () => { setFilter('all'); setLevel(''); setPage(1) }
  const hasFilters = filter !== 'all' || !!level

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Bell}
        title="Notificações"
        description="O que a plataforma sinalizou enquanto você a usava, agrupado por dia."
        breadcrumb={[{ label: 'Conta' }, { label: 'Notificações' }]}
        meta={[
          { label: 'Total', value: String(visible.length) },
          { label: 'Não lidas', value: String(unread) },
        ]}
        actions={
          unread > 0 ? (
            <button
              onClick={() => { markAllRead(); toast.success('Todas marcadas como lidas') }}
              className="btn-ghost text-sm"
            >
              <CheckCheck size={16} /> Marcar todas como lidas
            </button>
          ) : null
        }
      >
        {/* FILTROS */}
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
            onClick={() => { setLevel(''); setPage(1) }}
            aria-pressed={level === ''}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              level === '' ? 'bg-white/10 text-gray-800 dark:text-gray-100' : 'muted hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Todos os níveis
          </button>
          {URGENCY_LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => { setLevel(lv === level ? '' : lv); setPage(1) }}
              aria-pressed={level === lv}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                level === lv ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400' : 'muted hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {urgencyMeta[lv]?.label || lv}
            </button>
          ))}

          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold muted hover:text-brand-400 dark:text-brand-300">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </PageHeader>

      {/* LISTA AGRUPADA POR DIA */}
      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          tone={hasFilters ? 'filter' : 'neutral'}
          title={hasFilters ? 'Nada corresponde a este filtro' : 'Nenhuma notificação por enquanto'}
          hint={hasFilters
            ? 'Ajuste o estado de leitura ou o nível de urgência.'
            : 'Avisos entram aqui quando a coleta traz matéria urgente ou ataque a organização brasileira enquanto a plataforma está aberta.'}
          action={hasFilters
            ? { label: 'Limpar filtros', onClick: clearFilters, icon: X }
            : { label: 'Ir ao painel', to: '/painel' }}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider muted">
                {day}
                <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                <span className="tabular-nums">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((n) => (
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
                        <p className="font-medium leading-snug">{n.title}</p>
                        <p className="text-xs muted" title={formatDateTimeBR(n.time)}>{timeAgo(n.time)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!n.read && <span className="mr-1 h-2 w-2 rounded-full bg-gold-500" title="Não lida" />}
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
                          aria-label="Excluir notificação"
                          title="Excluir notificação"
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

          <Pagination page={page} pages={pages} onChange={setPage} total={list.length} label="notificações" />
        </div>
      )}

      {/* O QUE GERA NOTIFICAÇÃO */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <BellRing size={18} className="text-brand-400 dark:text-brand-300" /> O que gera notificação
        </h2>
        <ul className="mt-3 space-y-2">
          {COMO_FUNCIONA.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <p className="text-sm font-semibold">{c.nome}</p>
              <p className="mt-0.5 text-xs leading-relaxed muted">{c.detalhe}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed muted">
          Não há regra personalizada nem envio por e-mail. Para não ser interrompido pelos avisos na
          tela — eles continuam registrados aqui —, use{' '}
          <Link to="/configuracoes" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Configurações → Avisos na tela
          </Link>.
        </p>
      </section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove(confirm)}
        title="Excluir notificação"
        description={confirm ? '“' + confirm.title + '” sai da sua central de notificações.' : ''}
        confirmLabel="Excluir"
      />

    </div>
  )
}
