import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'

// -----------------------------------------------------------------------------
// ESTADO VAZIO — padrão único de toda a plataforma.
//
// Um bom estado vazio explica TRÊS coisas: o que deveria estar aqui, por que
// não está, e qual é o próximo passo. Nunca deixa a pessoa sem saída.
//
//   <EmptyState icon={Star} title="Sua pasta está vazia"
//               hint="Salve notícias para montar seu dossiê."
//               action={{ label: 'Abrir clipping', to: '/clipping' }} />
// -----------------------------------------------------------------------------
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  secondaryAction,
  compact = false,
  tone = 'neutral', // 'neutral' | 'filter' | 'locked'
  children,
}) {
  const toneRing = {
    neutral: 'bg-white/5 text-gray-500',
    filter: 'bg-brand-500/10 text-brand-400',
    locked: 'bg-gold-500/10 text-gold-600 dark:text-gold-400',
  }[tone]

  return (
    <div className={`card flex flex-col items-center gap-3 text-center ${compact ? 'p-6' : 'p-10 sm:p-12'}`}>
      <span className={`flex items-center justify-center rounded-2xl ${compact ? 'h-12 w-12' : 'h-16 w-16'} ${toneRing}`}>
        <Icon size={compact ? 22 : 30} />
      </span>
      <h3 className={`font-bold tracking-tight ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>{title}</h3>
      {hint && <p className="max-w-sm text-sm leading-relaxed muted">{hint}</p>}
      {children}
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="ghost" />}
        </div>
      )}
    </div>
  )
}

function ActionButton({ action, variant }) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  const Icon = action.icon
  const content = (
    <>
      {Icon && <Icon size={15} />}
      {action.label}
    </>
  )
  if (action.to) {
    return <Link to={action.to} className={cls}>{content}</Link>
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {content}
    </button>
  )
}
