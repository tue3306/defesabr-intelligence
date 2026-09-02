import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCheck, Inbox, Trash2, MailOpen, Mail, SlidersHorizontal,
  BellRing, Plus, Lock, X, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import Can from '../auth/Can'
import { useNewsStore } from '../store/newsStore'
import { URGENCY_LEVELS, CATEGORIES } from '../data/mockData'
import { urgencyMeta } from '../utils/textUtils'
import { timeAgo, formatDateTimeBR, formatDateBR, parseDate } from '../utils/dateUtils'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'read', label: 'Lidas' },
]

const PER_PAGE = 20

// Regras de alerta demonstrativas — o que o assinante configuraria para ser
// avisado sem precisar abrir a plataforma.
const SEED_RULES = [
  {
    id: 'rule-1',
    name: 'Elevação da postura nacional',
    trigger: 'Quando o nível de alerta subir para ALERTA ou CRÍTICO',
    channel: 'E-mail + painel',
    active: true,
  },
  {
    id: 'rule-2',
    name: 'Ocorrências em Fronteiras',
    trigger: 'Nova ocorrência de urgência ALTA na categoria Fronteiras',
    channel: 'Painel',
    active: true,
  },
  {
    id: 'rule-3',
    name: 'Marcos de programas estratégicos',
    trigger: 'Entrega ou atraso registrado em PROSUB, FX-2 ou Tamandaré',
    channel: 'E-mail semanal',
    active: false,
  },
]

const CHANNELS = ['Painel', 'E-mail + painel', 'E-mail semanal']

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
// Duas camadas: o HISTÓRICO do que já chegou (agrupado por dia, porque é assim
// que se relê um período) e as REGRAS que determinam o que deve chegar — esta
// última é o que separa um feed passivo de um sistema de alerta.
// -----------------------------------------------------------------------------
export default function Notifications() {
  const notifications = useNewsStore((s) => s.notifications)
  const markAllRead = useNewsStore((s) => s.markAllRead)
  const markRead = useNewsStore((s) => s.markRead)

  const [filter, setFilter] = useState('all')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)
  const [ruleModal, setRuleModal] = useState(false)
  const [rules, setRules] = useState(SEED_RULES)
  // O store não expõe "excluir" nem "marcar como não lida"; ambos vivem aqui
  // como estado local até existir um backend de notificações.
  const [dismissed, setDismissed] = useState([])
  const [forcedUnread, setForcedUnread] = useState([])

  const visible = useMemo(
    () => notifications
      .filter((n) => !dismissed.includes(n.id))
      .map((n) => ({ ...n, read: forcedUnread.includes(n.id) ? false : n.read })),
    [notifications, dismissed, forcedUnread]
  )

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
    if (n.read) {
      setForcedUnread((prev) => [...prev, n.id])
      toast('Marcada como não lida', { icon: '📩' })
    } else {
      setForcedUnread((prev) => prev.filter((id) => id !== n.id))
      markRead(n.id)
    }
  }

  const remove = (n) => {
    setDismissed((prev) => [...prev, n.id])
    toast.success('Notificação removida')
  }

  const clearFilters = () => { setFilter('all'); setLevel(''); setPage(1) }
  const hasFilters = filter !== 'all' || !!level

  const toggleRule = (rule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)))
    toast.success(rule.active ? `Regra pausada: ${rule.name}` : `Regra ativada: ${rule.name}`)
  }

  const addRule = (rule) => {
    setRules((prev) => [{ ...rule, id: `rule-${prev.length + 1}-local`, active: true }, ...prev])
    setRuleModal(false)
    toast.success('Regra de alerta criada')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Bell}
        title="Notificações"
        description="Tudo o que a plataforma sinalizou, agrupado por dia — e as regras que determinam o que chega até você."
        breadcrumb={[{ label: 'Conta' }, { label: 'Notificações' }]}
        meta={[
          { label: 'Total', value: String(visible.length) },
          { label: 'Não lidas', value: String(unread) },
        ]}
        actions={
          unread > 0 ? (
            <button
              onClick={() => { markAllRead(); setForcedUnread([]); toast.success('Todas marcadas como lidas') }}
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
            : 'Os alertas do monitoramento aparecem aqui assim que chegarem.'}
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

      {/* REGRAS DE ALERTA */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <BellRing size={18} className="text-brand-400 dark:text-brand-300" /> Regras de alerta
            </h2>
            <p className="mt-0.5 text-sm muted">
              Defina o que merece interromper o seu dia — o resto fica no histórico.
            </p>
          </div>
          <Can do="alerts.custom">
            <button onClick={() => setRuleModal(true)} className="btn-ghost text-sm">
              <Plus size={15} /> Nova regra
            </button>
          </Can>
        </div>

        <Can
          do="alerts.custom"
          fallback={
            <EmptyState
              icon={Lock}
              tone="locked"
              title="Alertas personalizados no plano Profissional"
              hint="Crie regras para ser avisado quando a postura nacional subir, quando houver ocorrência grave numa área monitorada ou quando um programa estratégico mudar de status."
              action={{ label: 'Ver planos', to: '/planos' }}
              compact
            />
          }
        >
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{rule.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed muted">{rule.trigger}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] muted">
                    <SlidersHorizontal size={11} /> {rule.channel}
                  </p>
                </div>
                <button
                  onClick={() => toggleRule(rule)}
                  aria-pressed={rule.active}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    rule.active
                      ? 'bg-military-green/15 text-emerald-800 dark:text-emerald-300'
                      : 'border border-gray-300 text-gray-500 dark:border-white/10 dark:text-gray-400'
                  }`}
                >
                  {rule.active ? 'Ativa' : 'Pausada'}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs muted">
            O disparo por e-mail depende de backend. Neste ambiente as regras ficam registradas e
            os alertas aparecem no painel.{' '}
            <Link to="/configuracoes" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
              Preferências de notificação
            </Link>
          </p>
        </Can>
      </section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove(confirm)}
        title="Excluir notificação"
        description={confirm ? `“${confirm.title}” será removida da sua central. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
      />

      <RuleModal open={ruleModal} onClose={() => setRuleModal(false)} onCreate={addRule} />
    </div>
  )
}

