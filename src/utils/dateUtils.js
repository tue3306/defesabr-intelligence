const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Converte para Date respeitando o fuso LOCAL.
 *
 * `new Date('2026-08-24')` é interpretado como meia-noite UTC pelo padrão da
 * linguagem — no Brasil (UTC-3) isso volta como 23/08, deslocando em um dia
 * TODA data sem hora do produto (prazos, agenda, marcos de programa).
 * Datas com hora seguem o comportamento normal.
 */
export function parseDate(value = new Date()) {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const m = value.match(DATE_ONLY)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(value)
}

/** true quando a data é válida (evita renderizar "NaN/NaN/NaN"). */
function isValid(d) {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

export function formatFullDate(date = new Date()) {
  const d = parseDate(date)
  if (!isValid(d)) return '—'
  return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatDateBR(date = new Date()) {
  const d = parseDate(date)
  if (!isValid(d)) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function formatTime(date = new Date()) {
  const d = parseDate(date)
  if (!isValid(d)) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Data e hora por extenso curto: "24/08/2026 às 09:30" */
export function formatDateTimeBR(date = new Date()) {
  const d = parseDate(date)
  if (!isValid(d)) return '—'
  return `${formatDateBR(d)} às ${formatTime(d)}`
}

/** Mês e ano: "agosto de 2026" — usado em agrupamentos de agenda. */
export function formatMonthYear(date = new Date()) {
  const d = parseDate(date)
  if (!isValid(d)) return '—'
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

/** Tempo relativo: "há 45 min", "há 2h", "há 3 dias". */
export function timeAgo(date) {
  const d = parseDate(date)
  if (!isValid(d)) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 0) return 'agendado'
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return formatDateBR(d)
}

/**
 * Distância até um prazo, em dias (negativo = vencido).
 * Compara apenas o DIA, ignorando a hora — é assim que se lê um prazo.
 */
export function daysUntil(date, reference = new Date()) {
  const d = parseDate(date)
  const ref = parseDate(reference)
  if (!isValid(d) || !isValid(ref)) return null
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const b = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  return Math.round((a - b) / 86400000)
}

/** Rótulo humano de prazo: "vence hoje", "em 3 dias", "vencido há 2 dias". */
export function deadlineLabel(date, reference = new Date()) {
  const days = daysUntil(date, reference)
  if (days === null) return '—'
  if (days === 0) return 'vence hoje'
  if (days === 1) return 'vence amanhã'
  if (days > 1) return `em ${days} dias`
  if (days === -1) return 'vencido ontem'
  return `vencido há ${Math.abs(days)} dias`
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export { MESES, DIAS }
