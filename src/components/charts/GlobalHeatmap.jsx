import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Newspaper, MapPin, Flag } from 'lucide-react'
import { countryActivity } from '../../data/mockData'
import { countryIntel, AMERICAS } from '../../data/countryNews'
import { apiOnline, viaPonte } from '../../services/apiBridge'
import { categoryColor , textoSobre } from '../../utils/textUtils'

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
      {withNews && <CountryNewsPanel active={active} aoVivo={aoVivo} />}
    </div>
  )
}

function CountryNewsPanel({ active, aoVivo }) {
  if (!active) {
    return <p className="mt-4 border-t border-gray-700/40 pt-4 text-center text-sm muted">Selecione um país no mapa.</p>
  }
  const { name, namePt, risk, intel } = active
  // [ALTERADO] Relevância do país para o Brasil
  const relevance = name === 'Brazil' ? 'País-foco' : AMERICAS.has(name) ? 'Alta' : 'Média'
  const relColor = relevance === 'Alta' ? '#2e7d46' : relevance === 'Média' ? '#caa733' : '#147a43'
  const noticias = aoVivo ? (active.cobertura?.exemplos || []) : (intel?.news || [])
  return (
    <div className="mt-4 border-t border-gray-700/40 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <MapPin size={16} className="text-brand-400 dark:text-brand-300" /> {namePt}
        </h3>
        <div className="flex items-center gap-2">
          {/* A cor de relevância vai para a BORDA e o fundo; o texto herda o
              tema. Como cor de texto ela caía a 2,7:1 no escuro. */}
          <span
            className="rounded-full border px-2 py-0.5 text-xs font-semibold text-gray-900 dark:text-gray-100"
            style={{ borderColor: relColor, background: `${relColor}26` }}
          >
            Relevância p/ Brasil: {relevance}
          </span>
          {/* O selo muda de fundo conforme o valor. Texto branco fixo dava
              2,3:1 sobre os tons claros da faixa média; a cor do texto segue a
              luminância do próprio fundo, que é a única forma de acertar nos
              dois extremos.

              O RÓTULO muda com a origem do dado, e isso não é detalhe: com a
              API no ar o número é contagem de notícias coletadas, e chamá-lo
              de "risco" seria vender uma medida que ninguém fez. */}
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: colorFor(risk), color: textoSobre(colorFor(risk)) }}
          >
            {aoVivo
              ? `${active.cobertura?.total ?? 0} notícia(s)`
              : `risco ${risk ?? '—'}/100`}
          </span>
        </div>
      </div>

      {intel?.brazil && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
          <Flag size={13} className="mt-0.5 shrink-0" />
          <span><strong>Relação com o Brasil:</strong> {intel.brazil}</span>
        </p>
      )}

      {/* Com a API no ar, as manchetes são as que a coleta encontrou citando
          este país — clicáveis, com data e categoria reais. Sem ela, caem as
          fichas do acervo local. */}
      {noticias.length ? (
        <ul className="space-y-2">
          {noticias.map((n, i) => (
            <li key={n.id ?? i} className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2">
              <Newspaper size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="min-w-0">
                {n.url ? (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-gray-900 hover:underline dark:text-gray-200"
                  >
                    {n.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{n.title}</p>
                )}
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(n.category) }} />
                  {n.category || 'Sem categoria'} · {n.date ? new Date(n.date).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm muted">
          {!aoVivo
            ? 'Sem fichas de notícias para este país na demonstração.'
            : name === 'Brazil'
              // O Brasil não é contado de propósito, e a tela precisa dizer por
              // quê: todo o acervo é sobre ele. Incluí-lo somaria ~150 menções
              // contra 16 do segundo colocado, e o mapa inteiro viraria uma
              // mancha só — a escala é relativa ao máximo.
              ? 'O Brasil não entra na contagem: o acervo inteiro é sobre ele. '
                + 'Este mapa mostra quais OUTROS países a cobertura brasileira de defesa cita.'
              : 'Nenhuma notícia coletada no período menciona este país.'}
        </p>
      )}

      {aoVivo && (
        <p className="mt-3 text-[11px] muted">
          A cor do mapa mede <strong>volume de cobertura</strong> — quantas notícias coletadas
          citam cada país —, não risco, tensão ou atividade militar.
        </p>
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
