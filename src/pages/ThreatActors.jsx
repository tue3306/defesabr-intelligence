import { useState } from 'react'
import {
  Crosshair, ShieldAlert, Wrench, Bug, ChevronDown, Landmark, ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import DataState from '../components/ui/DataState'
import InfoTooltip from '../components/ui/InfoTooltip'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { formatDateBR } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// ATORES E VULNERABILIDADES
//
// A tela de Ameaças respondia "o que foi atacado no Brasil". Esta responde a
// outra metade, que é a que serve para defender: QUEM ATACA E COMO.
//
// A diferença é prática, não conceitual. Saber que o `akira` tem 19 vítimas
// brasileiras é interessante. Saber que ele entra por credencial de VPN válida
// (MITRE T1078) e explora CVE-2023-48788 no FortiClient, CVSS 9.8, é uma
// tarefa para amanhã de manhã.
//
// A LISTA DE CVEs É O PRODUTO
//
// Não é "as vulnerabilidades críticas do mês" — isso qualquer boletim publica.
// É o recorte cruzado: vulnerabilidades que grupos COM VÍTIMA BRASILEIRA
// REGISTRADA sabem explorar. A priorização sai do cruzamento, não de uma
// opinião sobre gravidade.
// -----------------------------------------------------------------------------

const SEV = {
  CRITICAL: 'bg-red-500/15 text-red-800 dark:text-red-300',
  HIGH: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  MEDIUM: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',
  LOW: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
}

export default function ThreatActors() {
  const atores = useResource(() => request('GET /cyber/atores', { params: { limit: 25 } }), [])
  const cves = useResource(() => request('GET /cyber/cves'), [])
  const [aberto, setAberto] = useState(null)

  const lista = atores.data?.items || []
  const listaCves = cves.data?.items || []
  const comPerfil = lista.filter((a) => a.temPerfil).length
  const criticos = listaCves.filter((c) => c.severidade === 'CRITICAL').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Crosshair}
        title="Atores & Vulnerabilidades"
        description="Quem ataca organizações brasileiras, com as técnicas MITRE ATT&CK, as ferramentas e as vulnerabilidades que cada grupo sabe explorar."
        help="Os perfis vêm do ransomware.live e cobrem apenas os grupos com vítima brasileira registrada no acervo."
        breadcrumb={[{ label: 'Inteligência' }, { label: 'Atores & Vulnerabilidades' }]}
        badges={<Badge type={lista.length ? 'live' : 'demo'} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Crosshair} label="Grupos contra o Brasil" value={lista.length || '—'}
          hint={`${comPerfil} com perfil detalhado`} accent="amber" />
        <MetricCard icon={Bug} label="Vulnerabilidades" value={listaCves.length || '—'}
          hint="exploradas por esses grupos" accent={listaCves.length ? 'red' : 'green'} />
        <MetricCard icon={ShieldAlert} label="CVEs críticos" value={criticos || '—'}
          hint="severidade CRITICAL" accent={criticos ? 'red' : 'green'} />
        <MetricCard icon={Landmark} label="Grupos que atacaram o Estado"
          value={lista.filter((a) => a.contraEstado > 0).length || '—'}
          hint="órgão público, judiciário ou militar" accent="red" />
      </div>

      {/* ── A LISTA DE CORREÇÃO ── */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Bug size={18} className="text-red-600 dark:text-red-400" />
          Vulnerabilidades a corrigir primeiro
          <InfoTooltip text="Não é a lista de CVEs críticos do mês — é o cruzamento entre vulnerabilidades conhecidas e os grupos que têm vítima brasileira registrada. A prioridade sai do cruzamento, não de um juízo sobre gravidade." />
        </h2>
        <p className="mt-1 text-sm muted">
          Ordenadas por quantos grupos as exploram e, em seguida, pelo CVSS. Um CVE que dois
          grupos ativos no Brasil sabem usar vale mais atenção que um CVSS maior que ninguém aqui usa.
        </p>

        <DataState
          loading={cves.loading}
          error={cves.error}
          empty={!listaCves.length}
          onRetry={cves.refetch}
          emptyProps={{ icon: Bug, title: 'Sem vulnerabilidades mapeadas', hint: 'Os perfis de ator ainda não foram coletados.' }}
        >
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                  <th className="py-2 pr-3 font-semibold">CVE</th>
                  <th className="py-2 pr-3 font-semibold">CVSS</th>
                  <th className="py-2 pr-3 font-semibold">Severidade</th>
                  <th className="py-2 pr-3 font-semibold">Produto</th>
                  <th className="py-2 font-semibold">Grupos que exploram</th>
                </tr>
              </thead>
              <tbody>
                {listaCves.map((c) => (
                  <tr key={c.cve} className="border-b border-gray-100 dark:border-white/[0.06]">
                    <td className="py-2 pr-3">
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(String(c.cve).split(' ')[0])}`}
                        target="_blank" rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                      >
                        {String(c.cve).split(' ')[0]} <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">{c.cvss ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV[c.severidade] || SEV.LOW}`}>
                        {c.severidade || '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <strong>{c.fabricante || '—'}</strong>
                      {c.produto ? ` · ${c.produto}` : ''}
                    </td>
                    <td className="py-2 text-xs muted">{c.grupos.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs muted">{cves.data?.nota}</p>
        </DataState>
      </section>

      {/* ── PERFIS ── */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Crosshair size={18} className="text-brand-400 dark:text-brand-300" />
          Perfis dos grupos
        </h2>
        <p className="mt-1 text-sm muted">
          Clique para ver as táticas MITRE ATT&amp;CK, as ferramentas e os CVEs de cada um.
          <strong> BR</strong> é o que o grupo fez aqui; <strong>mundo</strong> vem da fonte e conta o planeta.
        </p>

        <DataState
          loading={atores.loading}
          error={atores.error}
          empty={!lista.length}
          onRetry={atores.refetch}
          emptyProps={{ icon: Crosshair, title: 'Sem atores mapeados', hint: 'Aguardando a coleta.' }}
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
        <p className="mt-3 text-xs muted">{atores.data?.nota}</p>
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
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5" aria-expanded={aberto}>
        <span className="font-mono font-bold">{a.nome}</span>
        {a.contraEstado > 0 && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300">
            {a.contraEstado} contra o Estado
          </span>
        )}
        <span className="text-xs muted">
          {a.vitimasBr} no Brasil{a.vitimasMundo ? ` · ${a.vitimasMundo} no mundo` : ''}
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs muted">
          {a.tecnicas > 0 && <span>{a.tecnicas} técnicas</span>}
          {a.cves > 0 && <span className="font-semibold text-red-700 dark:text-red-400">{a.cves} CVEs</span>}
          {a.ferramentas > 0 && <span>{a.ferramentas} ferramentas</span>}
          <ChevronDown size={16} className={aberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
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

          {d?.cves?.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider muted">Vulnerabilidades exploradas</p>
              <div className="flex flex-wrap gap-1.5">
                {d.cves.map((c) => (
                  <span key={c.CVE} className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${SEV[String(c.severity).toUpperCase()] || SEV.LOW}`}
                    title={`${c.Vendor || ''} ${c.Product || ''} · CVSS ${c.CVSS ?? '—'}`}>
                    {String(c.CVE).split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {d?.ttps?.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider muted">
                Táticas e técnicas (MITRE ATT&amp;CK)
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
                        <li className="text-xs muted">… e mais {t.techniques.length - 6}</li>
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
                <Wrench size={12} /> Ferramentas
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
                Vítimas brasileiras ({d.vitimasBrasileiras.length})
              </p>
              <ul className="space-y-1">
                {d.vitimasBrasileiras.slice(0, 8).map((v) => (
                  <li key={v.victim + v.discovered_at} className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-mono muted">{formatDateBR(v.discovered_at)}</span>
                    <span className="font-medium">{v.victim}</span>
                    {v.sector && <span className="muted">· {v.sector}</span>}
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
