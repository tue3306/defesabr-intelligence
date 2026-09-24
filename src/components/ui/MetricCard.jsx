import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// A SETA SEGUE O SINAL; A COR SEGUE O JULGAMENTO — e só quando há julgamento.
//
// A seta era escolhida por `deltaPositive`: sem ele (o dólar, em que subir é
// bom para quem exporta e ruim para quem compra caça sueco), o cartão caía no
// ramo "negativo" e desenhava seta PARA BAIXO, em vermelho, para "+0,004". O
// número dizia que subiu; o desenho dizia que caiu.
//
// Agora a direção sai do próprio sinal do delta. Verde e vermelho só aparecem
// quando quem usa o cartão diz se a direção é boa (`deltaPositive`); sem isso,
// o selo fica neutro. E a direção também vai por escrito para leitor de tela,
// porque seta e cor não chegam a quem não vê.
function direcaoDe(delta) {
  const t = String(delta ?? '').trim()
  if (/^[+]/.test(t)) return 'sobe'
  if (/^[-−]/.test(t)) return 'desce'
  return 'estavel'
}

export default function MetricCard({ icon: Icon, label, value, delta, deltaPositive, hint, accent = 'brand' }) {
  const direcao = direcaoDe(delta)
  const SetaIcone = direcao === 'sobe' ? TrendingUp : direcao === 'desce' ? TrendingDown : Minus
  const tomDelta = deltaPositive === undefined || direcao === 'estavel'
    ? 'bg-gray-500/10 text-gray-700 dark:text-gray-300'
    : deltaPositive
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : 'bg-red-500/10 text-red-700 dark:text-red-400'
  const accentClass = {
    brand: 'text-brand-400 dark:text-brand-300 bg-brand-500/10',
    green: 'text-emerald-700 dark:text-emerald-400 bg-military-green/15',
    amber: 'text-amber-800 dark:text-amber-400 bg-military-amber/15',
    red: 'text-red-700 dark:text-red-400 bg-military-red/15',
  }[accent]

  return (
    <div className="card animate-fade-in-up p-5 transition-transform hover:-translate-y-0.5 hover:shadow-card-hover">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider muted">{label}</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${accentClass}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {delta && (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${tomDelta}`}>
              <SetaIcone size={12} aria-hidden="true" />
              <span className="sr-only">{direcao === 'sobe' ? 'subiu' : direcao === 'desce' ? 'caiu' : 'sem mudança'}:</span>
              {delta}
            </span>
          )}
          {hint && <span className="muted">{hint}</span>}
        </div>
      )}
    </div>
  )
}
