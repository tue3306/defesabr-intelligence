import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Users, Database, Activity, PlugZap, ScrollText,
  ArrowRight, Settings as SettingsIcon, HeartPulse, Server, ChevronRight,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import { apiOnline } from '../services/apiBridge'
import { useResource } from '../hooks/useResource'
import { adminService } from '../services'
import { useAuthStore } from '../store/authStore'
// Só as TAXONOMIAS de estado sobrevivem daqui. Os dados que este painel
// mostrava — `systemHealth`, `ingestion`, `platformMetrics`, `auditLog` —
// eram escritos à mão e foram trocados pelo que o servidor mede.
import { HEALTH_STATUS, AUDIT_LEVEL, integrations } from '../data/adminData'
import { SOURCE_STATUS } from '../data/monitoredSources'
import { formatDateTimeBR } from '../utils/dateUtils'

const Section = ({ children, className = '' }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.4 }}
    className={className}
  >
    {children}
  </motion.section>
)

// Dashboard do perfil ADMINISTRADOR — governança e observabilidade:
// saúde da plataforma, usuários, fontes, integrações, ingestão, métricas e logs.
// Estrutura pronta para backend; dados demonstrativos e honestos.
export default function AdminDashboard() {
  // O selo seguia fixo em demonstração. Fontes, coleta e saúde deste painel
  // vêm da API há vários commits; anunciar-se como demonstração ensina a não
  // olhar o selo, que é o oposto do que ele serve.
  const [apiViva, setApiViva] = useState(false)
  useEffect(() => {
    let vivo = true
    apiOnline().then((ok) => { if (vivo) setApiViva(ok) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  // Saude e fontes vem do servidor — os mesmos endpoints do console de
  // governanca, para os dois nao divergirem.
  const saude = useResource(() => adminService.health(), [])
  const fontes = useResource(() => adminService.sources(), [])
  const auditoria = useResource(() => adminService.audit({ limit: 12 }), [])
  const usuarios = useResource(() => adminService.users(), [])

  // Contas por plano, contadas do que o servidor devolve.
  const contas = usuarios.data?.items || []
  const contasPorPlano = useMemo(() => {
    const conta = {}
    for (const u of contas) conta[u.plan || 'sem plano'] = (conta[u.plan || 'sem plano'] || 0) + 1
    return Object.entries(conta).sort((a, b) => b[1] - a[1])
  }, [contas])

  const acervo = saude.data?.archive
  const agendador = saude.data?.scheduler
  // Execuções nas últimas 24h, do histórico real de coleta.
  const execucoes24h = useMemo(() => {
    const itens = auditoria.data?.items || []
    const corte = Date.now() - 24 * 3600_000
    return itens.filter((e) => new Date(e.time || e.started_at || 0).getTime() >= corte).length
  }, [auditoria.data])

  const servicos = saude.data?.services || []
  const operacionais = servicos.filter((x) => x.status === 'operational').length
  const listaFontes = fontes.data?.items || []
  const fontesOk = listaFontes.filter((f) => f.last_status === 'ok').length

  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] || 'Administrador'

  // Este painel resumia `monitoredSources.js`: um catálogo de 12 fontes com
  // status escritos à mão. O servidor tem 21 cadastradas e mede o estado de
  // cada uma a cada coleta — e a página já buscava esses dados três linhas
  // acima, para exibi-los na frase de rodapé. Duas contagens diferentes da
  // mesma coisa, uma ao lado da outra, e a estática por cima.
  const resumoFontes = useMemo(() => {
    // `status` já vem normalizado pela ponte (paraFonte) para as chaves de
    // SOURCE_STATUS. Ler `lastStatus` aqui — o campo cru da API — fazia todas
    // as 21 caírem em 'configurada', e o painel exibia "21 sem coleta ainda"
    // logo acima da própria frase que dizia "21 responderam na última coleta".
    const r = { ativa: 0, indisponivel: 0, configurada: 0, pendente: 0 }
    for (const f of listaFontes) {
      if (r[f.status] !== undefined) r[f.status] += 1
    }
    return r
  }, [listaFontes])

  const porCategoria = useMemo(() => {
    const mapa = new Map()
    for (const f of listaFontes) {
      // `category` é a categoria fixa do CATÁLOGO ('inst-br'); a categoria
      // real da fonte — Oficial, Agência pública, Legislativo — vem em `type`.
      const cat = f.type || 'Sem categoria'
      mapa.set(cat, (mapa.get(cat) || 0) + 1)
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [listaFontes])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* CABEÇALHO — governança */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                  <ShieldCheck size={14} /> Governança da plataforma
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-600 dark:text-gold-400">
                  Administrador
                </span>
                <Badge type={apiViva ? 'live' : 'demo'} />
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greetingByHour()}, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                Saúde dos serviços, status das fontes e trilha de auditoria — tudo derivado do
                estado do servidor, não de valores escritos à mão.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/configuracoes" className="btn-primary">
                  <SettingsIcon size={16} /> Configurações do sistema
                </Link>
                <Link to="/fontes" className="btn-ghost border-white/20 text-white hover:bg-white/10">
                  <Database size={16} /> Fontes monitoradas
                </Link>
              </div>
            </div>

            {/* Saúde global */}
            <div className="w-full shrink-0 rounded-xl border border-white/10 bg-white/5 p-4 lg:w-64">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Saúde global</span>
                <HeartPulse size={15} className="text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">{operacionais}/{servicos.length || '—'}</span>
                <span className="font-mono text-sm text-gray-400">operacionais</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Capacidades ainda não implementadas aparecem como <strong>planejadas</strong>, e o
                cálculo não as conta como falha.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* KPIs de governança */}
      <Section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Os quatro indicadores vinham de `platformMetrics`: "128 contas no
              plano Explorar", "82 relatórios emitidos" — de um recurso que já
              nem existe. Agora contam o que o servidor sabe. */}
          <MetricCard
            icon={Database}
            label="Fontes cadastradas"
            value={String(listaFontes.length || '—')}
            hint={`${fontesOk} responderam na última execução`}
            accent="amber"
          />
          <MetricCard
            icon={Server}
            label="Capacidades operacionais"
            value={`${operacionais}/${servicos.length || '—'}`}
            hint="derivado do estado do banco"
            accent="green"
          />
          <MetricCard
            icon={Users}
            label="Perfis de acesso"
            value="4"
            hint="visitante, usuário, analista, admin"
            accent="brand"
          />
          <MetricCard
            icon={ScrollText}
            label="Artigos no acervo"
            value={String(saude.data?.archive?.artigos ?? saude.data?.acervo?.artigos ?? '—')}
            hint="coletados e guardados"
            accent="brand"
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna primária */}
        <div className="space-y-6 lg:col-span-2">
          {/* Saúde dos serviços */}
          <Section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
              <Server size={18} className="text-brand-400 dark:text-brand-300" /> Saúde dos serviços
            </h2>
            <div className="space-y-2">
              {servicos.map((s) => {
                const st = HEALTH_STATUS[s.status] || HEALTH_STATUS.planned
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="truncate text-xs muted">{s.note}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-right">
                      <span className="hidden font-mono text-xs muted sm:inline">{s.uptime || '—'} · {s.latency || '—'}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Status das fontes (resumo + por categoria) */}
          <Section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Database size={18} className="text-brand-400 dark:text-brand-300" /> Status das fontes
              </h2>
              <Link to="/fontes" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
                Detalhes <ChevronRight size={15} />
              </Link>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.entries(resumoFontes).filter(([, n]) => n > 0).map(([chave, quantas]) => {
                const meta = SOURCE_STATUS[chave]
                if (!meta) return null
                return (
                  <span key={chave} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {quantas} {meta.label.toLowerCase()}
                  </span>
                )
              })}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {porCategoria.map(([categoria, quantas]) => (
                <div key={categoria} className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{categoria}</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold">{quantas}</p>
                  <p className="text-[11px] muted">fonte(s) cadastrada(s)</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs muted">
              {listaFontes.length
                ? `${listaFontes.length} fonte(s) cadastrada(s) · ${fontesOk} responderam na última coleta.`
                : 'Sem resposta do servidor de coleta.'}
            </p>
          </Section>

          {/* Trilha de auditoria */}
          <Section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
              <ScrollText size={18} className="text-brand-400 dark:text-brand-300" /> Trilha de auditoria
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                    <th className="py-2 pr-4 font-semibold">Quando</th>
                    <th className="py-2 pr-4 font-semibold">Ator</th>
                    <th className="py-2 pr-4 font-semibold">Ação</th>
                    <th className="py-2 font-semibold">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditoria.data?.items || []).slice(0, 12).map((ev) => {
                    const lvl = AUDIT_LEVEL[ev.level] || AUDIT_LEVEL.info
                    return (
                      <tr key={ev.id} className="border-b border-gray-100 dark:border-white/[0.06]">
                        <td className="py-2 pr-4 font-mono text-xs muted">{formatDateTimeBR(ev.time)}</td>
                        <td className="py-2 pr-4 text-xs">{ev.actor}</td>
                        <td className="py-2 pr-4">
                          <span className="block">{ev.action}</span>
                          <span className="text-xs muted">{ev.target}</span>
                        </td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lvl.classes}`}>{lvl.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs muted">Trilha real de execuções dos coletores — início, duração, itens e erro.</p>
          </Section>
        </div>

        {/* Trilho lateral */}
        <div className="space-y-6">
          {/* Contas por plano.

              Vinha de `platformMetrics.contasPorPlano`, escrito à mão: 128
              contas no plano Explorar, 34 no Profissional, 6 no Institucional.
              Existem três contas. Num painel de GOVERNANÇA, cuja função é
              responder "qual é o estado real da plataforma", um número de
              usuários inventado é a informação que menos pode ser inventada. */}
          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Users size={17} className="text-brand-400 dark:text-brand-300" /> Contas por plano
            </h2>
            {contas.length === 0 ? (
              <p className="text-sm italic muted">
                {usuarios.loading ? 'Consultando…' : 'Não foi possível ler as contas.'}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {contasPorPlano.map(([plano, quantas]) => (
                  <li key={plano} className="flex items-center justify-between gap-3">
                    <span className="text-sm capitalize muted">{plano}</span>
                    <span className="font-mono text-sm font-bold">{quantas}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] muted">
              {contas.length} conta(s) cadastrada(s) no servidor.
            </p>
          </Section>

          {/* Integrações */}
          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <PlugZap size={17} className="text-brand-400 dark:text-brand-300" /> Integrações
            </h2>
            <ul className="space-y-2.5">
              {integrations.map((i) => {
                const st = HEALTH_STATUS[i.status] || HEALTH_STATUS.planned
                return (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="truncate text-[11px] muted">{i.kind} · {i.note}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classes}`}>{st.label}</span>
                  </li>
                )
              })}
            </ul>
          </Section>

          {/* Ingestão */}
          <Section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
              <Activity size={17} className="text-brand-400 dark:text-brand-300" /> Ingestão (24h)
            </h2>
            {/* Estes quatro números eram constantes de `ingestion`: 15 fontes
                configuradas, 0 coletas, 0 normalizados, 0 na fila — imóveis,
                coletasse a plataforma o que coletasse. "Na fila" sumiu junto:
                não existe fila, a coleta é síncrona por ciclo, e um contador
                sempre em zero sugere um mecanismo que não existe. */}
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Execuções (24h)" value={execucoes24h} />
              <Stat label="Artigos no acervo" value={acervo?.artigos ?? '—'} />
              <Stat label="Aprovados" value={acervo?.artigosRelevantes ?? '—'} />
              <Stat label="Fontes ativas" value={acervo?.fontes ?? '—'} />
            </div>
            <p className="mt-3 text-[11px] muted">
              {agendador?.ativo
                ? `Agendador a cada ${agendador.intervaloMinutos} min.`
                : 'Agendador desligado.'}
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
