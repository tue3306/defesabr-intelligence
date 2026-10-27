import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  Bell,
  Building2,
  ChevronDown,
  Crosshair,
  Factory,
  GraduationCap,
  Landmark,
  Layers,
  Newspaper,
  Radar,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import GaugeChart, { LegendaAlerta } from '../components/charts/GaugeChart'
import { useNews } from '../hooks/useNews'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useGastoMilitar, useIndiceDeAlerta } from '../hooks/useDadosReais'
import { useVitrineReal } from '../hooks/useVitrineReal'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { USE_CASES, FAQ } from '../data/landingExtra'

const USE_CASE_ICONS = { Radar, Building2, ShieldAlert, Landmark, Factory, GraduationCap }

const Section = ({ children, className = '', id }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.4 }}
    className={className}
  >
    {children}
  </motion.section>
)

export default function Landing() {
  const { news, loading, erro: erroNoticias } = useNews()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const abrirAuth = useUiStore((s) => s.abrirAuth)

  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()
  const alerta = useIndiceDeAlerta(7)
  // UM hook para os números da vitrine — ver o cabeçalho de useVitrineReal.
  const v = useVitrineReal()
  const feed = news.slice(0, 3)

  const verComoFunciona = () =>
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // ORDEM DA PÁGINA — a de toda boa página de produto: o que é e o que fazer
  // (hero), como funciona, a prova ao vivo, o que a diferencia, os dados por
  // trás, as dúvidas e a chamada final. Cada bloco aparece UMA vez: os
  // números do topo não se repetem num segundo painel, e o glossário mora no
  // Centro Educacional. Cada número exibido vem da API, medido; sem resposta,
  // vira traço em vez de estimativa.
  return (
    <div className="space-y-14 sm:space-y-16">
      {/* ── HERO ── */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/50 px-6 py-10 sm:px-12 sm:py-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <ShieldCheck size={14} /> Segurança e defesa do Brasil
          </span>

          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {isAuthenticated ? (
              <>Bem-vindo de volta, {user?.name?.split(' ')[0]}.</>
            ) : (
              <>
                O que ameaça o Brasil,{' '}
                <span className="text-gold-400">antes de virar notícia</span>.
              </>
            )}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
            Lemos jornais, órgãos oficiais e os sites onde criminosos divulgam vazamentos — a cada
            15 minutos — e mostramos, numa tela só, o que importa para a segurança do país. Sempre
            com a fonte.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link to="/painel" className="btn-primary px-5 py-2.5 text-base">
                Ir para o painel <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <button type="button" onClick={() => abrirAuth('cadastrar')} className="btn-primary px-5 py-2.5 text-base">
                  <UserPlus size={18} /> Criar conta grátis
                </button>
                <button
                  type="button"
                  onClick={verComoFunciona}
                  className="btn-ghost border-white/30 px-5 py-2.5 text-base text-white hover:bg-white/10"
                >
                  Como funciona <ArrowDown size={18} />
                </button>
              </>
            )}
          </div>
          {!isAuthenticated && (
            <p className="mt-3 text-xs text-gray-400">
              Gratuito e de código aberto · só usuário e senha, sem e-mail · menos de um minuto
            </p>
          )}

          {/* A prova, em números medidos */}
          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-8 sm:grid-cols-4">
            <Prova valor={v.vitimasBr} rotulo="vazamentos de organizações brasileiras" />
            <Prova
              valor={v.fontes}
              rotulo={v.fontesOk != null ? `fontes · ${v.fontesOk} no ar agora` : 'fontes acompanhadas'}
            />
            <Prova valor={v.artigos} rotulo="notícias relevantes no acervo" />
            <Prova valor={v.paises} rotulo="países citados" />
          </dl>
          {!v.aoVivo && !v.carregando && (
            <p className="mt-4 text-xs text-gray-400">
              O servidor não respondeu; os números aparecem quando ele voltar.
            </p>
          )}
        </div>
      </Section>

      {/* ── COMO FUNCIONA ── */}
      {!isAuthenticated && (
        <Section id="como-funciona" className="scroll-mt-24">
          <Cabecalho
            rotulo="Como funciona"
            titulo="Três passos, nenhum conhecimento prévio"
            texto="Você não precisa entender de defesa: cada tela explica o que mostra, e todo termo técnico tem definição ao lado."
          />
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            <Passo
              n={1}
              icone={UserPlus}
              titulo="Crie sua conta"
              texto="Só usuário e senha. Sem e-mail, sem cartão, sem confirmação a esperar."
            />
            <Passo
              n={2}
              icone={Newspaper}
              titulo="Leia as notícias do dia"
              texto="O que saiu hoje sobre defesa e segurança, já separado por assunto e por urgência. Salve o que quiser reler."
            />
            <Passo
              n={3}
              icone={Bell}
              titulo="Receba o aviso do que é grave"
              texto="Quando algo crítico aparece, a plataforma avisa na tela — e explica por que aquilo é grave."
            />
          </ol>
          <p className="mt-5 text-center text-sm muted">
            Não conhece algum termo?{' '}
            <Link to="/aprender" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Glossário e quiz no Centro Educacional
            </Link>
            .
          </p>
        </Section>
      )}

      {/* ── NOTÍCIAS (abertas) ── */}
      <Section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Notícias recentes</h2>
            <p className="mt-1 text-sm muted">Uma amostra do que a coleta trouxe agora — aberta a todos.</p>
          </div>
          <Link to="/clipping" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : feed.length
              ? feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)
              : (
                <p className="col-span-full rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm muted dark:border-white/15">
                  {erroNoticias
                    ? 'Não foi possível carregar as notícias agora — a API não respondeu.'
                    : 'Nenhuma notícia no período.'}
                </p>
              )}
        </div>
      </Section>

      {/* ── O QUE NÃO ESTÁ NO NOTICIÁRIO ──
        * A pergunta dos primeiros dez segundos: por que isto, e não notícia de
        * graça? Cada resposta aponta para uma tela que existe e funciona. */}
      <Section>
        <Cabecalho
          rotulo="Por que usar"
          titulo="O que você não encontra no noticiário"
          texto="Notícia é o que já aconteceu e alguém decidiu publicar. Aqui há três coisas a mais."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Diferencial
            icone={ShieldAlert}
            titulo="O ataque antes da manchete"
            texto="Um vazamento aparece no site do grupo criminoso dias ou semanas antes de virar notícia — quando vira. Mostramos quais organizações brasileiras foram expostas, com setor e data."
            numero={v.vitimasBr}
            unidade="organizações brasileiras"
            para="/ciberameacas"
          />
          <Diferencial
            icone={Crosshair}
            titulo="Quem ataca o Brasil"
            texto="Só os grupos com vítima brasileira registrada, com as técnicas que usam e quantos já atingiram órgãos públicos."
            numero={v.gruposContraBrasil}
            unidade="grupos com vítima no Brasil"
            para="/atores"
          />
          <Diferencial
            icone={Layers}
            titulo="O fato, não a repetição"
            texto="Dezenas de veículos publicam a mesma coisa. Agrupamos o que é o mesmo evento e mostramos quantos o cobriram."
            numero={v.fontes}
            unidade="fontes lidas a cada 15 min"
            para="/clipping"
          />
        </div>
      </Section>

      {/* ── MAPA ── "risco" seria promessa; o mapa conta menções. */}
      <Section className="card p-5 sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Quais países aparecem nas notícias</h2>
          <Badge type={v.aoVivo ? 'live' : v.carregando ? 'carregando' : 'sem-dado'} />
        </div>
        <p className="mb-4 text-sm muted">
          Quanto mais escuro, mais notícias citam o país. Mede volume de cobertura, não risco.
          Passe o cursor para ver as manchetes.
        </p>
        <GlobalHeatmap height={420} />
      </Section>

      {/* ── DADOS POR TRÁS ── */}
      <Section>
        <Cabecalho
          rotulo="Dados abertos"
          titulo="Os números por trás"
          texto="Séries públicas que você acompanha por dentro, cada uma com a fonte declarada."
        />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-1 text-base font-bold tracking-tight">Gastos militares do Brasil</h3>
            <p className="mb-3 text-xs muted">Banco Mundial — série histórica em US$ correntes.</p>
            <MilitarySpendingChart data={gasto.data} mode={gasto.aoVivo ? 'usd' : 'dual'} height={260} />
          </div>
          <div className="card flex flex-col p-5">
            <h3 className="mb-1 text-base font-bold tracking-tight">Nível de alerta da semana</h3>
            <p className="mb-2 text-xs muted">Média da urgência das notícias dos últimos 7 dias (0 a 100).</p>
            <div className="flex flex-1 items-center">
              {alerta.value != null ? (
                <GaugeChart value={alerta.value} height={200} />
              ) : (
                <p className="w-full py-8 text-center text-sm muted">
                  {alerta.carregando ? 'Calculando…' : 'Índice indisponível — a API não respondeu.'}
                </p>
              )}
            </div>
            <LegendaAlerta />
          </div>
          <div className="card p-5 lg:col-span-3">
            <h3 className="mb-1 text-base font-bold tracking-tight">Notícias por assunto — últimos 14 dias</h3>
            <p className="mb-3 text-xs muted">Quantas notícias relevantes a coleta aprovou por dia, em cada categoria.</p>
            <NewsVolumeChart data={volume.data} keys={volume.keys} height={240} />
          </div>
        </div>
      </Section>

      {/* ── PARA QUEM É ── */}
      <Section>
        <Cabecalho rotulo="Para quem é" titulo="Feito para quem acompanha o tema" />
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
          {USE_CASES.map((u) => {
            const Icon = USE_CASE_ICONS[u.icon] || Radar
            return (
              <div key={u.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight">{u.title}</h3>
                  <p className="mt-0.5 text-sm leading-snug muted">{u.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section>
        <Cabecalho rotulo="Perguntas frequentes" titulo="Ficou alguma dúvida?" />
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-semibold sm:p-5">
                {item.q}
                <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:px-5 sm:pb-5">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ── CHAMADA FINAL ── */}
      <Section className="card overflow-hidden">
        <div className="on-dark flex flex-col items-center gap-4 bg-gradient-to-br from-brand-900/40 via-military-card to-military-darker px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isAuthenticated ? 'Tudo pronto no seu painel' : 'Comece em menos de um minuto'}
          </h2>
          <p className="max-w-xl text-gray-300">
            Gratuito, de código aberto e sem anúncios. Crie a sua conta e veja o que saiu hoje sobre a
            segurança do Brasil.
          </p>
          {isAuthenticated ? (
            <Link to="/painel" className="btn-primary px-5 py-2.5 text-base">Ir para o painel <ArrowRight size={18} /></Link>
          ) : (
            <button type="button" onClick={() => abrirAuth('cadastrar')} className="btn-primary px-5 py-2.5 text-base">
              <UserPlus size={18} /> Criar conta grátis
            </button>
          )}
        </div>
      </Section>
    </div>
  )
}

/**
 * Um número da vitrine.
 *
 * Ausência é exibida como ausência: sem dado, o traço. A tentação de mostrar
 * "0" é forte e errada — zero é uma afirmação ("não há vítimas brasileiras"),
 * e o que se sabe nesse caso é que a API não respondeu.
 */
function Prova({ valor, rotulo }) {
  return (
    <div>
      <dt className="text-3xl font-extrabold tabular-nums tracking-tight text-white sm:text-4xl">
        {valor == null ? <span className="text-gray-500">—</span> : valor.toLocaleString('pt-BR')}
      </dt>
      <dd className="mt-1 text-sm leading-snug text-gray-300">{rotulo}</dd>
    </div>
  )
}

/** Um diferencial, sempre ancorado numa tela que existe. */
function Diferencial({ icone: Icone, titulo, texto, numero, unidade, para }) {
  return (
    <Link to={para} className="card group flex flex-col p-5 transition-colors hover:border-gold-500/50">
      <Icone size={22} className="text-gold-600 dark:text-gold-400" />
      <h3 className="mt-3 font-bold tracking-tight">{titulo}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed muted">{texto}</p>
      {numero != null && (
        <p className="mt-3 border-t border-gray-200 pt-3 text-sm dark:border-white/10">
          <strong className="font-mono text-lg">{numero.toLocaleString('pt-BR')}</strong>{' '}
          <span className="muted">{unidade}</span>
        </p>
      )}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
        Ver <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** Abertura de seção: rótulo pequeno, título e uma linha de contexto. */
function Cabecalho({ rotulo, titulo, texto }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400">{rotulo}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h2>
      {texto && <p className="mt-3 text-base leading-relaxed muted">{texto}</p>}
    </div>
  )
}

function Passo({ n, icone: Icone, titulo, texto }) {
  return (
    <li className="card relative p-6">
      <span className="absolute right-5 top-5 font-mono text-sm font-bold text-gray-300 dark:text-white/20">0{n}</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400">
        <Icone size={20} />
      </span>
      <h3 className="mt-4 font-bold tracking-tight">{titulo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed muted">{texto}</p>
    </li>
  )
}
