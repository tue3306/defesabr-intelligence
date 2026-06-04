import { ResponsiveContainer, Treemap, Tooltip } from 'recharts'
import { tooltipStyle } from './chartTheme'

const COLORS = ['#024160', '#076280', '#0d7195', '#147fa8', '#1a8ab8', '#3d9dc5', '#64b1d0', '#96c9de', '#4a7c59', '#64748b']

// Treemap de gastos militares globais (US$ bi). Também usado para outros datasets.
export default function BrazilDefenseBudget({ data = [], height = 340 }) {
  const colored = data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={colored}
        dataKey="value"
        nameKey="name"
        stroke="#141c28"
        content={<Node />}
      >
        <Tooltip
          {...tooltipStyle}
          formatter={(value, _n, item) => [`US$ ${value} bi`, item?.payload?.name]}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

function Node({ x, y, width, height, name, value, fill, index = 0 }) {
  if (width < 0 || height < 0) return null
  const show = width > 56 && height > 26
  const color = fill || COLORS[index % COLORS.length]
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#141c28" />
      {show && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.75)" fontSize={10}>
            {value}
          </text>
        </>
      )}
    </g>
  )
}