// ── Criação de regra de alerta ───────────────────────────────────────────────
function RuleModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', category: CATEGORIES[0], level: 'ALTO', channel: CHANNELS[0] })
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Dê um nome à regra para reconhecê-la depois.'); return }
    onCreate({
      name: form.name.trim(),
      trigger: `Nova ocorrência de urgência ${urgencyMeta[form.level]?.label || form.level} na categoria ${form.category}`,
      channel: form.channel,
    })
    setForm({ name: '', category: CATEGORIES[0], level: 'ALTO', channel: CHANNELS[0] })
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova regra de alerta" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="regra-nome" className="mb-1 block text-xs font-medium muted">Nome da regra</label>
          <input
            id="regra-nome"
            className="input"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setError('') }}
            placeholder="Ex.: Ocorrências graves na Amazônia Azul"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="regra-categoria" className="mb-1 block text-xs font-medium muted">Área monitorada</label>
            <select
              id="regra-categoria"
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="regra-nivel" className="mb-1 block text-xs font-medium muted">Urgência mínima</label>
            <select
              id="regra-nivel"
              className="input"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
            >
              {URGENCY_LEVELS.map((l) => (
                <option key={l} value={l}>{urgencyMeta[l]?.label || l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="regra-canal" className="mb-1 block text-xs font-medium muted">Canal de entrega</label>
          <select
            id="regra-canal"
            className="input"
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
          >
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && <p role="alert" className="text-sm text-red-800 dark:text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost justify-center">Cancelar</button>
          <button type="submit" className="btn-primary justify-center"><Plus size={15} /> Criar regra</button>
        </div>
      </form>
    </Modal>
  )
}
