// Índice de alerta 0–100 — medidor semicircular em SVG puro.
// Responsivo (viewBox + width 100%), sem espaço vazio e independente de libs.
function colorFor(v) {
  if (v < 25) return '#4a7c59'
  if (v < 50) return '#d4b41a'
  if (v < 75) return '#d4841a'
  return '#c0392b'
}
function labelFor(v) {
  if (v < 25) return 'NORMAL'
  if (v < 50) return 'ATENÇÃO'
  if (v < 75) return 'ALERTA'
  return 'CRÍTICO'
}

const R = 84
const ARC_LEN = Math.PI * R // comprimento do semicírculo
const ARC_PATH = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`

export default function GaugeChart({ value = 42, height = 220 }) {
  const v = Math.max(0, Math.min(100, value))
  const color = colorFor(v)
  const filled = (v / 100) * ARC_LEN

  return (
    <div
      className="mx-auto w-full text-gray-900 dark:text-gray-100"
      style={{ maxWidth: height * 1.7 }}
    >
      <svg
        viewBox="0 0 200 122"
        className="block h-auto w-full"
        role="img"
        aria-label={`Índice de alerta ${v} de 100 — nível ${labelFor(v)}`}
      >
        {/* trilho */}
        <path d={ARC_PATH} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="16" strokeLinecap="round" />
        {/* progresso */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${ARC_LEN}`}
        />
        {/* valor + nível */}
        <text x="100" y="86" textAnchor="middle" fill="currentColor" fontSize="36" fontWeight="700">{v}</text>
        <text x="100" y="102" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" letterSpacing="0.6">{labelFor(v)}</text>
        {/* extremos da escala */}
        <text x={100 - R} y="118" textAnchor="middle" fill="#94a3b8" fontSize="9">0</text>
        <text x={100 + R} y="118" textAnchor="middle" fill="#94a3b8" fontSize="9">100</text>
      </svg>
    </div>
  )
}
