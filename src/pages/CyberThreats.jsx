import { useState } from 'react'
import { setorPt } from '../utils/textUtils'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, Building2, Landmark, Globe2, ExternalLink, Info, Users, Activity, Bug,
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

// INCIDENTES NO BRASIL — o que foi atacado no país e quanto isso importa.
// O Estado brasileiro vem antes dos rankings; o total mundial é só contexto.

// TIPO DE ALVO — quem a organização atingida é, pelos critérios de
// server/src/lib/criticidade.js (o campo continua se chamando `criticality`).
// Não é urgência de notícia nem nível de alerta: por isso o nome e a paleta são
// outros. A escala é de um tom só (violeta), do mais escuro ao mais claro, e o
// que separa os degraus é a luminosidade — continua legível com daltonismo,
// sem depender do modo daltônico. O rótulo vai sempre escrito ao lado da cor.
const ALVO = {
  CRITICO: {
    rotulo: 'Estado ou infraestrutura crítica',
    curto: 'Estado ou infraestrutura',
    descricao: 'órgão público (.gov.br, .mil.br, .jus.br, .leg.br) ou setor de governo e defesa, energia ou saúde',
    cor: 'bg-violet-800 dark:bg-violet-300',
    chip: 'bg-violet-700/15 text-violet-900 dark:bg-violet-300/20 dark:text-violet-100',
  },
  ALTO: {
    rotulo: 'Serviço essencial, ensino ou ONG',
    curto: 'Serviço essencial',
    descricao: 'transporte, finanças ou educação, ensino superior (.edu.br) ou organização sem fins lucrativos (.org.br)',
    cor: 'bg-violet-500 dark:bg-violet-500',
    chip: 'bg-violet-500/10 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200',
  },
  MEDIO: {
    rotulo: 'Empresa',
    curto: 'Empresa',
    descricao: 'empresa brasileira (.com.br) ou de outro setor produtivo',
    cor: 'bg-violet-300 dark:bg-violet-800',
    chip: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
  },
  BAIXO: {
    rotulo: 'Não identificado',
    curto: 'Não identificado',
    descricao: 'sem setor nem domínio que permitam classificar',
    cor: 'bg-gray-300 dark:bg-gray-600',
    chip: 'text-gray-600 dark:text-gray-400',
  },
}
const ORDEM_ALVO = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']

// A lista de órgãos públicos vem do servidor com todo o histórico (as 20
// divulgações mais recentes); o recorte de tempo dela é feito aqui.
const JANELAS_ORGAOS = [
  { id: 30, rotulo: '30 dias' },
  { id: 365, rotulo: '12 meses' },
  { id: 0, rotulo: 'Tudo' },
]
const LIMITE_ORGAOS = 20

const JANELAS = [
  { id: 365, rotulo: '12 meses' },
  { id: 90, rotulo: '90 dias' },
  { id: 3650, rotulo: 'Tudo' },
]

/** "nos últimos 90 dias", "nos últimos 12 meses" ou, na janela "Tudo", "em todo o histórico". */
const periodoTexto = (dias) => {
  if (dias >= 3650) return 'em todo o histórico'
  return dias === 365 ? 'nos últimos 12 meses' : `nos últimos ${dias} dias`
}

