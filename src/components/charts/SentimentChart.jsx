import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts'
import { tooltipStyle } from './chartTheme'

// Radar comparando volume por categoria: semana atual x anterior.
export default function SentimentChart({ data = [], height = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="rgba(148,163,184,0.2)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} angle={30} />
        <Radar name="Semana atual" dataKey="atual" stroke="#1f8a4c" fill="#1f8a4c" fillOpacity={0.4} />
        <Radar name="Semana anterior" dataKey="anterior" stroke="#caa733" fill="#caa733" fillOpacity={0.2} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
