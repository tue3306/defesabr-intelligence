import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { countryActivity } from '../../data/mockData'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Atividade por NOME do país (world-atlas usa properties.name, em inglês)
const ACTIVITY_BY_NAME = {
  Brazil: countryActivity.BRA,
  'United States of America': countryActivity.USA,
  Russia: countryActivity.RUS,
  China: countryActivity.CHN,
  Argentina: countryActivity.ARG,
  Colombia: countryActivity.COL,
  Venezuela: countryActivity.VEN,
  France: countryActivity.FRA,
  'United Kingdom': countryActivity.GBR,
  Germany: countryActivity.DEU,
  India: countryActivity.IND,
  Ukraine: countryActivity.UKR,
  Israel: countryActivity.ISR,
  Iran: countryActivity.IRN,
}

// Tradução do nome exibido no tooltip (a chave de lookup permanece em inglês).
const NAME_PT = {
  Brazil: 'Brasil',
  'United States of America': 'Estados Unidos',
  Russia: 'Rússia',
  China: 'China',
  Argentina: 'Argentina',
  Colombia: 'Colômbia',
  Venezuela: 'Venezuela',
  France: 'França',
  'United Kingdom': 'Reino Unido',
  Germany: 'Alemanha',
  India: 'Índia',
  Ukraine: 'Ucrânia',
  Israel: 'Israel',
  Iran: 'Irã',
}

function colorFor(v) {
  if (v == null) return '#243042'
  if (v < 25) return '#3b5168'
  if (v < 50) return '#d4b41a'
  if (v < 75) return '#d4841a'
  return '#c0392b'
}

export default function GlobalHeatmap({ height = 380 }) {
  const [hover, setHover] = useState(null)

  return (
    <div className="relative" style={{ height }}>
      {hover && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-gray-700/50 bg-military-darker/90 px-3 py-1.5 text-xs">
          <span className="font-semibold">{hover.name}</span>
          <span className="muted"> · atividade {hover.value ?? '—'}/100</span>
        </div>
      )}
      <ComposableMap
        projectionConfig={{ scale: 130 }}
        height={height}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.name
              const value = ACTIVITY_BY_NAME[name]
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => setHover({ name: NAME_PT[name] || name, value })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { fill: colorFor(value), stroke: '#141c28', strokeWidth: 0.4, outline: 'none' },
                    hover: { fill: '#1a8ab8', outline: 'none', cursor: 'pointer' },
                    pressed: { fill: '#147fa8', outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      <div className="mt-2 flex items-center justify-center gap-3 text-[11px] muted">
        <Legend color="#3b5168" label="Baixa" />
        <Legend color="#d4b41a" label="Moderada" />
        <Legend color="#d4841a" label="Alta" />
        <Legend color="#c0392b" label="Crítica" />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  )
}
