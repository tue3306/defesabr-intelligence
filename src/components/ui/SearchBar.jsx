import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

// Busca com debounce de 300ms. onSearch é disparado no Enter; onChange (debounced) opcional.
export default function SearchBar({
  placeholder = 'Buscar...',
  onSearch,
  onChange,
  defaultValue = '',
  className = '',
}) {
  const [value, setValue] = useState(defaultValue)
  const timer = useRef()

  useEffect(() => {
    if (!onChange) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(value), 300)
    return () => clearTimeout(timer.current)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(value)
      }}
    >
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('')
            onChange?.('')
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          aria-label="Limpar busca"
        >
          <X size={15} />
        </button>
      )}
    </form>
  )
}
