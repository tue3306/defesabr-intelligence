import { Link } from 'react-router-dom'
import {
  Newspaper, Landmark, DollarSign, Activity, ArrowRight, Database,
  ShieldCheck, Rss, Map, CheckCircle2, MinusCircle, ExternalLink,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import DataState from '../components/ui/DataState'
import NewsCard from '../components/ui/NewsCard'
import EmptyState from '../components/ui/EmptyState'
import { useResource } from '../hooks/useResource'
import { noticias, sistema } from '../services'
import { FONTES, NAO_IMPLEMENTADO } from '../services/config'
import { META_ALERTA } from '../data/reference'
import { timeAgo } from '../utils/dateUtils'

// -----------------------------------------------------------------------------
// INÍCIO
//
// A primeira tela precisa responder três perguntas antes de qualquer outra
// coisa: o que isto é, de onde vêm os dados, e o que já funciona.
//
// Por isso ela abre com NÚMEROS DO BANCO, não com uma promessa. Um painel de
// entrada que diz "monitoramento inteligente em tempo real" e mostra um
// gráfico decorativo pede confiança antes de tê-la merecido.
// -----------------------------------------------------------------------------
export default function Landing() {
  const clipping = useResource(() => noticias.clipping({ days: 30, limit: 6 }), [])
  const status = useResource(() => sistema.status(), [])

  const d = clipping.data
  const s = status.data
  const alerta = d?.alert

  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <section className="card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
          Agregador de fontes públicas
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          Defesa e segurança do Brasil,<br className="hidden sm:block" /> reunidas de fonte oficial.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          O servidor coleta feeds do Ministério da Defesa e das agências públicas, busca proposições
          nos Dados Abertos da Câmara e séries oficiais do World Bank. Filtra por relevância com uma
          regra declarada, e mostra o resultado com a procedência de cada item.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/clipping" className="btn-primary text-sm">
            <Newspaper size={15} /> Ver o clipping
          </Link>
          <Link to="/status" className="btn-ghost text-sm">
            <Activity size={15} /> O que funciona <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* NÚMEROS REAIS */}
      <DataState loading={status.loading && !s} error={status.error} onRetry={status.refetch} skeletonCount={4}>
        {s && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={Database}
                label="Notícias no acervo"
                value={String(s.acervo.artigos)}
                hint={`${s.acervo.artigosRelevantes} aprovadas pelo filtro`}
                accent="brand"
              />
              <MetricCard icon={Landmark} label="Proposições" value={String(s.acervo.proposicoes)} hint="da Câmara dos Deputados" accent="brand" />
              <MetricCard icon={DollarSign} label="Pontos de série" value={String(s.acervo.indicadores)} hint="World Bank e câmbio" accent="brand" />
              <MetricCard
                icon={s.resumo.degradado ? Activity : CheckCircle2}
                label="Saúde do sistema"
                value={`${s.resumo.saude}%`}
                hint={`${s.resumo.operacional} capacidades operacionais`}
                accent={s.resumo.saude >= 90 ? 'green' : 'amber'}
              />
            </div>

            {alerta?.level && (
              <section className="card flex flex-wrap items-center gap-4 p-5">
                <ShieldCheck size={20} style={{ color: META_ALERTA[alerta.level]?.cor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide muted">Nível de alerta — últimos 30 dias</p>
                  <p className="text-xl font-extrabold tracking-tight" style={{ color: META_ALERTA[alerta.level]?.cor }}>
                    {META_ALERTA[alerta.level]?.rotulo}
                    <span className="ml-2 font-mono text-sm muted">{alerta.score}/100</span>
                  </p>
                  <p className="text-xs muted">{alerta.basis}</p>
                </div>
                <Link to="/clipping" className="btn-ghost text-sm">Ver detalhe <ArrowRight size={14} /></Link>
              </section>
            )}
          </>
        )}
      </DataState>

      {/* ÚLTIMAS OCORRÊNCIAS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Últimas ocorrências</h2>
          <Link to="/clipping" className="text-sm font-semibold text-brand-500 hover:underline dark:text-brand-400">
            Ver todas
          </Link>
        </div>
        <DataState loading={clipping.loading && !d} error={clipping.error} onRetry={clipping.refetch} skeletonCount={3}>
          {(d?.news || []).length === 0 ? (
            <EmptyState
              compact
              icon={Database}
              title="Nada relevante nos últimos 30 dias"
              hint="As fontes de defesa não publicam todo dia. Dispare uma coleta no painel de status."
              action={{ label: 'Ir para o Status', to: '/status' }}
            />
          ) : (
            <div className="space-y-3">
              {d.news.slice(0, 5).map((n) => <NewsCard key={n.id} noticia={n} />)}
            </div>
          )}
        </DataState>
      </section>

      {/* MÓDULOS */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Módulos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/clipping', icone: Newspaper, titulo: 'Clipping', texto: 'As ocorrências do período, com nível de alerta calculado da distribuição de urgências.' },
            { to: '/legislativo', icone: Landmark, titulo: 'Radar Legislativo', texto: 'Proposições em tramitação na Câmara que tocam defesa e segurança.' },
            { to: '/economia', icone: DollarSign, titulo: 'Economia & Defesa', texto: 'Gasto militar, efetivo e PIB — séries oficiais com o ano de referência declarado.' },
            { to: '/mapa', icone: Map, titulo: 'Mapa de cobertura', texto: 'A que lugares do Brasil o acervo se refere. Mede cobertura, não risco.' },
            { to: '/fontes', icone: Rss, titulo: 'Fontes', texto: 'O que cada fonte respondeu na última tentativa, com histórico de disponibilidade.' },
            { to: '/status', icone: Activity, titulo: 'Status', texto: 'O que funciona, o que está degradado e o que não existe nesta versão.' },
          ].map((m) => {
            const Icone = m.icone
            return (
              <Link key={m.to} to={m.to} className="card group p-5 transition-colors hover:border-gold-500/40">
                <Icone size={20} className="text-gold-500" />
                <h3 className="mt-3 text-sm font-bold tracking-tight">{m.titulo}</h3>
                <p className="mt-1 text-xs leading-relaxed muted">{m.texto}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 dark:text-brand-400">
                  Abrir <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* FONTES E LIMITES, LADO A LADO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <CheckCircle2 size={17} className="text-emerald-500" /> De onde vêm os dados
          </h2>
          <p className="mb-3 text-xs muted">Todas públicas e gratuitas. Nenhuma exige credencial.</p>
          <ul className="space-y-2">
            {FONTES.map((f) => (
              <li key={f.nome} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-semibold">{f.nome}</span>
                  <span className="ml-1 text-[10px] font-bold uppercase muted">{f.tipo}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed muted">{f.nota}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Os limites com a mesma seriedade das capacidades. Um sistema que não
            publica o que não faz convida quem o usa a atribuir-lhe o que ele
            não tem. */}
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <MinusCircle size={17} className="text-gray-400" /> O que esta versão não faz
          </h2>
          <p className="mb-3 text-xs muted">Declarado com a mesma seriedade do que ela faz.</p>
          <ul className="space-y-2.5">
            {NAO_IMPLEMENTADO.map((n) => (
              <li key={n.titulo}>
                <p className="text-sm font-semibold">{n.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed muted">{n.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {s?.agendador && (
        <p className="text-center text-xs muted">
          {s.agendador.ativo
            ? `A coleta roda automaticamente a cada ${s.agendador.intervaloMinutos} minutos.`
            : 'O agendador está desligado nesta instalação.'}
          {s.agendador.ultimaExecucao && ` Última execução ${timeAgo(s.agendador.ultimaExecucao)}.`}
        </p>
      )}
    </div>
  )
}
