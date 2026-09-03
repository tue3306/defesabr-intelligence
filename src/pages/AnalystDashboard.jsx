import { Link } from 'react-router-dom'
import {
  Activity, Filter, Rss, AlertTriangle, CheckCircle2, ArrowRight,
  FlaskConical, Clock, TrendingUp, TrendingDown,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import Badge from '../components/ui/Badge'
import { useResource } from '../hooks/useResource'
import { request } from '../services/client'
import { useRadarCategorias } from '../hooks/useDadosReais'
import { useAuthStore } from '../store/authStore'
import { formatDateTimeBR, timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// PAINEL DO ANALISTA
//
// O Analista tinha o mesmo painel do Usuário — daí a impressão, correta, de que
// os perfis eram iguais. A diferença não é decorativa: o trabalho do Analista
// não é LER o acervo, é responder por ele. Se uma fonte parou de responder há
// dois dias, quem precisa saber primeiro é ele.
//
// Por isso este painel não mostra manchetes. Mostra a saúde da coleta:
// quanto entrou, quanto o filtro recusou, qual fonte falhou e há quanto tempo.
// Metade dos dados vem de `/system/runs`, que exige papel `analyst` no
// servidor — um Usuário que forjasse a interface receberia 403 aqui.
// -----------------------------------------------------------------------------

export default function AnalystDashboard() {
  const user = useAuthStore((s) => s.user)

  const execucoes = useResource(() => request('GET /system/runs', { params: { limit: 40 } }), [])
  const fontes = useResource(() => request('GET /intel/sources'), [])
  const volume = useResource(() => request('GET /news/volume', { params: { days: 30 } }), [])
  const radar = useRadarCategorias(30)

  const runs = execucoes.data?.items || []
  const porColetor = execucoes.data?.porColetor || []
  const listaFontes = fontes.data?.items || []
  const filtro = volume.data?.filtro || {}

  const comFalha = listaFontes.filter((f) => f.last_status && f.last_status !== 'ok')
  const ultimaExecucao = runs[0]
  const recusados = filtro.coletados != null && filtro.aprovados != null
    ? filtro.coletados - filtro.aprovados
    : null
  const taxa = filtro.coletados ? Math.round((filtro.aprovados / filtro.coletados) * 100) : null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title={`Mesa de análise${user?.name ? ` · ${user.name.split(' ')[0]}` : ''}`}
        description="A saúde da coleta: o que entrou, o que o filtro recusou e qual fonte parou de responder."
        help="Este painel é do perfil Analista. O Administrador vê governança da plataforma; o Usuário, o acervo já filtrado."
        badges={<Badge type="live" />}
      />

      {/* ── OS QUATRO NÚMEROS QUE IMPORTAM PARA QUEM RESPONDE PELA COLETA ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Rss}
          label="Fontes ativas"
          value={fontes.loading ? '…' : (listaFontes.length || '—')}
          hint={`${listaFontes.filter((f) => f.last_status === 'ok').length} responderam na última coleta`}
        />
        <MetricCard
          icon={Filter}
          label="Aprovados (30d)"
          value={volume.loading ? '…' : (filtro.aprovados ?? '—')}
          hint={recusados != null ? `${recusados} recusados pelo filtro` : 'aguardando coleta'}
          accent="green"
        />
        <MetricCard
          icon={taxa != null && taxa < 30 ? TrendingDown : TrendingUp}
          label="Aproveitamento"
          value={volume.loading ? '…' : (taxa != null ? `${taxa}%` : '—')}
          hint="do que foi coletado entrou no acervo"
        />
        <MetricCard
          icon={comFalha.length ? AlertTriangle : CheckCircle2}
          label="Fontes com falha"
          value={fontes.loading ? '…' : comFalha.length}
          hint={comFalha.length ? comFalha.map((f) => f.name).join(', ').slice(0, 44) : 'nenhuma pendência'}
          accent={comFalha.length ? 'amber' : 'green'}
        />
      </div>

      {/* ── FONTES COM FALHA — a coisa que exige ação hoje ── */}
      {comFalha.length > 0 && (
        <section className="card border-l-4 border-l-amber-500 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            Fontes que não responderam
          </h2>
          <p className="mt-1 text-sm muted">
            Enquanto estiverem assim, o acervo está incompleto — e nada na tela do Usuário diz isso.
            Quem sabe é você.
          </p>
          <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
            {comFalha.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="font-semibold">{f.name}</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                  {f.last_status}
                </span>
                {f.last_error && (
                  <span className="min-w-0 flex-1 truncate text-xs muted" title={f.last_error}>{f.last_error}</span>
                )}
                <span className="ml-auto text-xs muted">
                  {f.last_fetch_at ? timeAgo(f.last_fetch_at) : 'nunca coletada'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── DESEMPENHO POR COLETOR ── */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Activity size={18} className="text-brand-400 dark:text-brand-300" /> Desempenho por coletor
          </h2>
          <p className="mt-1 text-sm muted">
            Execuções, sucesso e itens novos. Um coletor que executa e nunca traz nada novo é um
            coletor quebrado que ninguém percebeu.
          </p>

          <DataState
            loading={execucoes.loading}
            error={execucoes.error}
            empty={!porColetor.length}
            onRetry={execucoes.refetch}
            emptyProps={{ icon: Clock, title: 'Sem execuções', hint: 'A coleta ainda não rodou.' }}
          >
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th className="py-2 pr-3 font-semibold">Coletor</th>
                    <th className="py-2 pr-3 font-semibold">Exec.</th>
                    <th className="py-2 pr-3 font-semibold">Sucesso</th>
                    <th className="py-2 pr-3 font-semibold">Novos</th>
                    <th className="py-2 font-semibold">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {porColetor.map((c) => {
                    const perfeito = c.sucessos === c.execucoes
                    return (
                      <tr key={c.collector} className="border-b border-gray-100 dark:border-white/[0.06]">
                        <td className="py-2 pr-3 font-medium">{c.collector}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums">{c.execucoes}</td>
                        <td className={`py-2 pr-3 font-mono tabular-nums ${
                          perfeito ? '' : 'font-bold text-amber-700 dark:text-amber-400'
                        }`}>
                          {c.sucessos}/{c.execucoes}
                        </td>
                        <td className="py-2 pr-3 font-mono tabular-nums">{c.itensNovos ?? 0}</td>
                        <td className="py-2 text-xs muted">{c.ultima ? timeAgo(c.ultima) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </DataState>

          {ultimaExecucao && (
            <p className="mt-3 border-t border-gray-200 pt-3 text-xs muted dark:border-white/10">
              Última execução: <strong>{ultimaExecucao.collector}</strong> em{' '}
              {formatDateTimeBR(ultimaExecucao.started_at)} ({ultimaExecucao.duration_ms}ms).
            </p>
          )}
        </section>

        {/* ── O QUE A COLETA TROUXE, POR TEMA ── */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Filter size={18} className="text-brand-400 dark:text-brand-300" /> Composição do acervo (30d)
          </h2>
          <p className="mt-1 text-sm muted">
            Contagem de matérias por categoria atribuída no processamento — não é medida de
            importância, é medida de cobertura.
          </p>

          <DataState
            loading={radar.carregando}
            empty={!radar.data?.length}
            emptyProps={{ icon: Filter, title: 'Sem material classificado', hint: 'Aguardando a primeira coleta.' }}
          >
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={radar.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-300 dark:text-white/10" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="muted" />
                  <YAxis
                    type="category" dataKey="category" width={104}
                    tick={{ fontSize: 11 }} stroke="currentColor" className="muted"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v} matérias`, 'Período']}
                  />
                  <Bar dataKey="atual" radius={[0, 4, 4, 0]}>
                    {radar.data.map((_, i) => (
                      <Cell key={i} fill={i % 2 ? '#1e5f4a' : '#c9a227'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataState>
        </section>
      </div>

      {/* ── ATALHO PARA A FERRAMENTA EXCLUSIVA ── */}
      <Link
        to="/coleta"
        className="card flex items-center gap-4 p-5 transition-colors hover:border-gold-500/50"
      >
        <FlaskConical size={28} className="shrink-0 text-gold-600 dark:text-gold-400" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold tracking-tight">Método &amp; Coleta</span>
          <span className="block text-sm muted">
            Audite a regra do filtro num texto qualquer e veja o histórico completo de execuções.
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-gray-400" />
      </Link>
    </div>
  )
}
