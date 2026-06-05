import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { X } from 'lucide-react'
import { countryActivity } from '../../data/mockData'
import { countryProfiles } from '../../data/learnData'

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

export default function GlobalHeatmap({ height = 380, compare = false }) {
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(compare ? ['Brazil', 'United States of America'] : [])

  const toggleCountry = (name) => {
    if (!compare || !countryProfiles[name]) return
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= 2) return [prev[1], name] // mantém os 2 mais recentes
      return [...prev, name]
    })
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-gray-700/50 bg-military-darker/90 px-3 py-1.5 text-xs">
            <span className="font-semibold">{hover.name}</span>
            <span className="muted"> · atividade {hover.value ?? '—'}/100</span>
          </div>
        )}
        {compare && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-200">
            Clique em 2 países para comparar
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
                const isSelected = selected.includes(name)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHover({ name: NAME_PT[name] || name, value })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => toggleCountry(name)}
                    style={{
                      default: {
                        fill: isSelected ? '#1a8ab8' : colorFor(value),
                        stroke: isSelected ? '#64b1d0' : '#141c28',
                        strokeWidth: isSelected ? 1 : 0.4,
                        outline: 'none',
                      },
                      hover: { fill: '#1a8ab8', outline: 'none', cursor: compare ? 'pointer' : 'default' },
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

      {compare && <ComparePanel selected={selected} onRemove={(n) => setSelected((p) => p.filter((x) => x !== n))} />}
    </div>
  )
}

const METRICS = [
  { key: 'spendingUSD', label: 'Gasto militar', suffix: ' bi US$' },
  { key: 'pctGdp', label: '% do PIB', suffix: '%' },
  { key: 'personnelK', label: 'Efetivo ativo', suffix: ' mil' },
  { key: 'activity', label: 'Atividade', suffix: '/100' },
]

function ComparePanel({ selected, onRemove }) {
  const cols = selected.map((name) => ({ name, ...countryProfiles[name] }))

  return (
    <div className="mt-4 border-t border-gray-700/40 pt-4">
      {cols.length < 2 ? (
        <p className="text-center text-sm muted">
          Selecione {2 - cols.length} país{2 - cols.length > 1 ? 'es' : ''} no mapa para ver a comparação lado a lado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left text-xs uppercase muted">Indicador</th>
                {cols.map((c) => (
                  <th key={c.name} className="py-2 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold">{c.namePt}</span>
                      <button onClick={() => onRemove(c.name)} className="text-gray-500 hover:text-red-400" aria-label={`Remover ${c.namePt}`}>
                        <X size={13} />
                      </button>
                    </span>
                    <span className="block text-[10px] font-normal muted">{c.region}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const vals = cols.map((c) => c[m.key])
                const max = Math.max(...vals)
                return (
                  <tr key={m.key} className="border-t border-gray-700/30">
                    <td className="py-2.5 font-medium text-gray-300">{m.label}</td>
                    {cols.map((c, i) => (
                      <td key={c.name} className="py-2.5 text-right font-mono">
                        <span className={vals[i] === max ? 'font-bold text-brand-300' : 'text-gray-200'}>
                          {c[m.key]}{m.suffix}
                        </span>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
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
