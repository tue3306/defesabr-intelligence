import { Shield } from 'lucide-react'

// Logo patriótica: escudo dourado sobre badge verde (cores do Brasil).
const SIZES = {
  sm: { box: 'h-8 w-8', icon: 16, title: 'text-sm', sub: 'text-[9px]' },
  md: { box: 'h-9 w-9', icon: 20, title: 'text-sm', sub: 'text-[10px]' },
  lg: { box: 'h-12 w-12', icon: 26, title: 'text-base', sub: 'text-[11px]' },
}

export default function Logo({ size = 'md', showText = true }) {
  const s = SIZES[size]
  return (
    <span className="flex items-center gap-2">
      <span
        className={`relative flex ${s.box} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm ring-1 ring-brand-400/30`}
      >
        <Shield size={s.icon} className="text-gold-400" strokeWidth={2.5} />
        {/* base dourada (toque da bandeira) */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gold-500/80" />
      </span>
      {showText && (
        <span className="leading-tight">
          <span className={`block ${s.title} font-bold tracking-tight`}>DefesaBR</span>
          <span className={`block ${s.sub} font-semibold uppercase tracking-widest text-brand-400`}>
            Intelligence
          </span>
        </span>
      )}
    </span>
  )
}
