import { ChevronLeft, ChevronRight } from 'lucide-react'

// -----------------------------------------------------------------------------
// PAGINAÇÃO — acessível e estável com muitas páginas (janela deslizante + …).
// -----------------------------------------------------------------------------
export default function Pagination({ page, pages, onChange, total, label = 'itens' }) {
  if (pages <= 1) return null

  const go = (p) => onChange(Math.min(pages, Math.max(1, p)))
  const window = pageWindow(page, pages)

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-sm font-semibold text-gray-600 transition-colors disabled:opacity-40 enabled:hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:bg-white/5"
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
      </button>

      {window.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-sm muted" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={page === p ? 'page' : undefined}
            aria-label={`Página ${p}`}
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
              page === p
                ? 'bg-gold-500 text-military-darker'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page === pages}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-sm font-semibold text-gray-600 transition-colors disabled:opacity-40 enabled:hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:enabled:hover:bg-white/5"
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span> <ChevronRight size={16} />
      </button>

      {typeof total === 'number' && (
        <span className="ml-2 w-full text-center text-xs muted sm:w-auto">
          {total} {label} · página {page} de {pages}
        </span>
      )}
    </nav>
  )
}

// Janela deslizante: 1 … 4 5 [6] 7 8 … 20
function pageWindow(page, pages, span = 1) {
  const set = new Set([1, pages])
  for (let p = page - span; p <= page + span; p++) if (p > 0 && p <= pages) set.add(p)
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}
