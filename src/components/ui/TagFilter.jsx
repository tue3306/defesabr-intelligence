// -----------------------------------------------------------------------------
// FILTRO POR ETIQUETAS (seleção múltipla)
//
// Quando ativo, a etiqueta recebe a cor da categoria no FUNDO e na BORDA — e
// não no texto. Colorir o texto com a paleta de categorias dava 2,31:1 sobre
// card branco; a cor continua distinguindo a categoria, e o texto continua
// legível porque herda o primeiro plano do tema.
// -----------------------------------------------------------------------------
export default function TagFilter({ options = [], selected = [], onToggle, getColor }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const ativo = selected.includes(opt)
        const cor = getColor?.(opt)
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            aria-pressed={ativo}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              ativo
                ? 'border-brand-500 bg-brand-500/20 text-gray-900 dark:text-gray-100'
                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
            style={ativo && cor ? { borderColor: cor, backgroundColor: `${cor}26` } : undefined}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
