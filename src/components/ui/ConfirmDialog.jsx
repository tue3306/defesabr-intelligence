import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import Modal from './Modal'

// -----------------------------------------------------------------------------
// CONFIRMAÇÃO — nenhuma ação destrutiva acontece sem uma pergunta clara.
// Substitui `window.confirm` por um diálogo consistente com o tema.
// -----------------------------------------------------------------------------
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger', // 'danger' | 'default'
  icon: Icon,
}) {
  const confirmRef = useRef(null)
  const danger = tone === 'danger'
  const HeaderIcon = Icon || (danger ? Trash2 : AlertTriangle)

  useEffect(() => {
    if (open) {
      // Foco na ação principal ao abrir (acessibilidade por teclado).
      const t = setTimeout(() => confirmRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            danger
              ? 'bg-red-500/15 text-red-500 dark:text-red-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}
        >
          <HeaderIcon size={26} />
        </span>
        <h2 className="mt-4 text-lg font-bold tracking-tight">{title}</h2>
        {description && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed muted">{description}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button onClick={onClose} className="btn-ghost justify-center">{cancelLabel}</button>
          <button
            ref={confirmRef}
            onClick={() => { onConfirm?.(); onClose?.() }}
            className={`btn justify-center ${
              danger
                ? 'bg-military-red text-white hover:bg-red-600'
                : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
