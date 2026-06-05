import { useState, useId } from 'react'
import { HelpCircle } from 'lucide-react'

// Pequeno ícone de ajuda com explicação em popover. Acessível por teclado
// (foco) e por mouse (hover). Ideal para o público iniciante/acadêmico.
export default function InfoTooltip({ text, label = 'O que é isto?', size = 14 }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-full text-gray-400 transition-colors hover:text-brand-300"
      >
        <HelpCircle size={size} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg border border-gray-700/60 bg-military-darker px-3 py-2 text-xs font-normal leading-relaxed text-gray-200 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  )
}
