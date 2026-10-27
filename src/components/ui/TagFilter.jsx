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
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
              active
                ? 'border-brand-500 bg-brand-500/15 text-gray-900 dark:text-brand-200'
                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900 dark:border-gray-600/50 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200'
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
