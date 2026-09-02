import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import InfoTooltip from './InfoTooltip'

// -----------------------------------------------------------------------------
// CABEÇALHO DE PÁGINA — hierarquia visual única em todos os módulos.
//
// Estrutura fixa (topo → base):
//   trilha (breadcrumb) → ícone + título + ajuda → descrição → selos → ações
//
//   <PageHeader
//     icon={Radio}
//     title="Monitor de Narrativas"
//     description="Percepção pública e detecção de campanhas coordenadas."
//     help="FIMI = Foreign Information Manipulation and Interference."
//     breadcrumb={[{ label: 'Inteligência' }, { label: 'Narrativas' }]}
//     badges={<Badge type="demo" />}
//     actions={<button className="btn-primary">Exportar</button>}
//   />
// -----------------------------------------------------------------------------
export default function PageHeader({
  icon: Icon,
  title,
  description,
  help,
  breadcrumb,
  badges,
  actions,
  meta,
  children,
  accent = 'brand',
}) {
  const accentClass = {
    brand: 'bg-brand-500/15 text-brand-400 dark:text-brand-300',
    gold: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
    green: 'bg-military-green/15 text-emerald-500 dark:text-emerald-400',
    red: 'bg-military-red/15 text-red-500 dark:text-red-400',
  }[accent]

  return (
    <header className="card p-5 sm:p-6">
      {breadcrumb?.length > 0 && (
        <nav aria-label="Trilha de navegação" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-xs muted">
            {breadcrumb.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="opacity-60" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="font-medium hover:text-brand-400 dark:text-brand-300">{crumb.label}</Link>
                ) : (
                  <span className={i === breadcrumb.length - 1 ? 'font-semibold text-gray-700 dark:text-gray-300' : ''}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
              <Icon size={22} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
              {help && <InfoTooltip text={help} />}
              {badges}
            </div>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed muted">{description}</p>
            )}
            {meta?.length > 0 && (
              <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                {meta.map((m) => (
                  <div key={m.label} className="flex items-center gap-1.5">
                    <dt className="font-semibold uppercase tracking-wide muted">{m.label}</dt>
                    <dd className="font-mono font-semibold text-gray-700 dark:text-gray-300">{m.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-5">{children}</div>}
    </header>
  )
}
