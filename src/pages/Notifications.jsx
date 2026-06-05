import { useState, useMemo } from 'react'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/ui/Badge'
import { useNewsStore } from '../store/newsStore'
import { URGENCY_LEVELS } from '../data/mockData'
import { urgencyMeta } from '../utils/textUtils'
import { timeAgo, formatDateTimeBR } from '../utils/dateUtils'

const FILTERS = [{ id: 'all', label: 'Todas' }, { id: 'unread', label: 'Não lidas' }]

export default function Notifications() {
  const notifications = useNewsStore((s) => s.notifications)
  const unread = useNewsStore((s) => s.unreadCount())
  const markAllRead = useNewsStore((s) => s.markAllRead)
  const markRead = useNewsStore((s) => s.markRead)

  const [filter, setFilter] = useState('all')
  const [level, setLevel] = useState('')

  const list = useMemo(() => {
    let l = notifications
    if (filter === 'unread') l = l.filter((n) => !n.read)
    if (level) l = l.filter((n) => n.level === level)
    return l
  }, [notifications, filter, level])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
              <Bell size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
              <p className="text-sm muted">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''} de ` : ''}
                {notifications.length} no total
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button onClick={() => { markAllRead(); toast.success('Todas marcadas como lidas') }} className="btn-ghost shrink-0">
              <CheckCheck size={16} /> Marcar todas como lidas
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-gray-600/40" />
          <button
            onClick={() => setLevel('')}
            aria-pressed={level === ''}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              level === '' ? 'bg-white/10 text-gray-100' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Todos os níveis
          </button>
          {URGENCY_LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv === level ? '' : lv)}
              aria-pressed={level === lv}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                level === lv ? 'bg-brand-500/20 text-brand-200' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {urgencyMeta[lv]?.label || lv}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox size={36} className="mx-auto mb-3 text-gray-600" />
          <p className="font-semibold">Nada por aqui</p>
          <p className="mt-1 text-sm muted">Nenhuma notificação corresponde a este filtro.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => markRead(n.id)}
                className={`card flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-brand-500/40 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <Badge type="urgency" value={n.level} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-100">{n.title}</span>
                  <span className="text-xs muted" title={formatDateTimeBR(n.time)}>{timeAgo(n.time)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400" title="Não lida" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
