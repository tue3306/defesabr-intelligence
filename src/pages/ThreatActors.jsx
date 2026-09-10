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
// GRUPOS CONTRA O BRASIL
//
// A tela de Incidentes responde "o que foi atacado no Brasil". Esta responde a
// outra metade, que é a que serve para defender: QUEM ATACA, e o que já fez
// aqui.
//
// ─────────────────────────────────────────────────────────────────────────────
// A LISTA DE CVEs SAIU DO CENTRO DA TELA
//
// Ela ocupava o primeiro terço da página: uma tabela de identificadores
// (CVE-2023-48788), CVSS, fabricante e produto. Era tecnicamente correta e
// estava no lugar errado, por duas razões.
//
// A PRIMEIRA é de público. Um identificador de CVE só significa alguma coisa
// para quem opera infraestrutura e vai aplicar a correção. Esta plataforma é
// sobre segurança e defesa do Brasil, e quem a lê quer saber quem está
// atacando o país — não a numeração NVD de uma falha no FortiClient. Para o
// leitor errado, a tabela é ruído com aparência de rigor.
//
// A SEGUNDA é de proporção. Colocada em primeiro lugar, ela empurrava para
// baixo o dado que realmente distingue esta plataforma: QUAIS GRUPOS
// ATACARAM O ESTADO BRASILEIRO. Prefeitura, câmara municipal, secretaria
// estadual de saúde — órgãos públicos com vazamento divulgado, com nome e
// data. Isso não existe pronto em lugar nenhum, e estava em segundo plano
// atrás de uma lista que qualquer boletim de vulnerabilidade publica.
//
// AS VULNERABILIDADES NÃO SUMIRAM — mudaram de altitude. Continuam no perfil
// de cada grupo, onde respondem a pergunta certa ("como este grupo entra"), e
// o número agregado continua no cartão. O que saiu foi a tabela como
// protagonista.
//
// O contexto brasileiro passou a vir junto: quantos grupos atacaram órgãos do
// Estado, quantas organizações brasileiras cada um já expôs, e o que a
// presença de uma vulnerabilidade conhecida significa para quem defende esses
// alvos.
// -----------------------------------------------------------------------------

const SEV = {
  CRITICAL: 'bg-red-500/15 text-red-800 dark:text-red-300',
  HIGH: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  MEDIUM: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',
  LOW: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
}

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
        description="Quem ataca organizações brasileiras: quantas já expôs, se atingiu o Estado, e como entra — técnicas mapeadas ao MITRE ATT&CK e ferramentas conhecidas."
        help="Os perfis vêm do ransomware.live e cobrem apenas os grupos com vítima brasileira registrada no acervo."
        breadcrumb={[{ label: 'Operacional' }, { label: 'Grupos contra o Brasil' }]}
        badges={<Badge type={lista.length ? 'live' : 'sem-dado'} />}
      />

      {/* TRÊS CARTÕES, E OS TRÊS SÃO SOBRE O BRASIL.
        *
        * Vinham quatro: "Grupos · Vulnerabilidades · CVEs críticos · Estado".
        * Os dois do meio contavam CVE — o dado menos específico desta
        * plataforma — e empurravam para a ponta aquele que só ela tem: quantos
        * grupos atingiram o Estado brasileiro.
        *
        * Primeiro os CVEs críticos saíram. Agora saiu o último, e com ele a
        * última contagem que não respondia a nenhuma pergunta de quem
        * acompanha segurança e defesa do país. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Crosshair} label="Grupos contra o Brasil" value={lista.length || '—'}
          hint={`${comPerfil} com perfil detalhado`} accent="amber" />
        <MetricCard icon={Landmark} label="Atacaram o Estado brasileiro"
          value={contraEstado || '—'}
          hint="órgão público, judiciário ou militar" accent="red" />
        <MetricCard icon={ShieldAlert} label="Organizações expostas" value={totalVitimas || '—'}
          hint="somadas por estes grupos, no Brasil" accent="red" />
      </div>

      {/* ── O QUE ISSO SIGNIFICA PARA QUEM DEFENDE ──
        *
        * No lugar daquela tabela, a leitura que ela nao dava: o que a
        * presenca destes grupos significa para o alvo brasileiro. Cada frase
        * abaixo e derivada de contagem do acervo, nao de opiniao. */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Landmark size={18} className="text-red-600 dark:text-red-400" />
          O que isto significa para o Brasil
          <InfoTooltip text="Derivado do acervo desta plataforma: os grupos listados são os que têm vítima brasileira registrada, e as contagens saem dessas vítimas." />
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Leitura
            titulo="O Estado é alvo, não espectador"
            corpo={contraEstado > 0
              ? `${contraEstado} dos ${lista.length} grupos com atividade no Brasil já divulgaram dados de órgão público, judiciário ou militar — identificados pelo domínio (.gov.br, .jus.br, .mil.br), não por suposição.`
              : 'Nenhum dos grupos listados tem, no acervo, vítima com domínio de órgão público brasileiro.'}
          />
          <Leitura
            titulo="A exposição é acumulada"
            corpo={totalVitimas > 0
              ? `Somadas, estas organizações expuseram ${totalVitimas} vítimas brasileiras desde que a fonte começou a registrar. Não é uma campanha: é atividade contínua, ano após ano.`
              : 'Ainda sem vítimas brasileiras somadas para os grupos listados.'}
          />
          <Leitura
            titulo="A entrada é conhecida"
            corpo={comPerfil > 0
              ? `${comPerfil} destes grupos têm perfil detalhado no acervo, com as táticas e técnicas mapeadas ao MITRE ATT&CK. O modo de entrada não é segredo — está catalogado, e abre no perfil de cada um.`
              : 'Os perfis detalhados ainda não foram coletados para estes grupos.'}
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed muted">
          Como cada grupo entra está no perfil dele, abaixo: as táticas e técnicas mapeadas ao
          MITRE ATT&amp;CK e as ferramentas conhecidas. É o que responde à pergunta que importa
          aqui — <strong>como este grupo opera</strong> — sem virar catálogo de falhas técnicas.
        </p>
      </section>

      {/* ── PERFIS ── */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Crosshair size={18} className="text-brand-400 dark:text-brand-300" />
          Perfis dos grupos
        </h2>
        <p className="mt-1 text-sm muted">
          Clique para ver as táticas MITRE ATT&amp;CK e as ferramentas de cada um.
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
                    <span className="font-medium" title={v.victimBruto ? `Publicado pelo grupo como: ${v.victimBruto}` : undefined}>
                      {v.victim}
                    </span>
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

/** Um parágrafo de leitura derivada. Sem número solto: sempre com a frase. */
function Leitura({ titulo, corpo }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3.5 dark:border-white/10">
      <p className="text-sm font-bold">{titulo}</p>
      <p className="mt-1 text-xs leading-relaxed muted">{corpo}</p>
    </div>
  )
}
