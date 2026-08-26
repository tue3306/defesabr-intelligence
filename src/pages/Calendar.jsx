import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, List, LayoutGrid, ChevronLeft, ChevronRight, Filter, X,
  Download, MapPin, CalendarClock, CalendarCheck, Crosshair, Building2,
  Landmark, Globe2, Flag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchBar from '../components/ui/SearchBar'
import TagFilter from '../components/ui/TagFilter'
import Can from '../auth/Can'
import { useResource } from '../hooks/useResource'
import { intelligenceService } from '../services'
import { REFERENCE_DATE } from '../services/config'
import { CAL_TYPES } from '../data/strategicCalendar'
import { exportCSV } from '../utils/exportUtils'
import { formatDateBR, formatMonthYear, deadlineLabel, parseDate, MESES, DIAS } from '../utils/dateUtils'

// Os tipos declaram o ícone por nome (dado puro); aqui ligamos ao componente.
const TYPE_ICONS = { Crosshair, Building2, Landmark, Globe2, Flag }

// A agenda distingue passado de futuro a partir da data de referência do
// conjunto demonstrativo (services/config), não do relógio do navegador.
const TODAY = REFERENCE_DATE

const WEEKDAYS = DIAS.map((d) => d.slice(0, 3).toUpperCase())

// -----------------------------------------------------------------------------
// CALENDÁRIO ESTRATÉGICO
//
// Duas leituras da mesma agenda, porque servem a perguntas diferentes:
//   • LISTA  → "o que vem por aí?" (planejamento, ordem cronológica)
//   • GRADE  → "como está o mês?" (densidade, sobreposição de eventos)
// -----------------------------------------------------------------------------
export default function StrategicCalendar() {
  const { data, loading, error, refetch } = useResource(() => intelligenceService.calendar(), [])

  const [view, setView] = useState('lista') // 'lista' | 'grade'
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState([])
  const [cursor, setCursor] = useState(() => {
    const d = parseDate(TODAY)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [openEvent, setOpenEvent] = useState(null)

  const events = data?.items || []

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter((e) => {
      if (types.length && !types.includes(CAL_TYPES[e.type]?.label)) return false
      if (needle && !`${e.title} ${e.desc} ${e.scope}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [events, query, types])

  const upcoming = filtered.filter((e) => e.date >= TODAY)
  const past = filtered.filter((e) => e.date < TODAY)

  // Agrupamento por mês, preservando a ordem cronológica.
  const byMonth = useMemo(() => {
    const map = new Map()
    filtered.forEach((e) => {
      const key = e.date.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const hasFilters = !!(query || types.length)
  const clearFilters = () => { setQuery(''); setTypes([]) }

  const shiftMonth = (delta) => {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const exportAgenda = () => {
    exportCSV(
      filtered.map((e) => ({
        Data: formatDateBR(e.date),
        Evento: e.title,
        Tipo: CAL_TYPES[e.type]?.label || e.type,
        Escopo: e.scope,
        Descrição: e.desc,
      })),
      `agenda-estrategica-${new Date().toISOString().slice(0, 10)}.csv`
    )
    toast.success(`${filtered.length} evento(s) exportado(s) em CSV`)
  }

  const nextEvent = upcoming[0]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Calendário Estratégico"
        description="Exercícios militares, marcos de programas, feiras da base industrial, prazos legislativos e agenda diplomática que afetam a defesa brasileira."
        help="A agenda antecipa janelas de decisão: um marco de programa ou uma votação de orçamento muda o quadro tanto quanto um evento de segurança."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Calendário Estratégico' }]}
        badges={<Badge type="demo" />}
        actions={
          <>
            <div className="flex rounded-lg border border-gray-300 p-0.5 dark:border-white/10" role="group" aria-label="Modo de visualização">
              <ViewButton active={view === 'lista'} onClick={() => setView('lista')} icon={List} label="Lista" />
              <ViewButton active={view === 'grade'} onClick={() => setView('grade')} icon={LayoutGrid} label="Grade" />
            </div>
            <Can do="reports.export">
              <button onClick={exportAgenda} className="btn-ghost text-sm" disabled={!filtered.length}>
                <Download size={15} /> CSV
              </button>
            </Can>
          </>
        }
      />

      {/* INDICADORES */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={CalendarDays} label="Eventos na agenda" value={String(events.length || '—')} hint="no horizonte monitorado" accent="brand" />
        <MetricCard icon={CalendarClock} label="Ainda por vir" value={String(upcoming.length)} hint={`referência ${formatDateBR(TODAY)}`} accent="amber" />
        <MetricCard icon={CalendarCheck} label="Já realizados" value={String(past.length)} hint="registro histórico" accent="green" />
        <MetricCard
          icon={Flag}
          label="Próximo marco"
          value={nextEvent ? deadlineLabel(nextEvent.date, TODAY) : '—'}
          hint={nextEvent ? nextEvent.title.slice(0, 34) : 'nenhum evento futuro'}
          accent="brand"
        />
      </div>

      {/* FILTROS */}
      <section className="card space-y-4 p-5">
        <SearchBar placeholder="Buscar evento, escopo ou descrição…" defaultValue={query} onChange={setQuery} />
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted">
            <Filter size={13} /> Tipos de evento
          </p>
          <TagFilter
            options={Object.values(CAL_TYPES).map((t) => t.label)}
            selected={types}
            getColor={(label) => Object.values(CAL_TYPES).find((t) => t.label === label)?.color || '#64748b'}
            onToggle={(t) => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
          />
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
            <p className="text-sm muted">{filtered.length} de {events.length} evento(s)</p>
            <button onClick={clearFilters} className="btn-ghost px-2.5 py-1 text-xs">
              <X size={13} /> Limpar filtros
            </button>
          </div>
        )}
      </section>

      <DataState
        loading={loading}
        error={error}
        empty={filtered.length === 0}
        onRetry={refetch}
        skeletonCount={3}
        emptyProps={{
          icon: CalendarDays,
          tone: 'filter',
          title: hasFilters ? 'Nenhum evento corresponde aos filtros' : 'Agenda vazia',
          hint: hasFilters ? 'Ajuste a busca ou os tipos de evento.' : 'Nenhum evento estratégico cadastrado.',
          action: hasFilters ? { label: 'Limpar filtros', onClick: clearFilters, icon: X } : undefined,
        }}
      >
        {view === 'lista' ? (
          <div className="space-y-6">
            {byMonth.map(([key, list]) => (
              <section key={key}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide muted">
                  <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                  {formatMonthYear(`${key}-01`)}
                  <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                </h2>
                <ul className="space-y-2">
                  {list.map((e) => (
                    <li key={e.id}>
                      <EventRow event={e} onOpen={() => setOpenEvent(e)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <MonthGrid
            cursor={cursor}
            events={filtered}
            onShift={shiftMonth}
            onOpen={setOpenEvent}
          />
        )}
      </DataState>

      {/* LEGENDA */}
      <section className="card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">Tipos de evento</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CAL_TYPES).map(([id, t]) => {
            const Icon = TYPE_ICONS[t.icon] || Flag
            return (
              <span key={id} className="inline-flex items-center gap-1.5 text-xs">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded"
                  style={{ background: `${t.color}22`, color: t.color }}
                >
                  <Icon size={11} />
                </span>
                <span className="muted">{t.label}</span>
              </span>
            )
          })}
        </div>
      </section>

      <p className="text-center text-xs muted">
        Agenda demonstrativa — datas ilustrativas, sem valor oficial.
      </p>

      <Modal open={!!openEvent} onClose={() => setOpenEvent(null)} title={openEvent?.title} maxWidth="max-w-lg">
        {openEvent && <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />}
      </Modal>
    </div>
  )
}

function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? 'bg-gold-500 text-military-darker' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

// ── Linha de evento (visão lista) ────────────────────────────────────────────
function EventRow({ event: e, onOpen }) {
  const meta = CAL_TYPES[e.type] || {}
  const Icon = TYPE_ICONS[meta.icon] || Flag
  const isPast = e.date < TODAY
  const d = parseDate(e.date)

  return (
    <button
      onClick={onOpen}
      className={`card flex w-full items-start gap-4 p-4 text-left transition-colors hover:border-gold-500/40 ${isPast ? 'opacity-60' : ''}`}
    >
      {/* Bloco de data */}
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5" style={{ background: `${meta.color}18` }}>
        <span className="font-mono text-xl font-extrabold leading-none tabular-nums" style={{ color: meta.color }}>
          {String(d.getDate()).padStart(2, '0')}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide muted">{MESES[d.getMonth()].slice(0, 3)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: `${meta.color}22`, color: meta.color }}
          >
            <Icon size={10} /> {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] muted">
            <MapPin size={11} /> {e.scope}
          </span>
          <span className={`ml-auto text-[11px] font-semibold ${isPast ? 'muted' : 'text-gold-600 dark:text-gold-400'}`}>
            {isPast ? 'realizado' : deadlineLabel(e.date, TODAY)}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold leading-snug">{e.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs muted">{e.desc}</p>
      </div>
    </button>
  )
}

// ── Grade mensal (CSS grid puro, sem biblioteca) ─────────────────────────────
function MonthGrid({ cursor, events, onShift, onOpen }) {
  const { year, month } = cursor
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = first.getDay() // quantas células vazias antes do dia 1

  // Índice de eventos por dia do mês exibido.
  const byDay = useMemo(() => {
    const map = new Map()
    events.forEach((e) => {
      const d = parseDate(e.date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day).push(e)
      }
    })
    return map
  }, [events, year, month])

  const today = parseDate(TODAY)
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthEventCount = [...byDay.values()].reduce((a, l) => a + l.length, 0)

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => onShift(-1)} className="btn-ghost px-2 py-1.5" aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold capitalize tracking-tight sm:text-lg">
            {MESES[month]} de {year}
          </h2>
          <p className="text-[11px] muted">
            {monthEventCount === 0 ? 'nenhum evento neste mês' : `${monthEventCount} evento(s)`}
          </p>
        </div>
        <button onClick={() => onShift(1)} className="btn-ghost px-2 py-1.5" aria-label="Próximo mês">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {d}
              </div>
            ))}
          </div>

          {/* Células do mês */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[84px] rounded-lg" />
              const dayEvents = byDay.get(day) || []
              const isToday = isCurrentMonth && today.getDate() === day
              return (
                <div
                  key={day}
                  className={`min-h-[84px] rounded-lg border p-1.5 transition-colors ${
                    isToday
                      ? 'border-gold-500 bg-gold-500/5'
                      : 'border-gray-200 dark:border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums ${
                      isToday ? 'bg-gold-500 text-military-darker' : 'muted'
                    }`}
                  >
                    {day}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => {
                      const meta = CAL_TYPES[e.type] || {}
                      return (
                        <li key={e.id}>
                          <button
                            onClick={() => onOpen(e)}
                            title={e.title}
                            className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80"
                            style={{ background: `${meta.color}22`, color: meta.color }}
                          >
                            {e.title}
                          </button>
                        </li>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <li className="px-1 text-[9px] font-semibold muted">+{dayEvents.length - 2} mais</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Detalhe do evento ────────────────────────────────────────────────────────
function EventDetail({ event: e, onClose }) {
  const meta = CAL_TYPES[e.type] || {}
  const Icon = TYPE_ICONS[meta.icon] || Flag
  const isPast = e.date < TODAY

  // Módulo relacionado ao tipo — leva o leitor de "quando" para "o que é".
  const RELATED = {
    exercicio: { to: '/fronteiras', label: 'Fronteiras & Amazônia' },
    feira: { to: '/industria', label: 'Base Industrial de Defesa' },
    orcamento: { to: '/legislativo', label: 'Radar Legislativo' },
    diplomacia: { to: '/balanca-militar', label: 'Balança Militar' },
    marco: { to: '/programas', label: 'Programas Estratégicos' },
  }[e.type]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          <Icon size={11} /> {meta.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          isPast
            ? 'bg-white/10 text-gray-600 dark:text-gray-300'
            : 'bg-gold-500/15 text-gold-600 dark:text-gold-400'
        }`}>
          {isPast ? 'Realizado' : deadlineLabel(e.date, TODAY)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Data</p>
          <p className="mt-0.5 text-sm font-bold tracking-tight">{formatDateBR(e.date)}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Escopo</p>
          <p className="mt-0.5 text-sm font-bold tracking-tight">{e.scope}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{e.desc}</p>

      {RELATED && (
        <Link
          to={RELATED.to}
          onClick={onClose}
          className="btn-ghost w-full justify-center text-sm"
        >
          Abrir {RELATED.label} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  )
}
