import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Users, Database, Activity, ScrollText, Bell, AlertTriangle, Info,
  HeartPulse, Server, ChevronRight,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import { apiOnline } from '../services/apiBridge'
import { useResource } from '../hooks/useResource'
import { adminService } from '../services'
import { useAuthStore } from '../store/authStore'
import { HEALTH_STATUS, AUDIT_LEVEL, SOURCE_STATUS } from '../data/adminData'
import { formatDateTimeBR } from '../utils/dateUtils'

const Section = ({ children, className = '' }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={className}
  >
    {children}
  </motion.section>
)

// -----------------------------------------------------------------------------
// PAINEL DO ADMINISTRADOR — o estado da instalação num relance.
//
// Tudo aqui vem do servidor. Este painel já exibiu "Perfis de acesso: 4 —
// visitante, usuário, analista, admin", "Contas por plano: Institucional 2" e
// uma lista de integrações escrita à mão com SSO corporativo "planejado".
// -----------------------------------------------------------------------------
export default function AdminDashboard() {
  const [apiViva, setApiViva] = useState(false)
  useEffect(() => {
    let vivo = true
    apiOnline().then((ok) => { if (vivo) setApiViva(ok) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const saude = useResource(() => adminService.health(), [])
  const fontes = useResource(() => adminService.sources(), [])
  const auditoria = useResource(() => adminService.audit({ limit: 80 }), [])
  const usuarios = useResource(() => adminService.users(), [])

  const contas = useMemo(() => usuarios.data?.items || [], [usuarios.data])
  const listaFontes = useMemo(() => fontes.data?.items || [], [fontes.data])
  const eventos = useMemo(() => auditoria.data?.items || [], [auditoria.data])

  const servicos = saude.data?.services || []
  const alertas = saude.data?.alerts || []
  const acervo = saude.data?.archive
  const agendador = saude.data?.scheduler
  const operacionais = saude.data?.operational ?? 0
  const avaliaveis = (saude.data?.total ?? 0) - (saude.data?.optional ?? 0)
  const notificacoes = servicos.find((s) => s.id === 'notificacoes')

  const execucoes24h = useMemo(() => {
    const corte = Date.now() - 24 * 3600_000
    return eventos.filter((e) => e.kind === 'coleta' && new Date(e.time || 0).getTime() >= corte).length
  }, [eventos])

  const resumoFontes = useMemo(() => {
    const r = Object.fromEntries(Object.keys(SOURCE_STATUS).map((k) => [k, 0]))
    for (const f of listaFontes) if (r[f.status] !== undefined) r[f.status] += 1
    return r
  }, [listaFontes])

  const porCategoria = useMemo(() => {
    const mapa = new Map()
    for (const f of listaFontes) {
      const cat = f.type || 'Sem categoria'
      mapa.set(cat, (mapa.get(cat) || 0) + 1)
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [listaFontes])

  const admins = contas.filter((c) => c.role === 'admin' && c.status === 'ativo').length
  const suspensas = contas.filter((c) => c.status === 'suspenso').length

  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] || 'Administrador'

  return (
    <div className="space-y-6 sm:space-y-8">
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <ShieldCheck size={14} /> Governança da plataforma
                </span>
                <Badge type={apiViva ? 'live' : 'sem-dado'} />
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greetingByHour()}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                Saúde dos serviços, fontes, contas e trilha de auditoria — tudo derivado do estado do
                servidor.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/admin" className="btn-primary">
                  <ShieldCheck size={16} /> Console de governança
                </Link>
                <Link to="/coleta" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <Activity size={16} /> Método e coleta
                </Link>
              </div>
            </div>

            <div className="w-full shrink-0 rounded-xl border border-white/10 bg-white/5 p-4 lg:w-64">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Serviços</span>
                <HeartPulse size={15} className="text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
                  {saude.data ? `${operacionais}/${avaliaveis}` : '—'}
                </span>
                <span className="font-mono text-sm text-gray-400">operacionais</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Recursos que dependem de uma chave não configurada aparecem como
                <strong> não configurados</strong> e ficam fora da conta.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ALERTAS — vermelho para o que quebra, âmbar para o que pede atenção,
          azul para a nota de configuração que não indica defeito. */}
      {alertas.length > 0 && (
        <Section className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a.id}
              role="alert"
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                a.nivel === 'critico' ? 'border-red-500/30 bg-red-500/5'
                  : a.nivel === 'info' ? 'border-brand-500/30 bg-brand-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              {a.nivel === 'info'
                ? <Info size={18} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
                : <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${a.nivel === 'critico' ? 'text-red-500' : 'text-amber-500'}`} />}
              <div className="min-w-0">
                <p className="text-sm font-bold">{a.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed muted">{a.detalhe}</p>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Database}
            label="Fontes cadastradas"
            value={listaFontes.length ? String(listaFontes.length) : '—'}
            hint={`${resumoFontes.ativa} no ar · ${resumoFontes.indisponivel} com falha`}
            accent="amber"
          />
          <MetricCard
            icon={Users}
            label="Contas"
            value={contas.length ? String(contas.length) : '—'}
            hint={`${admins} administrador(es) · ${suspensas} suspensa(s)`}
            accent="brand"
          />
          <MetricCard
            icon={ScrollText}
            label="Artigos no acervo"
            value={acervo?.artigos != null ? String(acervo.artigos) : '—'}
            hint={acervo ? `${acervo.artigosRelevantes} aprovados pelo filtro` : 'coletados e guardados'}
            accent="brand"
          />
          <MetricCard
            icon={Bell}
            label="Notificações geradas"
            value={notificacoes?.metrics?.registros != null ? String(notificacoes.metrics.registros) : '—'}
            hint={agendador?.intervaloMinutos ? `nos últimos 30 dias · coleta a cada ${agendador.intervaloMinutos} min` : 'nos últimos 30 dias'}
            accent="green"
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Server size={18} className="text-brand-400 dark:text-brand-300" /> Saúde dos serviços
              </h2>
              <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Diagnóstico <ChevronRight size={15} />
              </Link>
            </div>
            {saude.error && <p className="text-sm muted">Não foi possível consultar a saúde dos serviços.</p>}
            <div className="space-y-2">
              {servicos.map((s) => {
                const st = HEALTH_STATUS[s.status] || HEALTH_STATUS.planned
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="truncate text-xs muted">{s.note}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <ScrollText size={18} className="text-brand-400 dark:text-brand-300" /> Últimos eventos
              </h2>
              <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Trilha completa <ChevronRight size={15} />
              </Link>
            </div>
            {!eventos.length && (
              <p className="text-sm muted">{auditoria.loading ? 'Consultando…' : 'Nenhum evento registrado ainda.'}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {eventos.slice(0, 10).map((ev) => {
                    const lvl = AUDIT_LEVEL[ev.level] || AUDIT_LEVEL.info
                    return (
                      <tr key={ev.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs muted">{formatDateTimeBR(ev.time)}</td>
                        <td className="py-2 pr-4">
                          <span className="block">{ev.action}</span>
                          <span className="text-xs muted">{ev.actor} · {ev.target}</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lvl.classes}`}>{lvl.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Database size={17} className="text-brand-400 dark:text-brand-300" /> Fontes
              </h2>
              <Link to="/fontes" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Disponibilidade <ChevronRight size={15} />
              </Link>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.entries(resumoFontes).filter(([, n]) => n > 0).map(([chave, quantas]) => {
                const meta = SOURCE_STATUS[chave]
                return (
                  <span key={chave} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {quantas} {meta.label}
                  </span>
                )
              })}
            </div>
            <ul className="space-y-1.5">
              {porCategoria.map(([categoria, quantas]) => (
                <li key={categoria} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate muted">{categoria}</span>
                  <span className="font-mono font-bold">{quantas}</span>
                </li>
              ))}
            </ul>
            {fontes.error && <p className="mt-2 text-xs muted">Não foi possível ler as fontes.</p>}
          </Section>

          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Activity size={17} className="text-brand-400 dark:text-brand-300" /> Coleta
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Execuções (24h)" value={execucoes24h} />
              <Stat label="Proposições" value={acervo?.proposicoes ?? '—'} />
              <Stat label="Indicadores" value={acervo?.indicadores ?? '—'} />
              <Stat label="Na pasta das contas" value={acervo?.favoritos ?? '—'} />
            </div>
            <p className="mt-3 text-[11px] muted">
              {agendador?.ativo
                ? `Agendador a cada ${agendador.intervaloMinutos} min${agendador.proximaExecucao ? ` · próxima às ${new Date(agendador.proximaExecucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}.`
                : agendador ? 'Agendador desligado (COLLECT_INTERVAL_MINUTES=0).' : ''}
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="font-mono text-xl font-extrabold">{value}</p>
      <p className="text-[11px] muted">{label}</p>
    </div>
  )
}

function greetingByHour() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
