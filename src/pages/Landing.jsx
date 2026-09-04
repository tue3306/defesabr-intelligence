import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Newspaper, Globe2, BarChart3, LineChart, GraduationCap, ShieldCheck, ArrowRight, Sparkles, BookOpen, Brain, RotateCcw, Check, Linkedin, Twitter, Youtube, Instagram, Radar, Building2, ShieldAlert, Landmark, Factory, ChevronDown, HelpCircle, Route, CircleDot, Eye, UserCircle, PenTool, ShieldQuestion, Target, Database, Crosshair, Layers } from 'lucide-react'
import NewsCard from '../components/ui/NewsCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import GlobalHeatmap from '../components/charts/GlobalHeatmap'
import MilitarySpendingChart from '../components/charts/MilitarySpendingChart'
import NewsVolumeChart from '../components/charts/NewsVolumeChart'
import GaugeChart from '../components/charts/GaugeChart'
import { useNews } from '../hooks/useNews'
import { useNewsVolume } from '../hooks/useNewsVolume'
import { useGastoMilitar, useIndiceDeAlerta } from '../hooks/useDadosReais'
import { useVitrine } from '../hooks/useVitrine'
import { useVitrineReal } from '../hooks/useVitrineReal'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { PROFILES, PROFILE_ORDER } from '../auth/permissions'
import { LANDING_FEATURES, PLANS } from '../data/plansData'
import { glossary } from '../data/learnData'
import { USE_CASES, STANDARDS, FAQ, ROADMAP } from '../data/landingExtra'
import { alertMeta } from '../utils/textUtils'

const FEATURE_ICONS = { Newspaper, Globe2, BarChart3, LineChart, GraduationCap, ShieldCheck }

// Os 4 perfis do produto, com a persona de demonstração correspondente e a
// rota-âncora de cada um. Os rótulos vêm sempre de src/auth/permissions.js.
const PROFILE_ENTRY = {
  visitor: {
    persona: 'visitante', icon: Eye, to: '/planos', cta: 'Continuar explorando',
    does: [
      'Lê o conteúdo público e as prévias das análises',
      'Acessa o Centro Educacional por completo',
      'Compara os planos antes de decidir',
    ],
  },
  user: {
    persona: 'usuario', icon: UserCircle, to: '/painel', cta: 'Ver como Usuário',
    does: [
      'Acompanha o painel de situação e o clipping diário',
      'Explora programas, fronteiras e Amazônia Azul',
      'Salva conteúdos na pasta pessoal e recebe alertas',
    ],
  },
  analyst: {
    persona: 'analista', icon: PenTool, to: '/painel', cta: 'Ver como Analista',
    does: [
      'Acompanha o clipping e o radar legislativo por completo',
      'Consulta a confiabilidade medida de cada fonte',
      'Exporta séries e comparativos em CSV',
    ],
  },
  admin: {
    persona: 'admin', icon: ShieldQuestion, to: '/admin', cta: 'Ver como Administrador',
    does: [
      'Gere contas, papéis e planos da plataforma',
      'Configura fontes de coleta e integrações',
      'Acompanha auditoria e saúde do sistema',
    ],
  },
}
const USE_CASE_ICONS = { Radar, Building2, ShieldAlert, Landmark, Factory, GraduationCap }
const SOCIALS = [
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com' },
  { icon: Twitter, label: 'X', href: 'https://x.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com' },
]

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

