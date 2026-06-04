import { urgencyMeta, alertMeta, categoryColor } from '../../utils/textUtils'

// Badge generico. type: 'urgency' | 'alert' | 'category' | 'live' | 'demo' | 'plain'
export default function Badge({ type = 'plain', value, children, className = '' }) {
  if (type === 'urgency') {
    const m = urgencyMeta[value] || urgencyMeta.BAIXO
    return <Pill className={`${m.classes} ${className}`}>{m.label}</Pill>
  }
  if (type === 'alert') {
    const m = alertMeta[value] || alertMeta.NORMAL
    return <Pill className={`${m.classes} ${className}`}>{m.label}</Pill>
  }
  if (type === 'category') {
    const color = categoryColor(value)
    return (
      <Pill
        className={`border-transparent ${className}`}
        style={{ backgroundColor: `${color}22`, color }}
      >
        {value}
      </Pill>
    )
  }
  if (type === 'live') {
    return (
      <Pill className={`border-emerald-500/40 bg-emerald-500/15 text-emerald-300 ${className}`}>
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
        Ao vivo
      </Pill>
    )
  }
  if (type === 'demo') {
    return (
      <Pill className={`border-yellow-500/40 bg-yellow-500/15 text-yellow-300 ${className}`}>
        Modo demonstração
      </Pill>
    )
  }
  return <Pill className={`border-gray-600/50 bg-white/5 text-gray-300 ${className}`}>{children || value}</Pill>
}

function Pill({ children, className = '', style }) {
  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  )
}
