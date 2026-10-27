import { useState } from 'react'
import { setorPt } from '../utils/textUtils'
import {
  Crosshair, ShieldAlert, Wrench, ChevronDown, ChevronRight, Landmark, HelpCircle,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateBR } from '../utils/dateUtils'

// GRUPOS CONTRA O BRASIL — quem ataca, o que já fez aqui e como opera.
// A lista de CVEs saiu do centro da tela: as técnicas de entrada continuam no
// perfil de cada grupo, onde respondem "como este grupo entra".

export default function ThreatActors() {
  const atores = useResource(() => request('GET /cyber/atores', { params: { limit: 25 } }), [])
  const [aberto, setAberto] = useState(null)

  const lista = atores.data?.items || []
  const comPerfil = lista.filter((a) => a.temPerfil).length
  const contraEstado = lista.filter((a) => a.contraEstado > 0).length
  const totalVitimas = lista.reduce((soma, a) => soma + (a.vitimasBr || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Crosshair}
        title="Grupos contra o Brasil"
        description="As quadrilhas que já atacaram organizações brasileiras: quantas vítimas cada uma fez aqui, se atingiu órgãos públicos e como costuma agir."
        help="Os perfis vêm do ransomware.live e cobrem só os grupos com vítima brasileira registrada nesta plataforma."
        breadcrumb={[{ label: 'Ataques cibernéticos' }, { label: 'Grupos contra o Brasil' }]}
        badges={<Badge type={lista.length ? 'live' : 'sem-dado'} />}
      />

      {/* Três cartões, todos sobre os grupos LISTADOS (os que mais fizeram
        * vítimas aqui), em todo o histórico — não sobre todos os grupos. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Crosshair} label="Grupos listados" value={lista.length || '—'}
          hint={`os que mais fizeram vítimas no Brasil desde 2017; ${comPerfil} com perfil detalhado`} accent="amber" />
        <MetricCard icon={Landmark} label="Destes, atacaram órgãos públicos"
          value={contraEstado || '—'}
          hint="desde 2017, pelo endereço do site: .gov.br, .jus.br, .mil.br, .leg.br" accent="red" />
        <MetricCard icon={ShieldAlert} label="Vítimas brasileiras destes grupos" value={totalVitimas || '—'}
          hint="organizações divulgadas desde 2017, somando os grupos listados" accent="red" />
      </div>
      <p className="-mt-2 text-xs muted">
        Estes números cobrem todo o histórico. Em Incidentes no Brasil, os totais seguem o período
        escolhido na página (12 meses, de início), por isso são diferentes.
      </p>

      {/* Glossário recolhido: quem já sabe não precisa rolar por ele. */}
      <details className="card group p-0">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 [&::-webkit-details-marker]:hidden">
          <HelpCircle size={16} className="text-brand-500 dark:text-brand-300" aria-hidden="true" />
          Entenda os termos desta tela
          <ChevronRight size={15} className="ml-auto transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <dl className="grid grid-cols-1 gap-4 border-t border-gray-200 px-5 py-4 text-sm leading-relaxed dark:border-white/10 md:grid-cols-2">
          <Termo nome="Grupo de ransomware">
            Quadrilha que invade sistemas, sequestra os dados e cobra resgate. Quem não paga tem o nome
            divulgado no site do grupo. Os nomes (lockbit, qilin…) são os que os próprios grupos usam.
          </Termo>
          <Termo nome="Selo vermelho de órgãos públicos">
            Quantas vítimas do grupo têm site de governo, judiciário ou forças armadas
            (.gov.br, .jus.br, .mil.br, .leg.br). Dá para conferir no próprio endereço.
          </Termo>
          <Termo nome="Táticas e técnicas (MITRE ATT&CK)">
            O MITRE ATT&amp;CK é um catálogo público que dá um código a cada forma de ataque — como
            entrar, se esconder, roubar dados. Os códigos (ex.: TA0001) aparecem no perfil de cada grupo.
          </Termo>
          <Termo nome="No Brasil × no mundo">
            &ldquo;No Brasil&rdquo; conta as vítimas brasileiras registradas nesta plataforma. &ldquo;No mundo&rdquo;
            é o total que a fonte informa para o planeta. São contagens diferentes de propósito.
          </Termo>
        </dl>
      </details>

      {/* ── PERFIS ── */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Crosshair size={18} className="text-brand-400 dark:text-brand-300" aria-hidden="true" />
          Perfis dos grupos
        </h2>
        <p className="mt-1 text-sm muted">
          Do que mais atacou o Brasil para o que menos, contando todas as vítimas brasileiras desde
          2017. Abra um grupo para ver como ele opera e quem ele já atingiu aqui.
        </p>

        <DataState
          loading={atores.loading}
          error={atores.error}
          empty={!lista.length}
          onRetry={atores.refetch}
          emptyProps={{ icon: Crosshair, title: 'Nenhum grupo registrado ainda', hint: 'Os grupos aparecem aqui assim que a coleta trouxer a primeira vítima brasileira.' }}
        >
          <div className="mt-4 space-y-2">
            {lista.map((a) => (
              <Ator
                key={a.nome}
                a={a}
                aberto={aberto === a.nome}
                onToggle={() => setAberto(aberto === a.nome ? null : a.nome)}
              />
            ))}
          </div>
        </DataState>
      </section>
    </div>
  )
}

function Ator({ a, aberto, onToggle }) {
  const detalhe = useResource(
    () => (aberto ? request(`GET /cyber/ator/${encodeURIComponent(a.nome)}`) : Promise.resolve(null)),
    [aberto, a.nome],
  )
  const d = detalhe.data

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/60 dark:hover:bg-white/5"
      >
        <span className="font-mono font-bold">{a.nome}</span>
        {a.contraEstado > 0 && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300">
            {a.contraEstado} {a.contraEstado === 1 ? 'órgão público' : 'órgãos públicos'}
          </span>
        )}
        <span className="text-xs muted">
          {a.vitimasBr} no Brasil{a.vitimasMundo ? ` · ${a.vitimasMundo} no mundo` : ''}
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs muted">
          {/* Sem mapeamento, diz isso — em branco pareceria "não usa técnica nenhuma". */}
          {a.tecnicas > 0 || a.ferramentas > 0 ? (
            <>
              {a.tecnicas > 0 && <span>{a.tecnicas} técnicas</span>}
              {a.ferramentas > 0 && <span>{a.ferramentas} ferramentas</span>}
            </>
          ) : (
            <span className="italic">sem perfil técnico na fonte</span>
          )}
          <ChevronDown size={16} aria-hidden="true" className={aberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </span>
      </button>

      {aberto && (
        <div className="border-t border-gray-200 p-4 dark:border-white/10">
          {detalhe.loading && <p className="text-sm muted">Carregando perfil…</p>}
          {d && !d.perfil && d.motivo && <p className="text-sm muted">{d.motivo}</p>}

          {d?.descricao && <p className="mb-4 text-sm leading-relaxed">{d.descricao}</p>}

          {d && (
            <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
              {d.primeiraVez && <span>Primeira aparição: <strong>{formatDateBR(d.primeiraVez)}</strong></span>}
              {d.ultimaVez && <span>Última: <strong>{formatDateBR(d.ultimaVez)}</strong></span>}
              {d.negociacoes > 0 && <span><strong>{d.negociacoes}</strong> negociações registradas</span>}
            </p>
          )}

          {d?.ttps?.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider muted">
                Como opera (MITRE ATT&amp;CK)
                <InfoTooltip text="Catálogo público que dá um código a cada forma de ataque. A tática é o objetivo (por exemplo, entrar no sistema); a técnica é o jeito de fazer." />
              </p>
              <div className="space-y-2">
                {d.ttps.map((t) => (
                  <div key={t.tactic_id} className="rounded-lg bg-gray-100 p-2.5 dark:bg-white/5">
                    <p className="text-xs font-bold">
                      {t.tactic_name} <span className="font-mono muted">{t.tactic_id}</span>
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {(t.techniques || []).slice(0, 6).map((x) => (
                        <li key={x.technique_id} className="text-xs">
                          <span className="font-mono text-brand-700 dark:text-brand-300">{x.technique_id}</span>
                          {' '}{x.technique_name}
                          {x.technique_details && <span className="muted"> — {x.technique_details}</span>}
                        </li>
                      ))}
                      {(t.techniques || []).length > 6 && (
                        <li className="text-xs muted">e mais {t.techniques.length - 6}</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d?.ferramentas && Object.keys(d.ferramentas).length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider muted">
                <Wrench size={12} aria-hidden="true" /> Ferramentas
              </p>
              <div className="space-y-1">
                {Object.entries(d.ferramentas).map(([cat, fs]) => (
                  <p key={cat} className="text-xs">
                    <span className="font-semibold">{cat}:</span>{' '}
                    <span className="muted">{(fs || []).join(', ')}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {d?.vitimasBrasileiras?.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider muted">
                Vítimas brasileiras mais recentes
                <span className="font-normal normal-case tracking-normal">
                  {' '}(mostrando {Math.min(8, d.vitimasBrasileiras.length)} de {a.vitimasBr})
                </span>
              </p>
              <ul className="space-y-1">
                {d.vitimasBrasileiras.slice(0, 8).map((v) => (
                  <li key={v.victim + v.discovered_at} className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-mono muted">{formatDateBR(v.discovered_at)}</span>
                    <span className="font-medium" title={v.victimBruto ? `Publicado pelo grupo como: ${v.victimBruto}` : undefined}>
                      {v.victim}
                    </span>
                    {v.sector && <span className="muted">· {setorPt(v.sector)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Termo({ nome, children }) {
  return (
    <div>
      <dt className="font-semibold text-gray-900 dark:text-gray-100">{nome}</dt>
      <dd className="mt-0.5 text-gray-700 dark:text-gray-300">{children}</dd>
    </div>
  )
}
