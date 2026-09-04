import { useState } from 'react'
import {
  ShieldAlert, Building2, Landmark, Globe2, ExternalLink, Info, Users, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// AMEAÇAS CIBERNÉTICAS
//
// A plataforma declarava Cibersegurança entre as suas categorias e tinha dois
// artigos nela. Não por descuido da coleta: cibersegurança raramente vira
// manchete. O vazamento aparece no site de extorsão do grupo dias ou semanas
// antes de virar notícia — e quase sempre nunca vira.
//
// A tela é organizada por uma pergunta, e não pelo que a fonte oferece: O QUE
// FOI ATACADO NO BRASIL, E QUANTO ISSO IMPORTA. Por isso o Estado brasileiro
// vem primeiro, antes dos rankings — uma prefeitura ou uma secretaria de saúde
// atacada é o assunto desta plataforma; o total mundial é contexto.
// -----------------------------------------------------------------------------

const CRIT = {
  CRITICO: { rotulo: 'Crítico', cor: 'bg-red-500', chip: 'bg-red-500/15 text-red-800 dark:text-red-300' },
  ALTO: { rotulo: 'Alto', cor: 'bg-amber-500', chip: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  MEDIO: { rotulo: 'Médio', cor: 'bg-brand-500', chip: 'bg-brand-500/15 text-brand-700 dark:text-brand-300' },
  BAIXO: { rotulo: 'Baixo', cor: 'bg-gray-400', chip: 'bg-gray-500/15 text-gray-700 dark:text-gray-300' },
}

const JANELAS = [
  { id: 365, rotulo: '12 meses' },
  { id: 90, rotulo: '90 dias' },
  { id: 3650, rotulo: 'Tudo' },
]

export default function CyberThreats() {
  const [dias, setDias] = useState(365)
  const r = useResource(() => request('GET /cyber/ransomware', { params: { days: dias } }), [dias])
  const d = r.data
  const br = d?.brasil
  const vazio = d && d.acervo === 0

  const crit = Object.fromEntries((br?.porCriticidade || []).map((c) => [c.nivel, c.total]))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Ameaças Cibernéticas"
        description="Organizações brasileiras divulgadas por grupos de ransomware, com o Estado em primeiro plano e o quadro global como referência."
        help="Os registros vêm dos sites de extorsão dos próprios grupos, indexados pelo ransomware.live. Aparecer aqui é reivindicação de ataque, não confirmação da vítima."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Ameaças Cibernéticas' }]}
        badges={<Badge type={d?.acervo ? 'live' : 'demo'} />}
        actions={
          <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
            {JANELAS.map((j) => (
              <button
                key={j.id}
                onClick={() => setDias(j.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  dias === j.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {j.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <DataState
        loading={r.loading}
        error={r.error}
        empty={vazio}
        onRetry={r.refetch}
        emptyProps={{
          icon: ShieldAlert,
          title: 'Sem registros de ransomware',
          hint: 'A coleta ainda não trouxe dados desta fonte.',
        }}
      >
        {d && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Building2}
                label="Vítimas no Brasil"
                value={br.total}
                hint={`de ${br.totalHistorico} desde 2017`}
                accent={br.total ? 'amber' : 'green'}
              />
              <MetricCard
                icon={Landmark}
                label="Estado brasileiro"
                value={br.estado.length}
                hint="órgãos públicos, judiciário e militares"
                accent={br.estado.length ? 'red' : 'green'}
              />
              <MetricCard
                icon={ShieldAlert}
                label="Incidentes críticos"
                value={crit.CRITICO || 0}
                hint="infraestrutura crítica ou Estado"
                accent={crit.CRITICO ? 'red' : 'green'}
              />
              {/* Este cartão mostrava "Participação do Brasil", dividindo as
                  vítimas brasileiras pelas globais no NOSSO banco. Dava 66%.
                  A conta estava certa e o número era falso: coletamos TODAS as
                  brasileiras e só as 100 globais recentes, então o
                  denominador era enviesado por construção — a participação
                  real do Brasil no índice é da ordem de 2%.
                  Amostra enviesada não vira percentual. */}
              <MetricCard
                icon={Globe2}
                label="Base do índice"
                value={d.indice?.vitimas ? d.indice.vitimas.toLocaleString('pt-BR') : '—'}
                hint={d.indice?.grupos ? `${d.indice.grupos} grupos acompanhados no mundo` : 'total do ransomware.live'}
              />
            </div>

            <p className="flex items-start gap-2 rounded-lg border-l-4 border-l-amber-500 bg-amber-500/5 px-4 py-3 text-sm">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{d.nota}</span>
            </p>

            {/* ── O ESTADO BRASILEIRO — o que esta plataforma existe para ver ── */}
            {br.estado.length > 0 && (
              <section className="card border-l-4 border-l-red-500 p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Landmark size={18} className="text-red-600 dark:text-red-400" />
                  Estado brasileiro atacado
                  <InfoTooltip text="Identificado pelo domínio — .gov.br, .mil.br, .jus.br, .leg.br. É fato verificável no próprio endereço, não inferência a partir do nome." />
                </h2>
                <p className="mt-1 text-sm muted">
                  Órgãos públicos, judiciário e forças cujo vazamento foi divulgado. Histórico
                  completo, independente da janela selecionada.
                </p>
                <ul className="mt-4 divide-y divide-gray-200 dark:divide-white/10">
                  {br.estado.map((e) => (
                    <li key={e.external_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <span className="font-mono text-xs muted">{formatDateBR(e.discovered_at)}</span>
                      <span className="font-semibold">{e.victim}</span>
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-800 dark:text-red-300">
                        {e.group}
                      </span>
                      <span className="ml-auto text-xs muted">{e.criticality_reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── CRITICIDADE ── */}
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Activity size={18} className="text-brand-400 dark:text-brand-300" />
                Distribuição por criticidade
                <InfoTooltip text={d.escala} />
              </h2>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full">
                {['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((n) => {
                  const q = crit[n] || 0
                  if (!q || !br.total) return null
                  return (
                    <span
                      key={n}
                      className={CRIT[n].cor}
                      style={{ width: `${(q / br.total) * 100}%` }}
                      title={`${CRIT[n].rotulo}: ${q}`}
                    />
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map((n) => (
                  <span key={n} className="flex items-center gap-1.5">
                    <i className={`h-2.5 w-2.5 rounded-full ${CRIT[n].cor}`} />
                    {CRIT[n].rotulo}
                    <strong className="font-mono tabular-nums">{crit[n] || 0}</strong>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs muted">{d.escala}</p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Ranking
                titulo="Grupos que mais atacam o Brasil"
                subtitulo="Quantas organizações brasileiras cada grupo divulgou na janela."
                itens={br.porGrupo}
              />
              <Ranking
                titulo="Setores mais atingidos no Brasil"
                subtitulo="Classificação da própria fonte, em 14 setores."
                itens={br.porSetor}
              />
            </div>

            {/* ── SÉRIE ANUAL ── */}
            {br.porAno.length > 1 && (
              <section className="card p-5">
                <h2 className="text-lg font-bold tracking-tight">Vítimas brasileiras por ano</h2>
                <p className="mt-1 text-sm muted">
                  Divulgações registradas desde que o índice acompanha o país. O ano corrente está
                  incompleto.
                </p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...br.porAno].reverse()} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-300 dark:text-white/10" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11 }} stroke="currentColor" className="muted" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="muted" />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [`${v} organizações`, 'Divulgadas']}
                      />
                      <Bar dataKey="total" fill="#c0392b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── LISTA COMPLETA ── */}
            <section className="card p-5">
              <h2 className="text-lg font-bold tracking-tight">
                Organizações brasileiras divulgadas
              </h2>
              <p className="mt-1 text-sm muted">
                Ordenadas pela data em que o grupo publicou o vazamento — não pela data do ataque,
                que costuma ser semanas antes e nem sempre é informada.
              </p>

              {br.itens.length === 0 ? (
                <p className="mt-3 text-sm muted">
                  Nenhuma organização brasileira foi divulgada na janela. Isso não significa
                  ausência de incidentes: significa ausência de divulgação pública.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                        <th className="py-2 pr-3 font-semibold">Divulgado</th>
                        <th className="py-2 pr-3 font-semibold">Organização</th>
                        <th className="py-2 pr-3 font-semibold">Grupo</th>
                        <th className="py-2 pr-3 font-semibold">Setor</th>
                        <th className="py-2 pr-3 font-semibold">Criticidade</th>
                        <th className="py-2 font-semibold">Fonte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {br.itens.map((v) => (
                        <tr key={v.external_id} className="border-b border-gray-100 dark:border-white/[0.06]">
                          <td className="py-2 pr-3 font-mono text-xs muted">
                            {v.discovered_at ? formatDateBR(v.discovered_at) : '—'}
                          </td>
                          <td className="py-2 pr-3 font-medium">{v.victim}</td>
                          <td className="py-2 pr-3">
                            <span className="rounded-full bg-gray-500/15 px-2 py-0.5 font-mono text-[11px]">
                              {v.group || '—'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-xs muted">{v.sector || '—'}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CRIT[v.criticality]?.chip || ''}`}
                              title={v.criticality_reason}
                            >
                              {CRIT[v.criticality]?.rotulo || '—'}
                            </span>
                          </td>
                          <td className="py-2">
                            {v.post_url ? (
                              <a
                                href={v.post_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                              >
                                ver <ExternalLink size={11} />
                              </a>
                            ) : <span className="text-xs muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* "na amostra" e não "no mundo": o banco guarda todas as vítimas
                brasileiras e apenas as 100 globais mais recentes. O ranking
                ordena corretamente entre si, mas não é o quadro mundial. */}
            <Ranking
              titulo="Grupos mais ativos na amostra recente"
              subtitulo={`Ordenados entre si dentro das ${d.global.amostra} divulgações que a coleta trouxe na janela — não é o ranking mundial.`}
              itens={d.global.porGrupo}
              icone={Users}
            />

            <p className="text-center text-xs muted">
              Fonte: {d.fonte}.
              {d.ultimaColeta && ` Última coleta em ${formatDateBR(d.ultimaColeta)}.`}
            </p>
          </>
        )}
      </DataState>
    </div>
  )
}

function Ranking({ titulo, subtitulo, itens, icone: Icone }) {
  const max = Math.max(...itens.map((i) => i.total), 1)
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        {Icone && <Icone size={18} className="text-brand-400 dark:text-brand-300" />}
        {titulo}
      </h2>
      <p className="mt-1 text-sm muted">{subtitulo}</p>
      {!itens.length && <p className="mt-3 text-sm muted">Sem registros na janela.</p>}
      <div className="mt-4 space-y-2">
        {itens.map((i) => (
          <div key={i.nome} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate" title={i.nome}>{i.nome}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(i.total / max) * 100}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums">{i.total}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
