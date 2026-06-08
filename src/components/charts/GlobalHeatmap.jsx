import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Newspaper, MapPin, Flag } from 'lucide-react'
import { countryActivity } from '../../data/mockData'
import { countryIntel, AMERICAS } from '../../data/countryNews'
import { categoryColor } from '../../utils/textUtils'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

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

function nameProps(name) {
  const intel = countryIntel[name]
  return { namePt: intel?.namePt || name, risk: intel?.risk ?? ACTIVITY_BY_NAME[name] ?? null }
}

function colorFor(v) {
  if (v == null) return '#243042'
  if (v < 25) return '#2e7d46'
  if (v < 50) return '#caa733'
  if (v < 75) return '#d4841a'
  return '#c0392b'
}

export default function GlobalHeatmap({ height = 380, withNews = true }) {
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState('Brazil')
  const [priorityAmericas, setPriorityAmericas] = useState(true)

  const activeName = hover || pinned
  const active = activeName ? { name: activeName, ...nameProps(activeName), intel: countryIntel[activeName] } : null

  return (
    <div>
      {/* Controles */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium muted">
          <input
            type="checkbox"
            checked={priorityAmericas}
            onChange={(e) => setPriorityAmericas(e.target.checked)}
            className="accent-brand-500"
          />
          Priorizar Américas
        </label>
        <span className="text-xs muted">Passe o cursor ou clique em um país para ver as notícias.</span>
      </div>

      <div className="relative" style={{ height }}>
        {active && (
          <div className="on-dark pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-gray-700/50 bg-military-darker/90 px-3 py-1.5 text-xs">
            <span className="font-semibold">{active.namePt}</span>
            <span className="muted"> · risco {active.risk ?? '—'}/100</span>
            {active.intel?.news?.length ? <span className="muted"> · {active.intel.news.length} notícia(s)</span> : null}
          </div>
        )}
        <ComposableMap projectionConfig={{ scale: 130 }} height={height} style={{ width: '100%', height: '100%' }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name
                const { risk } = nameProps(name)
                const dimmed = priorityAmericas && !AMERICAS.has(name)
                const isActive = activeName === name
                const fill = dimmed ? '#222c3a' : colorFor(risk)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHover(name)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setPinned(name)}
                    style={{
                      default: {
                        fill: isActive ? '#2b6cb0' : fill,
                        stroke: isActive ? '#74a4df' : '#141c28',
                        strokeWidth: isActive ? 1 : 0.4,
                        outline: 'none',
                      },
                      hover: { fill: '#2b6cb0', outline: 'none', cursor: 'pointer' },
                      pressed: { fill: '#235a96', outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] muted">
        <Legend color="#2e7d46" label="Baixo" />
        <Legend color="#caa733" label="Moderado" />
        <Legend color="#d4841a" label="Alto" />
        <Legend color="#c0392b" label="Crítico" />
        {priorityAmericas && <Legend color="#222c3a" label="Fora do foco" />}
      </div>

      {/* Painel de notícias do país ativo */}
      {withNews && <CountryNewsPanel active={active} />}
    </div>
  )
}

function CountryNewsPanel({ active }) {
  if (!active) {
    return <p className="mt-4 border-t border-gray-700/40 pt-4 text-center text-sm muted">Selecione um país no mapa.</p>
  }
  const { name, namePt, risk, intel } = active
  // [ALTERADO] Relevância do país para o Brasil
  const relevance = name === 'Brazil' ? 'País-foco' : AMERICAS.has(name) ? 'Alta' : 'Média'
  const relColor = relevance === 'Alta' ? '#2e7d46' : relevance === 'Média' ? '#caa733' : '#2b6cb0'
  return (
    <div className="mt-4 border-t border-gray-700/40 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <MapPin size={16} className="text-brand-400" /> {namePt}
        </h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-gray-600/50 px-2 py-0.5 text-xs font-semibold" style={{ color: relColor }}>
            Relevância p/ Brasil: {relevance}
          </span>
          <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: colorFor(risk) }}>
            risco {risk ?? '—'}/100
          </span>
        </div>
      </div>

      {intel?.brazil && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
          <Flag size={13} className="mt-0.5 shrink-0" />
          <span><strong>Relação com o Brasil:</strong> {intel.brazil}</span>
        </p>
      )}

      {intel?.news?.length ? (
        <ul className="space-y-2">
          {intel.news.map((n, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2">
              <Newspaper size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200">{n.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(n.category) }} />
                  {n.category} · {n.date}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm muted">Sem fichas de notícias para este país na demonstração.</p>
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
