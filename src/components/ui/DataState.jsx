import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react'
import EmptyState from './EmptyState'
import { SkeletonCard } from './Skeleton'

// -----------------------------------------------------------------------------
// DATA STATE — os quatro estados de qualquer bloco de dados, num só lugar:
//   carregando · erro (com nova tentativa) · vazio · conteúdo
//
// Evita que cada página reinvente (e esqueça) o tratamento de erro/vazio.
//
//   <DataState
//     loading={loading} error={error} empty={!items.length}
//     onRetry={reload}
//     emptyProps={{ title: 'Nenhum evento', hint: '…' }}
//     skeleton={<SkeletonChart />}
//   >
//     {items.map(…)}
//   </DataState>
// -----------------------------------------------------------------------------
export default function DataState({
  loading,
  error,
  empty,
  onRetry,
  skeleton,
  skeletonCount = 3,
  emptyProps = {},
  errorTitle = 'Não foi possível carregar os dados',
  children,
}) {
  if (loading) {
    return (
      skeleton || (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )
    )
  }

  if (error) {
    return <ErrorState title={errorTitle} error={error} onRetry={onRetry} />
  }

  if (empty) {
    return <EmptyState icon={Inbox} {...emptyProps} />
  }

  return children
}

/** Bloco de erro reutilizável (também usado fora do DataState). */
export function ErrorState({ title = 'Não foi possível carregar os dados', error, onRetry, compact = false }) {
  const message =
    typeof error === 'string' ? error : error?.message || 'Falha inesperada ao consultar a fonte de dados.'

  return (
    <div
      role="alert"
      className={`card flex flex-col items-center gap-3 text-center ${compact ? 'p-6' : 'p-10'}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <AlertTriangle size={24} />
      </span>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      <p className="max-w-sm text-sm muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-1">
          <RefreshCw size={15} /> Tentar novamente
        </button>
      )}
    </div>
  )
}
