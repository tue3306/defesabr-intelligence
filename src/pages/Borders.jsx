import { useState, useMemo } from 'react'
import { Shield, TrendingUp, TrendingDown, Minus, Radar, Crosshair, MapPin, Filter, X, Satellite } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  borderFacts, borderSegments, PRESSURE_LEVELS, borderThreats, borderOperations, borderResults,
} from '../data/borderData'

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus }
const TREND_CLR = {
  up: 'text-red-600 dark:text-red-400',
  down: 'text-emerald-600 dark:text-emerald-400',
  flat: 'text-gray-500 dark:text-gray-400',
}
const TREND_LABEL = { up: 'Em piora', down: 'Em melhora', flat: 'Estável' }

// Cor sólida por nível de pressão — usada na régua de segmentos.
const PRESSURE_COLOR = { Alto: '#c0392b', 'Médio': '#d4841a', Baixo: '#2e7d46' }
const PRESSURE_ORDER = ['Alto', 'Médio', 'Baixo']

export default function Borders() {
  const [pressure, setPressure] = useState('')

  const segments = useMemo(
    () => (pressure ? borderSegments.filter((s) => s.pressure === pressure) : borderSegments),
    [pressure]
  )

  // Distribuição da faixa por nível de pressão — a régua do panorama.
  const ruler = useMemo(() => {
    const total = borderSegments.length || 1
    return PRESSURE_ORDER.map((level) => {
      const list = borderSegments.filter((s) => s.pressure === level)
      return { level, count: list.length, share: Math.round((list.length / total) * 100) }
    }).filter((r) => r.count > 0)
  }, [])

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="card overflow-hidden">
        <div className="on-dark bg-gradient-to-br from-[#1a3a1f] via-military-card to-brand-900/40 p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-military-green/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">
            <Shield size={14} /> Segurança da faixa de fronteira
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Fronteiras & Amazônia</h1>
          <p className="mt-2 max-w-2xl text-gray-300">
            Os ~16,8 mil km de fronteira terrestre e a Amazônia como questão de segurança nacional —
            monitorados pelo SISFRON e por operações interagências como a Ágata.
          </p>
        </div>
      </div>

      {/* FATOS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {borderFacts.map((f) => (
          <MetricCard key={f.label} label={f.label} value={f.value} hint={f.hint} accent="green" />
        ))}
      </div>

      {/* ARCOS / SEGMENTOS — "mini-mapa" esquemático do Brasil */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight">
          <MapPin size={20} className="text-brand-400" /> Arcos de fronteira
          <InfoTooltip text="A faixa de fronteira é organizada em arcos (Norte, Central e Sul). O nível de pressão indica a intensidade de ilícitos e tensões em cada trecho." />
        </h2>
        <p className="mb-4 text-sm muted">Pressão por trecho — do Arco Norte amazônico à Tríplice Fronteira.</p>

        {/* RÉGUA DA FAIXA — proporção dos trechos por nível de pressão */}
        <div className="card mb-4 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">
            Distribuição da faixa por nível de pressão
          </p>
          <div className="flex h-6 overflow-hidden rounded-lg" role="img" aria-label="Proporção dos trechos de fronteira por nível de pressão">
            {ruler.map((r) => (
              <div
                key={r.level}
                className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                style={{ width: `${r.share}%`, background: PRESSURE_COLOR[r.level] }}
                title={`${r.level}: ${r.count} trecho(s)`}
              >
                {r.share >= 15 ? `${r.level} · ${r.count}` : r.count}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase muted">
              <Filter size={12} /> Filtrar
            </span>
            {PRESSURE_ORDER.map((level) => (
              <button
                key={level}
                onClick={() => setPressure(pressure === level ? '' : level)}
                aria-pressed={pressure === level}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${PRESSURE_LEVELS[level]} ${
                  pressure === level ? 'ring-2 ring-gold-500/60' : ''
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: PRESSURE_COLOR[level] }} />
                Pressão {level}
              </button>
            ))}
            {pressure && (
              <button onClick={() => setPressure('')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold muted hover:text-brand-400">
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </div>

        {segments.length === 0 ? (
          <EmptyState
            icon={MapPin}
            tone="filter"
            title="Nenhum trecho com esse nível de pressão"
            hint="Escolha outro nível para ver os segmentos correspondentes."
            action={{ label: 'Limpar filtro', onClick: () => setPressure(''), icon: X }}
            compact
          />
        ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold tracking-tight">{s.name}</h3>
                  <p className="text-xs muted">Limite com {s.countries}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${PRESSURE_LEVELS[s.pressure]}`}>{s.pressure}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.threats.map((t) => (
                  <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* AMEAÇAS COMO QUESTÃO DE SEGURANÇA */}
      <section className="card p-5">
        <h2 className="mb-1 text-base font-bold tracking-tight">Ameaças como questão de segurança nacional</h2>
        <p className="mb-4 text-sm muted">Tendência recente de cada vetor (▲ piora · ▼ melhora).</p>
        <div className="space-y-3">
          {borderThreats.map((t) => {
            const Icon = TREND_ICON[t.trend]
            return (
              <div key={t.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <Icon size={18} className={`mt-0.5 shrink-0 ${TREND_CLR[t.trend]}`} />
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {t.name}
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${TREND_CLR[t.trend]}`}>
                      {TREND_LABEL[t.trend]}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-sm muted">{t.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* OPERAÇÕES + RESULTADOS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <Crosshair size={18} className="text-brand-400" /> Operações em curso
          </h2>
          <p className="mb-4 text-sm muted">Ações interagências de presença e interdição.</p>
          <div className="space-y-3">
            {borderOperations.map((o) => (
              <div key={o.name} className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{o.name}</h3>
                  <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300">{o.frequency}</span>
                </div>
                <p className="mt-1 text-sm muted">{o.scope}</p>
                <p className="mt-1 text-xs muted">Forças: {o.forces}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <Radar size={18} className="text-brand-400" /> Resultados consolidados
          </h2>
          <p className="mb-4 text-sm muted">Números agregados das operações (ilustrativo).</p>
          <div className="grid grid-cols-2 gap-4">
            {borderResults.map((r) => (
              <MetricCard key={r.label} label={r.label} value={r.value} accent={r.accent} />
            ))}
          </div>
          <div className="card mt-4 p-4">
            <p className="text-sm font-semibold text-brand-300">📍 Por que é estratégico</p>
            <p className="mt-1 text-sm text-gray-300">
              A fronteira e a Amazônia concentram soberania, recursos naturais e rotas do crime organizado
              transnacional. Presença estatal e tecnologia (SISFRON) ampliam o controle do território.
            </p>
          </div>
        </section>
      </div>

      {/* SISFRON — o que sustenta o monitoramento */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Satellite size={18} className="text-brand-400" /> O que é o SISFRON
          <InfoTooltip text="Sistema Integrado de Monitoramento de Fronteiras — programa do Exército Brasileiro para dar consciência situacional à faixa de fronteira." />
        </h2>
        <p className="mb-4 text-sm muted">
          Vigiar 16,8 mil km de fronteira com presença física em cada ponto é impossível. O SISFRON
          troca presença contínua por consciência situacional: sensores, comunicações e comando-e-controle
          que dizem <em>onde</em> vale a pena estar.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { title: 'Sensoriamento', text: 'Radares, sensores ópticos e vetores aéreos remotamente pilotados cobrindo trechos críticos.' },
            { title: 'Comunicações', text: 'Rede própria que conecta unidades avançadas aos centros de comando, inclusive em área remota.' },
            { title: 'Comando e controle', text: 'Integração das informações com os órgãos parceiros para decidir o emprego dos meios.' },
          ].map((pillar) => (
            <div key={pillar.title} className="rounded-lg bg-white/5 p-3">
              <p className="text-sm font-bold tracking-tight">{pillar.title}</p>
              <p className="mt-1 text-xs leading-relaxed muted">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs muted">Dados demonstrativos para fins de visualização.</p>
    </div>
  )
}
