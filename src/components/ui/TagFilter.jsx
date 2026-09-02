// Filtro de categorias por chips (multiselect)
export default function TagFilter({ options = [], selected = [], onToggle, getColor }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        const color = getColor?.(opt)
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-brand-500 bg-brand-500/20 text-brand-200'
                : 'border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
            style={active && color ? { borderColor: color, color, backgroundColor: `${color}22` } : undefined}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
