import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Waves, Droplet, Ship, Radar, Anchor, AlertTriangle, ArrowRight, Link2, Globe2, Filter,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import InfoTooltip from '../components/ui/InfoTooltip'
import {
  blueAmazonFacts, blueAmazonPillars, blueAmazonThreats, THREAT_LEVELS, navalAssets,
} from '../data/blueAmazon'
import { geocorrenteBulletins } from '../data/geocorrenteData'

// Ícones dos pilares vêm como string no dado — mapeamos para o componente.
const PILLAR_ICONS = { Droplet, Ship, Radar, Anchor }

// Comparação de escala: mar sob jurisdição × território terrestre (mi km²).
const AREA_SEA = 5.7
const AREA_LAND = 8.5

// Por que a Amazônia Azul importa — cada item liga um ativo a uma consequência.
const WHY_IT_MATTERS = [
  {
    icon: Globe2,
    title: 'ZEE e Plataforma Continental',
    text: 'A Zona Econômica Exclusiva dá ao Brasil direitos sobre os recursos vivos e minerais até 200 milhas — e até 350 com a extensão da plataforma continental pleiteada na ONU.',
  },
  {
    icon: Droplet,
    title: 'Pré-sal e segurança energética',
    text: 'Cerca de 95% do petróleo nacional sai do mar. Uma interrupção nas plataformas atinge diretamente o abastecimento e a arrecadação do país.',
  },
  {
    icon: Link2,
    title: 'Cabos submarinos',
    text: 'Quase todo o tráfego de internet do Brasil viaja por cabos submarinos que aportam no litoral. São infraestrutura crítica com poucos pontos de entrada.',
  },
  {
    icon: Ship,
    title: 'Comércio exterior',
    text: 'Cerca de 95% das trocas com o mundo passam por portos e rotas marítimas. Rota fechada é economia parada, não apenas um problema militar.',
  },
]

const LEVEL_ORDER = ['Alto', 'Médio', 'Baixo']

