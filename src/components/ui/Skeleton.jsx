// Loaders de esqueleto reutilizáveis (brilho/shimmer via classe .skeleton)
export function Skeleton({ className = '', style }) {
  return <div style={style} className={`skeleton ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

export function SkeletonChart({ className = 'h-72' }) {
  return (
    <div className={`card flex items-end gap-2 p-6 ${className}`}>
      {[40, 70, 55, 80, 60, 90, 50, 75].map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="card space-y-2 p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export default Skeleton
