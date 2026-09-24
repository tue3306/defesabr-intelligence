import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts'
import { tooltipStyle, axisStyle, gridStroke } from './chartTheme'

// Número em português: "1,58%", e não "1.58%" — o eixo e a dica usavam o
// formato inglês, enquanto a tabela logo abaixo usava o brasileiro.
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export default function ComparisonBarChart({ data = [], highlightCode = 'BR', height = 360 }) {
  const sorted = [...data].sort((a, b) => b.pctGdp - a.pctGdp)
  const destaque = sorted.find((d) => d.code === highlightCode)
  return (
    <figure>
      {/* O valor de cada barra vai ESCRITO ao lado dela: a cor dourada marca o
          Brasil, mas quem não distingue dourado de verde (ou não vê o gráfico)
          precisa do número e do nome, não da cor. */}
      <figcaption className="sr-only">
        Gasto militar em porcentagem do PIB, do maior para o menor:{' '}
        {sorted.map((d) => `${d.country} ${pct(d.pctGdp)}`).join('; ')}.
      </figcaption>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 6, right: 44, left: 10, bottom: 0 }}>
            <CartesianGrid stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={pct} />
            <YAxis
              type="category"
              dataKey="country"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={88}
            />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${pct(v)} do PIB`, 'Gasto militar']} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="pctGdp" radius={[0, 4, 4, 0]} barSize={16}>
              {sorted.map((d) => (
                <Cell key={d.code} fill={d.code === highlightCode ? '#caa733' : '#1f8a4c'} />
              ))}
              <LabelList dataKey="pctGdp" position="right" formatter={pct} style={{ fontSize: 11, fill: '#94a3b8' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {destaque && (
        <p className="mt-1 text-[11px] muted">
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#caa733] align-middle" aria-hidden="true" />
          Em dourado: {destaque.country}.
        </p>
      )}
    </figure>
  )
}
