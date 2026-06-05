const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export function formatFullDate(date = new Date()) {
  const d = new Date(date)
  const dia = DIAS[d.getDay()]
  return `${cap(dia)}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatDateBR(date = new Date()) {
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function formatTime(date = new Date()) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Data e hora por extenso curto: "04/06/2026 às 09:30"
export function formatDateTimeBR(date = new Date()) {
  return `${formatDateBR(date)} às ${formatTime(date)}`
}

// Tempo relativo: "há 45 min", "há 2h", "há 3 dias"
export function timeAgo(date) {
  const d = new Date(date)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (Number.isNaN(diff)) return ''
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return formatDateBR(d)
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export { MESES }
