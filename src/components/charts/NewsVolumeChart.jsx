import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { tooltipStyle, axisStyle, gridStroke } from './chartTheme'
import { categoryColor } from '../../utils/textUtils'

export default function NewsVolumeChart({ data = [], keys = [], height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={32} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} stackId="vol" fill={categoryColor(k)} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
