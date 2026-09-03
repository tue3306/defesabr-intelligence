import { ShieldAlert, Building2, Users, Globe2, ExternalLink, Info } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// AMEAÇAS CIBERNÉTICAS — vítimas divulgadas por grupos de extorsão
//
// A plataforma declarava Cibersegurança entre as suas categorias e tinha dois
// artigos nela. Não por descuido da coleta: cibersegurança raramente vira
// manchete. O incidente aparece no site de extorsão do grupo dias ou semanas
// antes de virar notícia — e na maioria das vezes nunca vira.
//
// Esta tela não mostra jornalismo. Mostra o registro que os próprios
// atacantes publicam, indexado pelo ransomware.live: quem foi atacado, por
// qual grupo, de que setor e quando. Para uma organização brasileira, é o
// aviso mais antecipado que existe publicamente.
//
// A ressalva é parte do produto e está na tela, não só aqui: estar nesta lista
// é REIVINDICAÇÃO de ataque, feita por quem ataca, e não confirmação da
// vítima. E a ausência não é atestado de segurança — só significa que ninguém
// publicou.
// -----------------------------------------------------------------------------

export default function CyberThreats() {
  const r = useResource(() => request('GET /cyber/ransomware', { params: { days: 180 } }), [])
  const d = r.data
  const br = d?.brasil
  const semChave = d && d.acervo === 0

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Ameaças Cibernéticas"
        description="Organizações brasileiras divulgadas por grupos de ransomware, com o quadro global como referência."
        help="Os registros vêm dos sites de extorsão dos próprios grupos, indexados pelo ransomware.live. Aparecer aqui é reivindicação de ataque, não confirmação da vítima."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Ameaças Cibernéticas' }]}
        badges={<Badge type={d?.acervo ? 'live' : 'demo'} />}
        meta={d ? [
          { label: 'Janela', value: `${d.periodoDias} dias` },
          { label: 'Base', value: `${d.acervo} registro(s)` },
        ] : undefined}
      />

      <DataState
        loading={r.loading}
        error={r.error}
        empty={semChave}
        onRetry={r.refetch}
        emptyProps={{
          icon: ShieldAlert,
          title: 'Coletor de ransomware desligado',
          hint: 'Esta tela depende de RANSOMWARE_API_KEY. Sem a chave o coletor não roda — '
            + 'e não é apresentado como falha, porque não configurado não é o mesmo que quebrado.',
        }}
      >
        {d && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Building2}
                label="Vítimas no Brasil"
                value={br.total}
                hint={`nos últimos ${d.periodoDias} dias`}
                accent={br.total ? 'amber' : 'green'}
              />
              <MetricCard
                icon={Globe2}
                label="Vítimas no mundo"
                value={d.global.total}
                hint="mesma janela — a referência que dá escala ao número do Brasil"
              />
              <MetricCard
                icon={Users}
                label="Grupos ativos no Brasil"
                value={br.porGrupo.length}
                hint={br.porGrupo.slice(0, 2).map((g) => g.nome).join(', ') || 'nenhum no período'}
              />
              <MetricCard
                icon={ShieldAlert}
                label="Participação do Brasil"
                value={d.global.total ? `${Math.round((br.total / d.global.total) * 100)}%` : '—'}
                hint="das vítimas divulgadas no período"
              />
            </div>

            {/* ── A RESSALVA, EM DESTAQUE E NÃO EM NOTA DE RODAPÉ ── */}
            <p className="flex items-start gap-2 rounded-lg border-l-4 border-l-amber-500 bg-amber-500/5 px-4 py-3 text-sm">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{d.nota}</span>
            </p>

            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                Organizações brasileiras divulgadas
                <InfoTooltip text="Ordenadas pela data em que o grupo publicou o vazamento, não pela data do ataque — que costuma ser semanas antes e nem sempre é informada." />
              </h2>

              {br.itens.length === 0 ? (
                <p className="mt-3 text-sm muted">
                  Nenhuma organização brasileira foi divulgada nos últimos {d.periodoDias} dias
                  pelos grupos indexados. Isso não significa ausência de incidentes: significa
                  ausência de divulgação pública.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                        <th className="py-2 pr-4 font-semibold">Divulgado</th>
                        <th className="py-2 pr-4 font-semibold">Organização</th>
                        <th className="py-2 pr-4 font-semibold">Grupo</th>
                        <th className="py-2 pr-4 font-semibold">Setor</th>
                        <th className="py-2 font-semibold">Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {br.itens.map((v) => (
                        <tr key={v.external_id} className="border-b border-gray-100 dark:border-white/[0.06]">
                          <td className="py-2 pr-4 font-mono text-xs muted">
                            {v.discovered_at ? formatDateBR(v.discovered_at) : '—'}
                          </td>
                          <td className="py-2 pr-4 font-medium">{v.victim}</td>
                          <td className="py-2 pr-4">
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-800 dark:text-red-300">
                              {v.group || '—'}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-xs muted">{v.sector || '—'}</td>
                          <td className="py-2">
                            {v.post_url ? (
                              <a
                                href={v.post_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                              >
                                fonte <ExternalLink size={11} />
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

            <div className="grid gap-6 lg:grid-cols-2">
              <Ranking
                titulo="Grupos mais ativos (global)"
                subtitulo="Quantas vítimas cada grupo divulgou na janela."
                itens={d.global.porGrupo}
              />
              <Ranking
                titulo="Países mais atingidos"
                subtitulo="Volume de divulgações por país de origem da vítima."
                itens={d.global.porPais.map((p) => ({ nome: p.iso, total: p.total }))}
                destaque="BR"
              />
            </div>

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

function Ranking({ titulo, subtitulo, itens, destaque }) {
  const max = Math.max(...itens.map((i) => i.total), 1)
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
      <p className="mt-1 text-sm muted">{subtitulo}</p>
      {!itens.length && <p className="mt-3 text-sm muted">Sem registros no período.</p>}
      <div className="mt-4 space-y-2">
        {itens.map((i) => (
          <div key={i.nome} className="flex items-center gap-3 text-sm">
            <span className={`w-32 shrink-0 truncate ${i.nome === destaque ? 'font-bold text-gold-600 dark:text-gold-400' : ''}`}>
              {i.nome}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <span
                className={`block h-full rounded-full ${i.nome === destaque ? 'bg-gold-500' : 'bg-brand-500'}`}
                style={{ width: `${(i.total / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums">{i.total}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
