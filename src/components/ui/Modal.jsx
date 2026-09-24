import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// -----------------------------------------------------------------------------
// O MODAL PRECISA SEGURAR O FOCO
//
// Para quem navega pelo teclado ou por leitor de tela, um modal que só se
// desenha por cima não abriu: o foco continuava na página de trás, o Tab
// seguia percorrendo links escondidos sob o véu escuro, e fechar o modal
// devolvia a pessoa ao topo do documento.
//
// Três regras, as do padrão de diálogo da WAI-ARIA:
//   1. Ao abrir, o foco entra no diálogo (no primeiro controle).
//   2. Tab e Shift+Tab giram DENTRO dele.
//   3. Ao fechar, o foco volta ao elemento que o abriu.
// -----------------------------------------------------------------------------

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const caixa = useRef(null)
  const anterior = useRef(null)
  const idTitulo = useId()
  // `onClose` costuma chegar como função nova a cada render. Dependendo dela,
  // o efeito rodaria de novo a cada tecla digitada num campo do modal — e
  // devolveria o foco ao primeiro controle no meio da digitação.
  const fechar = useRef(onClose)
  fechar.current = onClose

  useEffect(() => {
    if (!open) return undefined
    anterior.current = document.activeElement
    // Um instante depois, com o conteúdo já montado. `setTimeout`, e não
    // `requestAnimationFrame`: numa aba em segundo plano o navegador suspende
    // os quadros, e o foco nunca chegaria ao diálogo.
    const t = setTimeout(() => {
      const alvos = caixa.current?.querySelectorAll(FOCAVEIS)
      const primeiro = [...(alvos || [])].find((el) => !el.dataset.fechar) || alvos?.[0]
      ;(primeiro || caixa.current)?.focus()
    }, 30)
    const onKey = (e) => {
      if (e.key === 'Escape') { fechar.current?.(); return }
      if (e.key !== 'Tab' || !caixa.current) return
      const alvos = [...caixa.current.querySelectorAll(FOCAVEIS)]
      if (!alvos.length) return
      const primeiro = alvos[0]
      const ultimo = alvos[alvos.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      // Devolve o foco a quem abriu, se ele ainda estiver na página.
      const volta = anterior.current
      if (volta && typeof volta.focus === 'function' && document.contains(volta)) volta.focus()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? idTitulo : undefined}
            tabIndex={-1}
            initial={{ scale: 0.96, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 14, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`card relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-2xl p-6 shadow-modal outline-none ${maxWidth}`}
          >
            {title && (
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 id={idTitulo} className="text-lg font-bold tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  data-fechar="1"
                  className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