export default function Landing() {
  const { news, loading } = useNews()
  const navigate = useNavigate()
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  const volume = useNewsVolume(14)
  const gasto = useGastoMilitar()
  const alerta = useIndiceDeAlerta(7)
  const vitrine = useVitrine()
  const v = useVitrineReal()
  const feed = news.slice(0, 3)

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════

          A primeira dobra dizia: "Clipping diário, análise de cenários, mapas
          de risco e dados ao vivo — para empresas, instituições, pesquisadores
          e estudantes." É uma frase que serve para qualquer produto de
          qualquer setor, e por isso não serve para nenhum. Quem lia não
          descobria o que a plataforma faz, para quem é, nem por que pagaria.

          Enquanto isso a plataforma passou a ter coisas que não existem
          prontas em outro lugar — 545 organizações brasileiras com vazamento
          divulgado, os órgãos públicos entre elas, as vulnerabilidades
          cruzadas com quem ataca o país — e nada disso aparecia aqui.

          A regra desta seção: cada número exibido vem da API, medido. Nenhum é
          escrito à mão, e quando a coleta não responde o número some em vez de
          virar estimativa. Uma vitrine que envelhece sozinha é a forma mais
          barata de perder credibilidade — o visitante confere o primeiro
          número e desconfia do resto da página.
          ═══════════════════════════════════════════════════════════════════ */}
      <Section className="card overflow-hidden">
        <div className="on-dark relative bg-gradient-to-br from-military-darker via-military-card to-brand-900/50 p-8 sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            <ShieldCheck size={14} /> Inteligência estratégica e cibernética · Brasil
          </span>

          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {isAuthenticated ? (
              <>Bem-vindo de volta, {user?.name?.split(' ')[0]}.</>
            ) : (
              <>
                O que ameaça o Brasil,{' '}
                <span className="text-brand-400 dark:text-brand-300">antes de virar notícia</span>.
              </>
            )}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
            Um servidor lê fontes oficiais e a imprensa a cada 30 minutos, filtra por uma regra
            publicada e cruza o resultado com os vazamentos que grupos de extorsão divulgam sobre
            organizações brasileiras. Você recebe o fato consolidado, com a fonte, o país
            envolvido e quem está por trás.
          </p>

          {/* ── A PROVA, EM NÚMEROS MEDIDOS ── */}
          <dl className="mt-7 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            <Prova
              valor={v.vitimasBr}
              rotulo="organizações brasileiras"
              detalhe="com vazamento divulgado desde 2017"
            />
            <Prova
              valor={v.fontes}
              rotulo="fontes coletadas"
              detalhe={v.fontesOk != null ? `${v.fontesOk} responderam na última coleta` : 'a cada 30 minutos'}
            />
            <Prova
              valor={v.artigos}
              rotulo="matérias no acervo"
              detalhe="aprovadas por filtro auditável"
            />
            <Prova
              valor={v.paises}
              rotulo="países correlacionados"
              detalhe="por menção no texto coletado"
            />
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Link to="/painel" className="btn-primary">Ir para o painel <ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/planos" className="btn-primary"><Sparkles size={16} /> Ver planos</Link>
                <Link to="/clipping" className="btn-ghost border-white/30 text-white hover:bg-white/10">
                  Ver o clipping de hoje
                </Link>
              </>
            )}
            <Link to="/aprender" className="btn-ghost border-white/30 text-white hover:bg-white/10">
              Centro educacional
            </Link>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            {v.aoVivo
              ? 'Números lidos da API agora — nenhum é escrito à mão.'
              : v.carregando
                ? 'Consultando a base…'
                : 'A API não respondeu; os números aparecem quando ela voltar.'}
          </p>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-xs uppercase tracking-wide text-gray-400">Siga</span>
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="text-gray-300 hover:text-white">
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          POR QUE PAGAR, EM VEZ DE ACOMPANHAR NOTÍCIA DE GRAÇA
          ═══════════════════════════════════════════════════════════════════

          É a pergunta que um cliente faz nos primeiros dez segundos, e a home
          não a respondia em lugar nenhum. Cada resposta abaixo aponta para uma
          tela que existe e funciona — nenhuma promete recurso futuro.
          ═══════════════════════════════════════════════════════════════════ */}
      {!isAuthenticated && (
        <Section>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Por que isto, e não acompanhar notícia de graça?
          </h2>
          <p className="mt-1 max-w-2xl text-sm muted">
            Notícia é o que já aconteceu e alguém decidiu publicar. Três coisas aqui não estão
            no noticiário.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Diferencial
              icone={ShieldCheck}
              titulo="O incidente antes da manchete"
              texto="Um vazamento aparece no site de extorsão do grupo dias ou semanas antes de virar
                     notícia — e na maioria das vezes nunca vira. A plataforma lê esses sites e mostra
                     quais organizações brasileiras foram divulgadas, com setor e data."
              numero={v.vitimasBr}
              unidade="organizações brasileiras no acervo"
              para="/ciberameacas"
            />
            <Diferencial
              icone={Crosshair}
              titulo="A correção que importa primeiro"
              texto="Boletim de vulnerabilidade lista os CVEs críticos do mês, que são centenas. Aqui a
                     lista é cruzada: só as que grupos COM VÍTIMA BRASILEIRA registrada sabem explorar,
                     com o CVSS e quem as usa."
              numero={v.gruposContraBrasil}
              unidade="grupos com vítima no Brasil"
              para="/atores"
            />
            <Diferencial
              icone={Layers}
              titulo="O fato, não a repetição dele"
              texto="Cinquenta fontes publicam a mesma coisa de formas diferentes. O clipping agrupa o
                     que é o mesmo evento e mostra quantos veículos o cobriram — corroboração é
                     informação; três manchetes parecidas são ruído."
              numero={v.fontes}
              unidade="fontes lidas a cada 30 min"
              para="/clipping"
            />
          </div>

          <p className="mt-4 text-xs muted">
            O acervo agregado é público. O detalhe — quais organizações, quais órgãos do Estado,
            quais vulnerabilidades e por qual grupo — exige conta.
          </p>
        </Section>
      )}

      {/* FAIXA DE CREDIBILIDADE — padrões como referência conceitual */}
      <Section className="card px-5 py-5 sm:px-6">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
          <p className="text-center text-xs font-semibold uppercase tracking-wider muted lg:text-left">
            Arquitetura e terminologia inspiradas em
            <br className="hidden lg:block" /> referências internacionais
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {STANDARDS.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] muted lg:text-right">
          Citadas apenas como inspiração conceitual — sem afirmar conformidade, homologação ou certificação.
        </p>
      </Section>

      {/* POR QUE USAR */}
      <Section>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-400 dark:text-brand-300">Conceitos-chave</p>
        <h2 className="mt-1 text-center text-2xl font-bold tracking-tight">Por que usar esta plataforma?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          Tudo o que você precisa para acompanhar Segurança e Defesa em um só lugar.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.icon] || ShieldCheck
            return (
              <div key={f.title} className="card p-5">
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300">
                  <Icon size={22} />
                </span>
                <h3 className="font-bold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{f.text}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* PARA QUEM É / CASOS DE USO */}
      <Section>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-400 dark:text-brand-300">Casos de uso</p>
        <h2 className="mt-1 text-center text-2xl font-bold tracking-tight">Feito para quem decide sob pressão</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          Uma camada de inteligência que organiza o caos informacional em contexto, risco e prioridade.
        </p>
        {/* Lista compacta: mesma informação, sem repetir a grade de cards acima
            (evita duas grades visualmente idênticas em sequência — §5). */}
        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {USE_CASES.map((u) => {
            const Icon = USE_CASE_ICONS[u.icon] || Radar
            return (
              <div key={u.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 dark:text-brand-300">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight">{u.title}</h3>
                  <p className="text-sm leading-snug muted">{u.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* PARA CADA PERFIL — o coração da demonstração */}
      <Section>
        <h2 className="text-center text-2xl font-bold tracking-tight">Uma plataforma, quatro experiências</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          O que você vê depende de quem você é. Entre em qualquer perfil e
          percorra a plataforma exatamente como aquela pessoa a usaria.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILE_ORDER.map((id) => {
            const profile = PROFILES[id]
            const entry = PROFILE_ENTRY[id]
            const Icon = entry.icon
            return (
              <div key={id} className="card flex flex-col p-5 transition-colors hover:border-gold-500/40">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${profile.color}22`, color: profile.color }}
                >
                  <Icon size={21} />
                </span>
                <h3 className="mt-3 text-base font-bold tracking-tight">{profile.label}</h3>
                {/* A cor do perfil já identifica o cartão pelo ícone acima. Repeti-la
                    no texto media entre 2,3:1 e 3,0:1 conforme o tema — a mesma
                    cor não serve para marcar e para ler. */}
                <p className="text-xs font-semibold uppercase tracking-wide muted">
                  {profile.tagline}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {entry.does.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed muted">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-800 dark:text-emerald-400 dark:text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { loginAsDemo(entry.persona); navigate(entry.to) }}
                  className={`mt-4 w-full justify-center text-sm ${id === 'analyst' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {entry.cta} <ArrowRight size={14} />
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-center text-xs muted">
          A troca de perfil é livre — também pelo menu do usuário, a qualquer momento.
        </p>
      </Section>

      {/* PRÉVIA DO PRODUTO — números lidos dos módulos, não promessas */}
      <Section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">O que já está monitorado agora</h2>
          <Badge type={vitrine.aoVivo ? 'live' : 'demo'} />
        </div>
        <p className="mt-1 text-sm muted">
          Contagens lidas do acervo neste instante — o que a coleta trouxe, não texto de vitrine.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* O nível de alerta só aparece quando há base para calculá-lo. A
              constante que ficava aqui dizia sempre "ATENÇÃO", em qualquer
              cenário — um indicador que nunca muda não é um indicador. */}
          <PreviewStat
            icon={ShieldCheck}
            value={alerta.level ? alertMeta[alerta.level]?.label || alerta.level : '—'}
            label="Nível de alerta do período"
            hint={alerta.value != null ? `${alerta.value}/100 na escala de postura` : 'sem dado no período'}
          />
          <PreviewStat
            icon={Database}
            value={vitrine.fontes != null ? String(vitrine.fontes) : '—'}
            label="Fontes coletadas"
            hint={vitrine.fontesOk != null ? `${vitrine.fontesOk} responderam na última execução` : 'oficiais e especializadas'}
          />
          <PreviewStat
            icon={Newspaper}
            value={vitrine.aprovados != null ? String(vitrine.aprovados) : '—'}
            label="Notícias no acervo"
            hint={vitrine.coletados != null ? `de ${vitrine.coletados} coletadas, após o filtro` : 'coleta contínua'}
          />
          <PreviewStat
            icon={Landmark}
            value={vitrine.proposicoes != null ? String(vitrine.proposicoes) : '—'}
            label="Proposições acompanhadas"
            hint="Câmara dos Deputados, dados abertos"
          />
        </div>
      </Section>

      {/* MAPA GLOBAL */}
      <Section className="card p-5 sm:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Cobertura por país</h2>
          <Badge type={vitrine.aoVivo ? 'live' : 'demo'} />
        </div>
        {/* "Panorama global de risco" prometia uma medida de risco que ninguém
            faz. O mapa conta menções em notícia coletada — que é útil, e é
            outra coisa. */}
        <p className="mb-4 text-sm muted">
          Quantas notícias coletadas mencionam cada país. Mede volume de cobertura, não risco.
          Passe o cursor para ver as manchetes.
        </p>
        <GlobalHeatmap height={420} />
      </Section>

      {/* PLATAFORMA EM AÇÃO (showcase de dados/gráficos) */}
      <Section>
        <h2 className="text-center text-2xl font-bold tracking-tight">A plataforma em ação</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">
          Dados e indicadores que você acompanha por dentro — gastos de defesa, volume de notícias e índice de alerta.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-1 text-base font-bold tracking-tight">Gastos militares — Brasil</h3>
            <p className="mb-3 text-xs muted">Série histórica (R$ bi) e % do PIB.</p>
            <MilitarySpendingChart
              data={gasto.data}
              mode={gasto.aoVivo ? 'usd' : 'dual'}
              height={260}
            />
          </div>
          <div className="card flex flex-col p-5">
            <h3 className="mb-1 text-base font-bold tracking-tight">Índice de alerta</h3>
            <p className="mb-2 text-xs muted">Resume a tensão de segurança do momento (0–100).</p>
            {/* Este medidor exibia `alertIndex`, uma constante escrita à mão,
                enquanto `useIndiceDeAlerta(7)` — que calcula o índice a partir
                da edição real do clipping — já estava sendo chamado logo acima
                e descartado. O número fixo era o mais visível da página. */}
            <div className="flex flex-1 items-center">
              {alerta.value != null ? (
                <GaugeChart value={alerta.value} height={200} />
              ) : (
                <p className="w-full py-8 text-center text-sm muted">
                  {alerta.carregando ? 'Calculando…' : 'Índice indisponível — a API não respondeu.'}
                </p>
              )}
            </div>
            {/* Legenda das faixas — ajuda a interpretar o número */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] muted">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#4a7c59' }} /> Normal</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#d4b41a' }} /> Atenção</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#d4841a' }} /> Alerta</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#c0392b' }} /> Crítico</span>
            </div>
          </div>
          <div className="card p-5 lg:col-span-3">
            <h3 className="mb-1 text-base font-bold tracking-tight">Volume de notícias — 14 dias</h3>
            <p className="mb-3 text-xs muted">Distribuição por categoria de Segurança &amp; Defesa.</p>
            <NewsVolumeChart data={volume.data} keys={volume.keys} height={240} />
          </div>
        </div>
      </Section>

      {/* NOTÍCIAS (ABERTAS) */}
      <Section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Notícias recentes</h2>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">Acesso livre</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : feed.map((n) => <NewsCard key={n.id} news={n} variant="compact" />)}
        </div>
        <Link to="/painel" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
          Ver mais notícias <ArrowRight size={15} />
        </Link>
      </Section>

      {/* ANÁLISES (PAYWALL) */}
      {/* Aqui havia uma seção "Análises & briefings estratégicos" com três
          cenários e suas probabilidades — 62%, 25%, 13% — atrás de um paywall.
          Os números eram escritos à mão em `mockData`. Vender por assinatura um
          cenário probabilístico que ninguém calculou é a forma mais direta de
          perder a credibilidade que o resto da página tenta construir: qualquer
          avaliador que pergunte "de onde vem esse 62%?" não terá resposta.

          A seção saiu inteira em vez de virar aviso. Análise de cenário depende
          de juízo humano registrado, que é trabalho a fazer, não recurso a
          exibir. O que a plataforma faz de verdade — coletar, filtrar e mostrar
          a série real — já está nas seções acima e abaixo desta. */}

      {/* MINI GLOSSÁRIO + CONCEITO DO DIA */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Mini glossário */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <BookOpen size={20} className="text-brand-400 dark:text-brand-300" /> Glossário essencial
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {glossary.slice(0, 4).map((g) => (
                <div key={g.term} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold tracking-tight">{g.term}</h3>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase muted">{g.category}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-gray-300">{g.definition}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm muted">
              Glossário completo no <Link to="/planos" className="font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">plano Profissional</Link>{' '}
              · ou explore o <Link to="/aprender" className="font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">Centro Educacional</Link>.
            </p>
          </div>

          {/* Conceito do dia (mini-interação) */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <Brain size={20} className="text-brand-400 dark:text-brand-300" /> Conceito do dia
            </h2>
            <ConceptOfDay />
          </div>
        </div>
      </Section>

      {/* PLANOS (PREVIEW) */}
      <Section>
        <h2 className="text-center text-2xl font-bold tracking-tight">Planos para cada necessidade</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm muted">Comece grátis. Faça upgrade quando quiser.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`card flex flex-col p-6 ${p.recommended ? 'border-gold-500/50 ring-1 ring-gold-500/30' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
                {p.recommended && <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400">Recomendado</span>}
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-2xl font-extrabold">{p.priceLabel}</span>
                <span className="mb-1 text-xs muted">{p.period}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-800 dark:text-emerald-400 dark:text-emerald-400" />
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/planos" className={`mt-5 ${p.recommended ? 'btn-primary' : 'btn-ghost'} w-full justify-center`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* ROADMAP */}
      <Section>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-widest text-brand-400 dark:text-brand-300">
          <Route size={13} /> Roadmap
        </p>
        <h2 className="mt-1 text-center text-2xl font-bold tracking-tight">Uma plataforma em evolução</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm muted">Direção do produto — o que já existe está marcado como disponível.</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((r) => (
            <div key={r.title} className={`card p-5 ${r.done ? 'border-gold-500/30' : ''}`}>
              <div className="flex items-center gap-2">
                {r.done
                  ? <Check size={15} className="shrink-0 text-emerald-800 dark:text-emerald-400" />
                  : <CircleDot size={15} className="shrink-0 text-gray-400" />}
                <span className={`text-[11px] font-bold uppercase tracking-wider ${r.done ? 'text-emerald-800 dark:text-emerald-400' : 'muted'}`}>{r.phase}</span>
              </div>
              <h3 className="mt-2 font-bold tracking-tight">{r.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-300">{r.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-bold uppercase tracking-widest text-brand-400 dark:text-brand-300">
          <HelpCircle size={13} /> Perguntas frequentes
        </p>
        <h2 className="mt-1 text-center text-2xl font-bold tracking-tight">Tudo o que você precisa saber</h2>
        <div className="mx-auto mt-6 max-w-3xl space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-semibold sm:p-5">
                {item.q}
                <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-gray-300 sm:px-5 sm:pb-5">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="card overflow-hidden">
        <div className="on-dark flex flex-col items-center gap-4 bg-gradient-to-br from-brand-900/40 via-military-card to-military-darker p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pronto para começar?</h2>
          <p className="max-w-xl text-gray-300">Crie sua conta gratuita e tenha o panorama de Defesa do Brasil na palma da mão.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/planos" className="btn-primary"><Sparkles size={16} /> Ver planos</Link>
            <Link to="/painel" className="btn-ghost border-white/30 text-white hover:bg-white/10">Explorar painel</Link>
          </div>
        </div>
      </Section>
    </div>
  )
}

function PreviewStat({ icon: Icon, value, label, hint }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <Icon size={18} className="text-gold-600 dark:text-gold-400" />
      <p className="mt-2 text-2xl font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-semibold">{label}</p>
      <p className="text-[11px] muted">{hint}</p>
    </div>
  )
}

function ConceptOfDay() {
  const concept = glossary[new Date().getDate() % glossary.length]
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="card flex h-full min-h-[200px] flex-col p-5">
      <span className="self-start rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-300">
        {concept.category}
      </span>
      <h3 className="mt-3 text-xl font-bold tracking-tight">{concept.term}</h3>
      {revealed ? (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-300">{concept.definition}</p>
      ) : (
        <p className="mt-2 flex-1 text-sm italic muted">Você sabe o que significa? Clique para revelar.</p>
      )}
      <button onClick={() => setRevealed((r) => !r)} className="btn-ghost mt-3 self-start text-xs">
        {revealed ? (<><RotateCcw size={14} /> Ocultar</>) : 'Revelar definição'}
      </button>
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
function Prova({ valor, rotulo, detalhe }) {
  return (
    <div>
      <dt className="font-mono text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
        {valor == null ? <span className="text-gray-500">—</span> : valor.toLocaleString('pt-BR')}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-gray-200">{rotulo}</dd>
      <dd className="text-xs text-gray-400">{detalhe}</dd>
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
