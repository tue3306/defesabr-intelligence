import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { tooltipStyle, axisStyle, gridStroke } from './chartTheme'

export default function ExchangeAreaChart({ data = [], height = 280, color = '#1f8a4c', showAxes = true }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showAxes && <CartesianGrid stroke={gridStroke} vertical={false} />}
        {showAxes && <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={24} />}
        {showAxes && <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={42} domain={['auto', 'auto']} />}
        <Tooltip {...tooltipStyle} formatter={(v) => [`R$ ${v}`, 'USD/BRL']} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#exGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
