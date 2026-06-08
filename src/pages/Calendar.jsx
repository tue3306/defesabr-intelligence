import { useState, useMemo } from 'react'
import {
  CalendarDays, Crosshair, Building2, Landmark, Globe2, Flag, MapPin,
} from 'lucide-react'
import { calendarEvents, CAL_TYPES } from '../data/strategicCalendar'
import { formatDateBR } from '../utils/dateUtils'

const TYPE_ICONS = { Crosshair, Building2, Landmark, Globe2, Flag }

export default function StrategicCalendar() {
  const [type, setType] = useState('todos')

  const sorted = useMemo(() => {
    const list = type === 'todos' ? calendarEvents : calendarEvents.filter((e) => e.type === type)
    return [...list].sort((a, b) => a.date.localeCompare(b.date))
  }, [type])

  // Agrupa por mês (rótulo pt-BR)
  const groups = useMemo(() => {
    const map = {}
    sorted.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00')
      const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      ;(map[key] ||= []).push(e)
    })
    return Object.entries(map)
  }, [sorted])

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <CalendarDays size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendário Estratégico</h1>
            <p className="text-sm muted">Exercícios, feiras, marcos de programas e eventos legislativos e diplomáticos.</p>
          </div>
        </div>
      </div>

      {/* FILTRO POR TIPO (legenda clicável) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setType('todos')}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            type === 'todos' ? 'bg-brand-500 text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
          }`}
        >
          Todos
        </button>
        {Object.entries(CAL_TYPES).map(([key, meta]) => {
          const Icon = TYPE_ICONS[meta.icon] || Flag
          const active = type === key
          return (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active ? 'text-white' : 'border border-gray-600/50 text-gray-400 hover:text-gray-200'
              }`}
              style={active ? { background: meta.color } : undefined}
            >
              <Icon size={14} /> {meta.label}
            </button>
          )
        })}
      </div>

      {/* TIMELINE AGRUPADA POR MÊS */}
      <div className="space-y-8">
        {groups.map(([month, events]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-300">{month}</h2>
            <div className="relative space-y-3 border-l-2 border-gray-700/50 pl-5">
              {events.map((e) => {
                const meta = CAL_TYPES[e.type]
                const Icon = TYPE_ICONS[meta.icon] || Flag
                const d = new Date(e.date + 'T00:00:00')
                return (
                  <div key={e.id} className="relative">
                    {/* marcador */}
                    <span
                      className="absolute -left-[27px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-military-dark"
                      style={{ background: meta.color }}
                    >
                      <Icon size={11} className="text-white" />
                    </span>
                    <div className="card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-300">{formatDateBR(e.date)}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${meta.color}22`, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs muted"><MapPin size={11} /> {e.scope}</span>
                        <span className="ml-auto text-xs muted">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                      </div>
                      <h3 className="mt-1.5 font-bold tracking-tight">{e.title}</h3>
                      <p className="mt-0.5 text-sm muted">{e.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs muted">Datas e eventos demonstrativos para fins de visualização.</p>
    </div>
  )
}
