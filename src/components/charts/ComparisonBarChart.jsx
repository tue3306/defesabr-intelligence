import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { tooltipStyle, axisStyle, gridStroke } from './chartTheme'

// Barra horizontal de % do PIB por país; destaca o Brasil.
export default function ComparisonBarChart({ data = [], highlightCode = 'BR', height = 360 }) {
  const sorted = [...data].sort((a, b) => b.pctGdp - a.pctGdp)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 6, right: 24, left: 10, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} horizontal={false} />
        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="country"
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={88}
        />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v}% do PIB`, 'Gasto militar']} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="pctGdp" radius={[0, 4, 4, 0]} barSize={16}>
          {sorted.map((d) => (
            <Cell key={d.code} fill={d.code === highlightCode ? '#caa733' : '#1f8a4c'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
