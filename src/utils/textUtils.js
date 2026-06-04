export function truncate(text = '', max = 140) {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export function clipboard(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return Promise.reject(new Error('Área de transferência indisponível'))
}

// Cores por nível de urgência (a chave é o enum; o label é o texto exibido).
export const urgencyMeta = {
  CRITICO: { label: 'CRÍTICO', classes: 'bg-military-red/20 text-red-300 border-military-red/40' },
  ALTO: { label: 'ALTO', classes: 'bg-military-amber/20 text-amber-300 border-military-amber/40' },
  MEDIO: { label: 'MÉDIO', classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' },
  BAIXO: { label: 'BAIXO', classes: 'bg-military-green/20 text-emerald-300 border-military-green/40' },
}

// Cores por nível de alerta do dia (a chave é o enum; o label é o texto exibido).
export const alertMeta = {
  NORMAL: { label: 'NORMAL', classes: 'bg-military-green/20 text-emerald-300 border-military-green/50', value: 18 },
  ATENCAO: { label: 'ATENÇÃO', classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/50', value: 42 },
  ALERTA: { label: 'ALERTA', classes: 'bg-military-amber/20 text-amber-300 border-military-amber/50', value: 65 },
  CRITICO: { label: 'CRÍTICO', classes: 'bg-military-red/20 text-red-300 border-military-red/50', value: 88 },
}

// Cor por categoria (para gráficos e badges). A chave é exibida diretamente.
export const categoryColors = {
  'Forças Armadas': '#1a8ab8',
  Cibersegurança: '#8b5cf6',
  Fronteiras: '#d4841a',
  Indústria: '#4a7c59',
  Diplomacia: '#3d9dc5',
  Orçamento: '#c0392b',
  Inteligência: '#64748b',
}

export function categoryColor(cat) {
  return categoryColors[cat] || '#64748b'
}
