import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

// Índice de alerta 0–100 com semicírculo colorido.
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

export default function GaugeChart({ value = 42, height = 220 }) {
  const data = [{ name: 'alerta', value, fill: colorFor(value) }]
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
          barSize={22}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(148,163,184,0.15)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
        <p className="text-4xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-semibold" style={{ color: colorFor(value) }}>
          {labelFor(value)}
        </p>
      </div>
    </div>
  )
}
