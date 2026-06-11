import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { tooltipStyle, axisStyle, gridStroke } from './chartTheme'

// mode: 'dual' | 'usd' | 'pctGdp'
export default function MilitarySpendingChart({ data = [], mode = 'dual', height = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="left"
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          label={{ value: mode === 'usd' ? 'US$ bi' : 'R$ bi', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
        />
        {mode !== 'usd' && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={[0, 3]}
            label={{ value: '% PIB', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }}
          />
        )}
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {(mode === 'dual') && (
          <Bar yAxisId="left" dataKey="brl" name="Gasto (R$ bi)" fill="#1f8a4c" radius={[3, 3, 0, 0]} barSize={16} />
        )}
        {mode === 'usd' && (
          <Bar yAxisId="left" dataKey="usd" name="Gasto (US$ bi)" fill="#1f8a4c" radius={[3, 3, 0, 0]} barSize={16} />
        )}
        {mode !== 'usd' && (
          <>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pctGdp"
              name="% do PIB"
              stroke="#d4841a"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
            <ReferenceLine
              yAxisId="right"
              y={2}
              stroke="#4a7c59"
              strokeDasharray="5 4"
              label={{ value: 'Meta OTAN 2%', fill: '#4a7c59', fontSize: 10, position: 'insideTopRight' }}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