// Datas dos boletins vêm em ISO; formatamos sem depender de fuso.
const isoToBR = (iso) => {
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

export default function BlueAmazon() {
  const [level, setLevel] = useState('todos')

  const threats = useMemo(
    () => (level === 'todos' ? blueAmazonThreats : blueAmazonThreats.filter((t) => t.level === level)),
    [level]
  )

  const totalAssets = useMemo(() => navalAssets.reduce((s, a) => s + a.count, 0), [])

  // Boletim mais recente da série Geocorrente.
  const latestBulletin = useMemo(
    () => [...geocorrenteBulletins].sort((a, b) => b.date.localeCompare(a.date))[0],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Waves}
        title="Amazônia Azul"
        description="Os 5,7 milhões de km² de mar sob jurisdição brasileira — petróleo, rotas, cabos e recursos que sustentam a economia e exigem poder naval e vigilância."
        help="Amazônia Azul é o nome dado pela Marinha ao conjunto formado pelo mar territorial, pela ZEE e pela plataforma continental brasileira."
        breadcrumb={[{ label: 'Brasil Estratégico' }, { label: 'Amazônia Azul' }]}
        badges={<Badge type="demo" />}
        meta={[
          { label: 'Ameaças monitoradas', value: String(blueAmazonThreats.length) },
          { label: 'Meios catalogados', value: String(totalAssets) },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {blueAmazonFacts.map((f) => (
          <MetricCard key={f.id} label={f.label} value={f.value} hint={f.hint} accent="brand" />
        ))}
      </div>

      {/* ESCALA — mar × terra */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
        className="card p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          Qual é o tamanho disso?
          <InfoTooltip text="Comparação de ordem de grandeza entre a área marítima sob jurisdição brasileira e o território terrestre do país." />
        </h2>
        <p className="mb-4 mt-1 text-sm muted">A área marítima equivale a cerca de dois terços do território terrestre.</p>
        <div className="space-y-3">
          <AreaBar label="Território terrestre" value={AREA_LAND} max={AREA_LAND} color="#2e7d46" />
          <AreaBar label="Amazônia Azul (mar)" value={AREA_SEA} max={AREA_LAND} color="#caa733" />
        </div>
        <p className="mt-3 text-xs muted">
          Valores arredondados em milhões de km². Somadas, terra e mar sob responsabilidade brasileira passam de 14 milhões de km².
        </p>
      </motion.section>

      {/* PILARES */}
      <section>
        <h2 className="mb-1 text-lg font-bold tracking-tight">Pilares estratégicos</h2>
        <p className="mb-4 text-sm muted">Os quatro eixos que sustentam a defesa do mar brasileiro.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {blueAmazonPillars.map((p) => {
            const Icon = PILLAR_ICONS[p.icon] || Waves
            return (
              <article key={p.title} className="card p-5">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/15 text-gold-600 dark:text-gold-400">
                  <Icon size={20} />
                </span>
                <h3 className="font-bold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{p.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* POR QUE IMPORTA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
        className="card p-5"
      >
        <h2 className="text-lg font-bold tracking-tight">Por que importa</h2>
        <p className="mb-4 text-sm muted">
          ZEE, pré-sal, cabos submarinos e comércio exterior formam uma única cadeia: quem controla o mar controla o funcionamento do país.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {WHY_IT_MATTERS.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-lg border border-white/10 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-military-green/15 text-emerald-600 dark:text-emerald-400">
                <item.icon size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-tight">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* AMEAÇAS + MEIOS NAVAIS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <AlertTriangle size={18} className="text-amber-500 dark:text-amber-400" /> Ameaças monitoradas
          </h2>
          <p className="mb-3 mt-1 text-sm muted">Riscos à soberania e aos recursos da Amazônia Azul.</p>

          <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar ameaças por nível">
            <span className="inline-flex items-center gap-1 text-xs muted"><Filter size={13} /> Nível:</span>
            <LevelChip active={level === 'todos'} onClick={() => setLevel('todos')} label="Todos" count={blueAmazonThreats.length} />
            {LEVEL_ORDER.map((lv) => (
              <LevelChip
                key={lv}
                active={level === lv}
                onClick={() => setLevel(lv)}
                label={lv}
                count={blueAmazonThreats.filter((t) => t.level === lv).length}
              />
            ))}
          </div>

          {threats.length ? (
            <div className="space-y-3">
              {threats.map((t) => (
                <article key={t.id} className="rounded-lg border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{t.name}</h3>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${THREAT_LEVELS[t.level]}`}>{t.level}</span>
                  </div>
                  <p className="mt-1 text-sm muted">{t.desc}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              tone="filter"
              icon={AlertTriangle}
              title={`Nenhuma ameaça de nível ${level}`}
              hint="Nenhum vetor do painel está classificado nesse nível no momento."
              action={{ label: 'Ver todos os níveis', onClick: () => setLevel('todos') }}
            />
          )}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Anchor size={18} className="text-gold-600 dark:text-gold-400" /> Ordem de batalha naval
            <InfoTooltip text="Resumo ilustrativo dos meios da Marinha do Brasil, incluindo unidades em serviço e em construção (PROSUB, Tamandaré). Aeronaves navais entram na contagem total." />
          </h2>
          <p className="mb-4 mt-1 text-sm muted">Capacidade aproximada por categoria de meio.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <caption className="sr-only">Meios navais por categoria, quantidade e observação</caption>
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase muted">
                  <th scope="col" className="py-2 pr-3">Categoria</th>
                  <th scope="col" className="py-2 pr-3 text-right">Meios</th>
                  <th scope="col" className="py-2">Observação</th>
                </tr>
              </thead>
              <tbody>
                {navalAssets.map((a) => (
                  <tr key={a.type} className="border-b border-white/[0.06]">
                    <td className="py-2 pr-3 font-semibold">{a.type}</td>
                    <td className="py-2 pr-3 text-right font-mono font-bold">{a.count}</td>
                    <td className="py-2 text-xs muted">{a.note}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-2 pr-3 text-xs font-bold uppercase tracking-wide muted">Total catalogado</td>
                  <td className="py-2 pr-3 text-right font-mono text-lg font-bold text-gold-600 dark:text-gold-400">{totalAssets}</td>
                  <td className="py-2 text-xs muted">meios e aeronaves</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      {/* BOLETIM GEOCORRENTE MAIS RECENTE */}
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <Radar size={18} className="text-gold-600 dark:text-gold-400" /> Boletim Geocorrente (EGN)
            <InfoTooltip text="Boletins no modelo da Escola de Guerra Naval, com análise geopolítica do ambiente marítimo. Conteúdo demonstrativo." />
          </h2>
          <Link to="/dados" className="text-xs font-semibold text-gold-600 hover:underline dark:text-gold-400">
            Ver série completa
          </Link>
        </div>
        <p className="mb-4 text-sm muted">Edição mais recente do acompanhamento geopolítico do ambiente marítimo.</p>

        <article className="rounded-lg border border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-bold text-gold-600 dark:text-gold-400">{latestBulletin.edition}</span>
            <span className="muted">{isoToBR(latestBulletin.date)}</span>
            <span className="chip">{latestBulletin.region}</span>
            <span className="chip">{latestBulletin.theme}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 font-bold ${
              latestBulletin.relevance === 'Alta' ? 'bg-military-red/15 text-red-600 dark:text-red-300' : 'bg-military-amber/15 text-amber-700 dark:text-amber-300'
            }`}>
              Relevância {latestBulletin.relevance}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold tracking-tight">{latestBulletin.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{latestBulletin.summary}</p>
        </article>
      </section>

      {/* CTA */}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-bold tracking-tight">Conheça os programas que protegem o mar brasileiro</h3>
          <p className="text-sm muted">PROSUB, fragatas Tamandaré e SisGAAz no acompanhamento de Programas Estratégicos.</p>
        </div>
        <Link to="/programas" className="btn-primary shrink-0">
          Ver programas <ArrowRight size={16} />
        </Link>
      </div>

      <p className="text-center text-xs muted">Dados ilustrativos — não constituem informação oficial da Marinha do Brasil.</p>
    </div>
  )
}

function AreaBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="font-mono muted">{value.toFixed(1)} mi km²</span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full bg-gray-500/20"
        role="img"
        aria-label={`${label}: ${value.toFixed(1)} milhões de km², ${pct}% da maior barra`}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function LevelChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-gold-500 bg-gold-500/15 text-gold-600 dark:text-gold-400'
          : 'border-white/10 muted hover:border-white/25'
      }`}
    >
      {label} <span className="font-mono opacity-70">({count})</span>
    </button>
  )
}
