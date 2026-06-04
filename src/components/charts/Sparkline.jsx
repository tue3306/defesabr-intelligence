import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'

// Mini grafico de linha sem eixos (para cards de acoes/cambio).
export default function Sparkline({ values = [], color = '#1a8ab8', height = 40 }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
