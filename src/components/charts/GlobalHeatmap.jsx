import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { countryIntel, AMERICAS } from '../../data/countryNews'
import { apiOnline, viaPonte } from '../../services/apiBridge'
import CountryDossier from './CountryDossier'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Havia aqui um `ACTIVITY_BY_NAME`: catorze países com "intensidade" de 0 a
// 100 escrita à mão, que pintava o mapa quando a API não respondia — junto com
// o `risk` de `countryIntel`, da mesma origem.
//
// Um mapa de calor é a peça mais persuasiva de um painel de inteligência, e
// enchê-lo de número inventado é o pior lugar possível para fazê-lo: ninguém
// olha um país vermelho e pergunta de onde veio a cor. Sem servidor, o mapa
// fica cinza e o rodapé diz que está sem dados — a informação verdadeira.
function nameProps(name) {
  const intel = countryIntel[name]
  return { namePt: intel?.namePt || name, risk: null }
}

function colorFor(v) {
  if (v == null) return '#243042'
  if (v < 25) return '#2e7d46'
  if (v < 50) return '#caa733'
  if (v < 75) return '#d4841a'
  return '#c0392b'
}

// -----------------------------------------------------------------------------
// COBERTURA REAL POR PAÍS
//
// Este mapa pintava países por um "risco" de 0 a 100 digitado à mão em
// `countryNews.js` — 15 países com números que ninguém podia conferir e que
// não vinham de lugar nenhum. Um mapa de calor é a peça mais persuasiva de um
// painel de inteligência; enchê-lo de número inventado é o pior lugar
// possível para se fazer isso.
//
// Agora ele consome `/api/news/countries`, que conta quantas notícias
// COLETADAS mencionam cada país e devolve as manchetes que sustentam cada
// contagem. A escala vira relativa ao máximo observado: o país mais citado do
// período fica no topo, os demais proporcionalmente.
//
// A troca de significado é grande e a interface precisa dizê-la em voz alta:
// isto é VOLUME DE COBERTURA, não risco. Um país aparece mais porque a
// imprensa escreveu mais sobre ele — o que não é a mesma coisa que ser mais
// perigoso, e o leitor completa essa frase sozinho se ninguém completar por
// ele.
// -----------------------------------------------------------------------------
function useCoberturaPorPais() {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const d = await viaPonte('GET /news/countries', { days: 365 })
        if (vivo && d?.items?.length) setDados(d)
      } catch {
        // Sem API o mapa segue com o acervo local, e o rótulo diz isso.
      }
    })()
    return () => { vivo = false }
  }, [])

  return dados
}

export default function GlobalHeatmap({ height = 380, withNews = true }) {
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState('Brazil')
  const [priorityAmericas, setPriorityAmericas] = useState(true)

  const cobertura = useCoberturaPorPais()
  const aoVivo = !!cobertura

  // O mapa abria fixado no Brasil, que é justamente o único país sem contagem
  // (ver a nota em `useCoberturaPorPais`). Abrir num painel zerado faz o
  // recurso parecer quebrado logo no primeiro olhar. Com dado no ar, ele abre
  // no país mais coberto do período — que é a informação que o mapa existe
  // para dar.
  useEffect(() => {
    if (cobertura?.items?.length) setPinned(cobertura.items[0].nome)
  }, [cobertura])

  // Nome do país → o que sabemos dele. Com a API no ar, `valor` é a contagem
  // de menções normalizada de 0 a 100 pelo país mais citado; sem ela, é o
  // número do acervo local, e `aoVivo` diz qual dos dois está em tela.
  const porPais = useMemo(() => {
    if (!cobertura) return null
    const max = cobertura.maximo || 1
    return Object.fromEntries(cobertura.items.map((p) => [p.nome, {
      ...p,
      valor: Math.round((p.total / max) * 100),
    }]))
  }, [cobertura])

  const activeName = hover || pinned
  const active = activeName
    ? {
        name: activeName,
        ...nameProps(activeName),
        intel: countryIntel[activeName],
        // Com a API no ar, estes dois substituem o que vinha do acervo local.
        cobertura: porPais?.[activeName] || null,
        aoVivo,
      }
    : null

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
            {active.aoVivo ? (
              <span className="muted">
                {' · '}{active.cobertura?.total ?? 0} notícia(s) coletada(s)
              </span>
            ) : (
              <span className="muted"> · risco {active.risk ?? '—'}/100</span>
            )}
          </div>
        )}
        <ComposableMap projectionConfig={{ scale: 130 }} height={height} style={{ width: '100%', height: '100%' }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name
                const risk = porPais ? (porPais[name]?.valor ?? null) : nameProps(name).risk
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
                        // [ALTERADO] País selecionado: realce com anel DOURADO (em vez de azul)
                        fill: isActive ? '#147a43' : fill,
                        stroke: isActive ? '#caa733' : '#141c28',
                        strokeWidth: isActive ? 2 : 0.4,
                        outline: 'none',
                      },
                      hover: { fill: '#1f8a4c', outline: 'none', cursor: 'pointer' },
                      pressed: { fill: '#0f6537', outline: 'none' },
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
      {withNews && <CountryDossier pais={activeName} />}
    </div>
  )
}

// `CountryNewsPanel` vivia aqui: mostrava cinco manchetes e um selo de
// "relevancia para o Brasil" derivado de um Set de paises das Americas — uma
// classificacao escrita a mao, nao medida.
//
// Foi substituido por <CountryDossier />, que busca o dossie do pais no
// servidor: cobertura com tendencia contra o periodo anterior, distribuicao
// por categoria, noticias recentes e as vitimas de ransomware do territorio.
// Duas fontes independentes cruzadas pelo codigo ISO.

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  )
}
