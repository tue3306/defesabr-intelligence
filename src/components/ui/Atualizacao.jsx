import { useEffect, useState } from 'react'
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { timeAgo, formatDateTimeBR } from '../../utils/dateUtils'

// -----------------------------------------------------------------------------
// "AO VIVO" SÓ QUANDO É VERDADE
//
// O painel exibia o selo "Ao vivo" sempre que o servidor respondia — inclusive
// quando a última coleta tinha acontecido 23 horas antes (a instalação ficou
// desligada à noite). O selo atestava que a API estava de pé, e parecia
// atestar que as notícias eram de agora.
//
// Este indicador diz o que se sabe de fato: quando foi a última coleta.
//   · até 1 hora     → coleta ativa (o agendador roda a cada 15 minutos);
//   · até 6 horas    → neutro, com a hora;
//   · mais que isso  → aviso de que o acervo pode estar desatualizado.
// -----------------------------------------------------------------------------

const HORA = 3_600_000

export default function Atualizacao({ ultimaColeta, escuro = false }) {
  // Re-renderiza a cada minuto para "há 3 min" não congelar na tela.
  const [, setTique] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTique((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!ultimaColeta) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${escuro ? 'border-white/20 text-gray-300' : 'border-gray-300 text-gray-600 dark:border-white/15 dark:text-gray-300'}`}>
        <Clock size={12} aria-hidden="true" /> Sem registro de coleta
      </span>
    )
  }

  const idade = Date.now() - new Date(ultimaColeta).getTime()
  const quando = timeAgo(ultimaColeta)
  const exato = formatDateTimeBR(ultimaColeta)

  if (idade <= HORA) {
    return (
      <span
        title={`Última coleta em ${exato}. As fontes são lidas automaticamente a cada 15 minutos.`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold ${escuro ? 'text-emerald-300' : 'text-emerald-800 dark:text-emerald-300'}`}
      >
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" />
        Coleta ativa · {quando}
      </span>
    )
  }
  if (idade <= 6 * HORA) {
    return (
      <span
        title={`Última coleta em ${exato}.`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${escuro ? 'border-white/20 text-gray-200' : 'border-gray-300 text-gray-700 dark:border-white/15 dark:text-gray-200'}`}
      >
        <RefreshCw size={12} aria-hidden="true" /> Última coleta {quando}
      </span>
    )
  }
  return (
    <span
      title={`Última coleta em ${exato}. O servidor pode ter ficado desligado; as notícias mais novas podem não estar aqui.`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold ${escuro ? 'text-amber-200' : 'text-amber-800 dark:text-amber-300'}`}
    >
      <AlertTriangle size={12} aria-hidden="true" /> Última coleta {quando} — pode estar desatualizado
    </span>
  )
}
