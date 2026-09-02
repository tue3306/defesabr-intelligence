import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'

// Bloqueio de conteúdo premium (demonstrativo): mostra o conteúdo borrado
// atrás de um overlay com chamada para os planos. Quando `active` é falso,
// renderiza o conteúdo normalmente.
export default function Paywall({
  active = true,
  title = 'Conteúdo exclusivo para assinantes',
  desc = 'Assine para desbloquear análises, briefings e cenários estratégicos completos.',
  children,
}) {
  if (!active) return children

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-700/50">
      <div className="pointer-events-none max-h-[420px] select-none overflow-hidden blur-[6px]" aria-hidden="true">
        {children}
      </div>
      <div className="on-dark absolute inset-0 flex flex-col items-center justify-center gap-3 bg-military-darker/80 p-6 text-center backdrop-blur-[2px]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forca-defesa/15 text-forca-defesa">
          <Lock size={24} />
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-300">{desc}</p>
        </div>
        <Link to="/planos" className="btn-primary mt-1">
          <Sparkles size={16} /> Ver planos
        </Link>
        <span className="text-xs text-gray-400">Notícias permanecem sempre gratuitas.</span>
      </div>
    </div>
  )
}