export default function CyberThreats() {
  const [dias, setDias] = useState(365)
  const r = useResource(() => request('GET /cyber/ransomware', { params: { days: dias } }), [dias], { keepPreviousData: true })
  const d = r.data
  const br = d?.brasil
  const vazio = d && d.acervo === 0

  const crit = Object.fromEntries((br?.porCriticidade || []).map((c) => [c.nivel, c.total]))
  const [janelaOrgaos, setJanelaOrgaos] = useState(0)
  const orgaos = (br?.estado || []).filter((e) => {
    if (!janelaOrgaos) return true
    const t = Date.parse(e.discovered_at)
    return Number.isFinite(t) && Date.now() - t <= janelaOrgaos * 86400000
  })
  // Se veio o limite cheio, pode haver mais órgãos antes do mais antigo listado.
  const orgaosNoLimite = (br?.estado?.length || 0) >= LIMITE_ORGAOS

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Incidentes no Brasil"
        description="Organizações brasileiras que grupos criminosos dizem ter atacado, com os órgãos públicos em primeiro lugar. O quadro mundial fica no fim, como referência."
        help="Os registros vêm dos sites de extorsão dos próprios grupos, reunidos pelo ransomware.live."
        breadcrumb={[{ label: 'Ataques cibernéticos' }, { label: 'Incidentes no Brasil' }]}
        badges={<Badge type={d?.acervo ? 'live' : 'sem-dado'} cadencia={d?.acervo ? 'a cada 30 min' : undefined} />}
        actions={
          <div role="group" aria-label="Período" className="flex gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
            {JANELAS.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setDias(j.id)}
                aria-pressed={dias === j.id}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
                  dias === j.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {j.rotulo}
              </button>
            ))}
          </div>
        }
      />

      {/* UM SÓ BLOCO DE LEITURA: o que é ransomware + a ressalva da fonte.
        * A ressalva (reivindicação ≠ confirmação) vem do servidor em `d.nota`. */}
      <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 p-4 text-sm leading-relaxed">
        <Info size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 space-y-1.5">
          <p>
            <strong>Ransomware</strong> é o ataque em que criminosos sequestram os dados de uma organização
            e cobram resgate. Quem não paga tem o nome divulgado no site do grupo.
          </p>
          {d?.nota && <p className="muted">{d.nota}</p>}
        </div>
      </div>

      <DataState
        loading={r.loading && !r.data}
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
                hint={`organizações ${periodoTexto(dias)}; ${br.totalHistorico} desde 2017`}
                accent={br.total ? 'amber' : 'green'}
              />
              <MetricCard
                icon={Landmark}
                label="Órgãos públicos atacados"
                value={br.estado.length}
                hint={orgaosNoLimite
                  ? `os ${LIMITE_ORGAOS} mais recentes desde 2017; pode haver mais`
                  : 'governo, judiciário e forças armadas, desde 2017'}
                accent={br.estado.length ? 'red' : 'green'}
              />
              <MetricCard
                icon={ShieldAlert}
                label="Estado ou infraestrutura crítica"
                value={crit.CRITICO || 0}
                hint={`vítimas com este tipo de alvo ${periodoTexto(dias)}`}
                accent={crit.CRITICO ? 'brand' : 'green'}
              />
              {/* Sem "participação do Brasil" em %: a amostra global coletada é
                  parcial (só as 100 mais recentes), e o percentual sairia enviesado. */}
              <MetricCard
                icon={Globe2}
                label="Vítimas no mundo"
                value={d.indice?.vitimas ? d.indice.vitimas.toLocaleString('pt-BR') : '—'}
                hint={d.indice?.grupos ? `todo o histórico do índice; ${d.indice.grupos} grupos acompanhados` : 'todo o histórico do ransomware.live'}
              />
            </div>

            {/* ── O ESTADO BRASILEIRO — o que esta plataforma existe para ver ── */}
            {br.estado.length > 0 && (
              <section className="card border-l-4 border-l-red-500 p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Landmark size={18} className="text-red-600 dark:text-red-400" aria-hidden="true" />
                  Órgãos públicos atacados
                  <InfoTooltip text="Identificados pelo endereço do site — .gov.br, .mil.br, .jus.br, .leg.br. É um fato que dá para conferir no próprio endereço, não um palpite pelo nome." />
                </h2>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 max-w-prose text-sm muted">
                    Governo, judiciário e forças armadas com vazamento divulgado. Esta lista tem período
                    próprio, separado do seletor do topo da página
                    {orgaosNoLimite && `, e traz só as ${LIMITE_ORGAOS} divulgações mais recentes`}.
                  </p>
                  <div role="group" aria-label="Período da lista de órgãos públicos" className="flex shrink-0 gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-white/15">
                    {JANELAS_ORGAOS.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => setJanelaOrgaos(j.id)}
                        aria-pressed={janelaOrgaos === j.id}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ${
                          janelaOrgaos === j.id ? 'bg-gold-500 text-military-darker' : 'muted hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {j.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs muted" aria-live="polite">
                  {orgaos.length === 1 ? '1 órgão público' : `${orgaos.length} órgãos públicos`}
                  {janelaOrgaos ? ` nos últimos ${janelaOrgaos === 365 ? '12 meses' : `${janelaOrgaos} dias`}` : ' desde 2017'}
                </p>
                {orgaos.length === 0 && (
                  <p className="mt-2 text-sm muted">
                    Nenhum órgão público teve vazamento divulgado neste período. Escolha um período maior.
                  </p>
                )}
                <ul className="mt-2 divide-y divide-gray-200 dark:divide-white/10">
                  {orgaos.map((e) => (
                    <li key={e.external_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <span className="font-mono text-xs tabular-nums muted">{formatDateBR(e.discovered_at)}</span>
                      {/* `victimBruto` (só quando a limpeza mudou o nome) fica no title:
                        * quem quiser conferir o que a fonte publicou, confere. */}
                      <span className="font-semibold" title={e.victimBruto ? `Publicado pelo grupo como: ${e.victimBruto}` : undefined}>
                        {e.victim}
                      </span>
                      <span
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300"
                        title={`Grupo que reivindicou o ataque: ${e.group}`}
                      >
                        <span className="font-normal">grupo </span>
                        <span className="font-mono">{e.group}</span>
                      </span>
                      <span className="ml-auto text-xs muted">{e.criticality_reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── TIPO DE ALVO (campo `criticality`) ── */}
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Activity size={18} className="text-violet-700 dark:text-violet-300" aria-hidden="true" />
                Quem foi atingido, por tipo de alvo
              </h2>
              <p className="mt-1 max-w-prose text-sm muted">
                Diz <strong>que tipo de organização</strong> foi atingida {periodoTexto(dias)}, não o tamanho
                do estrago nem a urgência. Sai do endereço do site e do setor informado pela fonte.
              </p>
              <div className="mt-4 flex h-3 gap-px overflow-hidden rounded-full" aria-hidden="true">
                {ORDEM_ALVO.map((n) => {
                  const q = crit[n] || 0
                  if (!q || !br.total) return null
                  return (
                    <span
                      key={n}
                      className={ALVO[n].cor}
                      style={{ width: `${(q / br.total) * 100}%` }}
                      title={`${ALVO[n].rotulo}: ${q}`}
                    />
                  )
                })}
              </div>
              <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {ORDEM_ALVO.map((n) => (
                  <li key={n} className="flex items-start gap-2">
                    <i className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ALVO[n].cor}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="font-semibold">{ALVO[n].rotulo}</span>{' '}
                      <strong className="font-mono tabular-nums">{crit[n] || 0}</strong>
                      <span className="block text-xs leading-snug muted">{ALVO[n].descricao}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed muted">
                Não entra na conta o tamanho do vazamento, que quem declara é o atacante.{' '}
                <Link to="/metodologia#criticidade" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Como o tipo de alvo é definido
                </Link>{' '}
                (na metodologia, &ldquo;criticidade&rdquo;).
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Ranking
                titulo="Grupos que mais atacam o Brasil"
                subtitulo={`Quantas organizações brasileiras cada grupo divulgou ${periodoTexto(dias)}.`}
                ajuda="Grupo de ransomware é uma quadrilha que faz esses ataques e assina as divulgações com um nome próprio, como lockbit ou qilin. O perfil de cada um está em Grupos contra o Brasil."
                itens={br.porGrupo}
              />
              <Ranking
                titulo="Setores mais atingidos no Brasil"
                subtitulo={`Vítimas brasileiras por setor ${periodoTexto(dias)}, na classificação da própria fonte (14 setores).`}
                itens={br.porSetor.map((i) => ({ ...i, nome: setorPt(i.nome) }))}
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
                Da divulgação mais recente para a mais antiga
                {br.itens.length < br.total
                  ? `: as ${br.itens.length} mais recentes das ${br.total} divulgadas ${periodoTexto(dias)}`
                  : ` ${periodoTexto(dias)}`}
                . A data é a da publicação pelo grupo, não a do ataque, que costuma ser semanas antes.
              </p>

              {br.itens.length === 0 ? (
                <p className="mt-3 text-sm muted">
                  Nenhuma organização brasileira foi divulgada {periodoTexto(dias)}. Isso não quer dizer que
                  não houve ataque, só que nenhum foi divulgado. Escolha um período maior acima.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                        <th scope="col" className="py-2 pr-3 font-semibold">Divulgado</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Organização</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Grupo</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Setor</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Tipo de alvo</th>
                        <th scope="col" className="py-2 font-semibold">Fonte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {br.itens.map((v) => (
                        <tr key={v.external_id} className="border-b border-gray-100 dark:border-white/[0.06]">
                          <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs tabular-nums muted">
                            {v.discovered_at ? formatDateBR(v.discovered_at) : '—'}
                          </td>
                          <td
                            className="py-2 pr-3 font-medium"
                            title={v.victimBruto ? `Publicado pelo grupo como: ${v.victimBruto}` : undefined}
                          >
                            {v.victim}
                          </td>
                          <td className="py-2 pr-3">
                            <span className="rounded-full bg-gray-500/15 px-2 py-0.5 font-mono text-[11px]">
                              {v.group || '—'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-xs muted">{setorPt(v.sector) || '—'}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${ALVO[v.criticality]?.chip || ''}`}
                              title={[ALVO[v.criticality]?.rotulo, v.criticality_reason].filter(Boolean).join(': ') || undefined}
                            >
                              {ALVO[v.criticality] && <i className={`h-2 w-2 rounded-full ${ALVO[v.criticality].cor}`} aria-hidden="true" />}
                              {ALVO[v.criticality]?.curto || '—'}
                            </span>
                          </td>
                          <td className="py-2">
                            {v.post_url ? (
                              <a
                                href={v.post_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="relative inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                              >
                                ver <ExternalLink size={11} aria-hidden="true" />
                                <span className="sr-only">a divulgação de {v.victim} (abre em nova aba)</span>
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

            {/* "na amostra" e não "no mundo": só as 100 divulgações globais mais
                recentes são coletadas, então isto não é o ranking mundial. */}
            <Ranking
              titulo="Grupos mais ativos na amostra recente"
              subtitulo={`Ordenados entre si dentro das ${d.global.amostra} divulgações do mundo todo que a coleta trouxe ${periodoTexto(dias)} — não é o ranking mundial completo.`}
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

      <VulnerabilidadesExploradas />
    </div>
  )
}

// VULNERABILIDADES EXPLORADAS — catálogo KEV da CISA. Não fala de vítimas
// brasileiras: fala do software que também roda no Brasil e já foi usado em ataque.
function VulnerabilidadesExploradas() {
  const r = useResource(() => request('GET /cyber/vulnerabilidades', { params: { days: 90, limit: 15 } }), [])
  const k = r.data
  return (
    <section className="card p-5" aria-labelledby="titulo-kev">
      <h2 id="titulo-kev" className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Bug size={18} className="text-violet-600 dark:text-violet-300" aria-hidden="true" />
        Falhas de software já usadas em ataques
        <InfoTooltip text="Catálogo público da CISA, a agência de cibersegurança dos Estados Unidos. Só entra falha com exploração confirmada em ataque real. Não diz quem foi atacado nem se foi no Brasil." />
      </h2>
      <p className="mt-1 text-sm muted">
        Programas que órgãos e empresas no Brasil também usam. Quem usa um destes deve priorizar a correção.
      </p>
      <DataState loading={r.loading} error={r.error} empty={!r.loading && !k?.total} onRetry={r.refetch}>
        {k && (
          <>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                <dt className="text-xs muted">Incluídas nos últimos {k.dias} dias</dt>
                <dd className="text-2xl font-bold tabular-nums">{k.naJanela}</dd>
              </div>
              <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                <dt className="text-xs muted">Destas, com uso conhecido em ransomware</dt>
                <dd className="text-2xl font-bold tabular-nums">{k.comRansomware}</dd>
              </div>
              <div className="rounded-lg bg-gray-500/5 p-3 dark:bg-white/5">
                <dt className="text-xs muted">Total no catálogo, desde 2021</dt>
                <dd className="text-2xl font-bold tabular-nums">{k.total.toLocaleString('pt-BR')}</dd>
              </div>
            </dl>

            {k.fabricantes.length > 0 && (
              <p className="mt-4 text-sm">
                <span className="font-semibold">Fabricantes que mais aparecem nos últimos {k.dias} dias: </span>
                {k.fabricantes.map((f) => `${f.fabricante} (${f.total})`).join(', ')}.
              </p>
            )}

            <h3 className="mt-5 flex items-center gap-1.5 text-sm font-semibold">
              Inclusões mais recentes
              <span className="chip text-[10px]" title="Texto original em inglês">EN</span>
            </h3>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-white/[0.06]">
              {k.recentes.map((v) => (
                <li key={v.cve} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-3">
                  <span className="shrink-0 font-mono text-xs tabular-nums muted sm:w-24 sm:pt-0.5">
                    {formatDateBR(v.incluidaEm)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" lang="en">{v.nome}</p>
                    <p className="text-xs muted">
                      {[v.fabricante, v.produto].filter(Boolean).join(' · ')}
                      {v.usoEmRansomware && (
                        <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-700 dark:text-red-300">
                          usada em ransomware
                        </span>
                      )}
                    </p>
                  </div>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                  >
                    {v.cve} <ExternalLink size={11} aria-hidden="true" />
                    <span className="sr-only">(detalhes no NVD, abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs muted">
              Fonte:{' '}
              <a href={k.fonteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{k.provider}</a>
              {k.ultimaInclusao && `. Última inclusão em ${formatDateBR(k.ultimaInclusao)}`}. Consultado a cada 6 horas.
            </p>
          </>
        )}
      </DataState>
    </section>
  )
}

function Ranking({ titulo, subtitulo, ajuda, itens, icone: Icone }) {
  const max = Math.max(...itens.map((i) => i.total), 1)
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        {Icone && <Icone size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" />}
        {titulo}
        {ajuda && <InfoTooltip text={ajuda} />}
      </h2>
      <p className="mt-1 text-sm muted">{subtitulo}</p>
      {!itens.length && <p className="mt-3 text-sm muted">Sem registros no período escolhido.</p>}
      <div className="mt-4 space-y-2">
        {itens.map((i) => (
          <div key={i.nome} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate" title={i.nome}>{i.nome}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(i.total / max) * 100}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums">{i.total}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
