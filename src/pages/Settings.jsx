import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Rss, KeyRound, Bell, SlidersHorizontal, UserCog, Trash2, Plus, Circle, Eye, EyeOff,
  Palette, Star, Gauge, Stethoscope, Users, Sun, Moon, LogIn, ShieldCheck, CreditCard, BarChart3,
  Check, Lock, Server, Database, PlugZap, ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../store/subscriptionStore'
import { useCan, useProfileMeta } from '../auth/useCan'
import { useTheme } from '../hooks/useTheme'
import { FOCUS_AREAS, CATEGORIES } from '../data/mockData'
import { PLANS, PLAN_LABEL } from '../data/plansData'
import { iaConfigurada } from '../services/ia'
import { request } from '../services/client'
import { useFontesReais } from '../hooks/useFontesReais'
import { API_BASE_URL, APP_VERSION } from '../services/config'
import { listEndpoints } from '../services'
import { categoryColor } from '../utils/textUtils'

function Section({ icon: Icon, title, badge, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400 dark:text-brand-300" /> {title}
        {badge && (
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-300">{badge}</span>
        )}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const s = useSettingsStore()
  const { user, isAuthenticated } = useAuthStore()
  const plan = useSubscriptionStore((st) => st.plan)
  const can = useCan()
  const profileMeta = useProfileMeta()

  // Autorização declarativa — nada de checar papel/plano direto aqui (§10).
  const canProduce = can('tension.edit')
  const isAdmin = can('admin.settings')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm muted">
            Operação e sistema. Suas opções pessoais ficam em{' '}
            <Link to="/conta" className="font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">Minha conta</Link>.
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-300">
              <ShieldCheck size={13} /> {profileMeta.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-gold-500/15 px-3 py-1 text-xs font-bold text-gold-600 dark:text-gold-400">
              {PLAN_LABEL[plan] || plan}
            </span>
          </div>
        )}
      </div>

      {/* APARÊNCIA — todos */}
      <AppearanceSection />

      {/* VISITANTE não logado: convite */}
      {!isAuthenticated && (
        <Section icon={LogIn} title="Acesse para personalizar">
          <p className="text-sm muted">
            Entre na plataforma para configurar áreas de interesse, notificações e mais.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/planos" className="btn-primary">Ver planos</Link>
            <Link to="/" className="btn-ghost">Voltar ao início</Link>
          </div>
        </Section>
      )}

      {/* PLANO ATUAL — logados (Usuário gerencia aqui) */}
      {isAuthenticated && <PlanSection />}

      {/* ÁREAS DE INTERESSE — logados */}
      {isAuthenticated && <InterestAreasSection />}

      {/* NOTIFICAÇÕES — logados */}
      {isAuthenticated && <NotificationsSection enabled={s.notificationsEnabled} onToggle={s.toggleNotifications} />}

      {/* PRODUÇÃO (plano Profissional+): análise, tensão, fontes */}
      {canProduce && (
        <>
          <Section icon={SlidersHorizontal} title="Preferências de análise" badge="Produção">
            <div className="space-y-5">
              <div>
                <label className="mb-1 flex items-center justify-between text-sm font-medium">
                  Notícias por clipping <span className="font-mono text-brand-400 dark:text-brand-300">{s.newsPerClipping}</span>
                </label>
                <input type="range" min={3} max={10} value={s.newsPerClipping}
                  onChange={(e) => s.setNewsPerClipping(e.target.value)} className="w-full accent-brand-500"
                  aria-label="Notícias por clipping" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Foco padrão da análise</label>
                <select value={s.focusArea} onChange={(e) => s.setFocusArea(e.target.value)} className="input max-w-xs" aria-label="Foco padrão da análise">
                  {FOCUS_AREAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </Section>



          <Section icon={Rss} title="Fontes monitoradas" badge="Produção">
            <SourcesEditor />
          </Section>
        </>
      )}

      {/* ADMIN: API key, usuários, diagnóstico */}
      {isAdmin && (
        <>
          <Section icon={KeyRound} title="Chave da API (Anthropic)" badge="Admin">
            <ApiKeyEditor s={s} />
          </Section>

          <Section icon={Users} title="Usuários e governança" badge="Admin">
            <p className="text-sm muted">
              A gestão de usuários, perfis, fontes, integrações e auditoria fica no{' '}
              <Link to="/admin" className="font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">
                Console de governança
              </Link>{' '}
              — fonte única, para não duplicar informação.
            </p>
          </Section>

          <Section icon={BarChart3} title="Números da plataforma" badge="Admin">
            <Analytics />
          </Section>

          <Section icon={Stethoscope} title="Diagnóstico do sistema" badge="Admin">
            <Diagnostics />
          </Section>

          <Section icon={Server} title="Camada de dados" badge="Admin">
            <DataLayerSection />
          </Section>
        </>
      )}

      {/* Sem ferramentas de operação/sistema para este acesso */}
      {isAuthenticated && !canProduce && !isAdmin && (
        <Section icon={Lock} title="Sem ferramentas de operação neste plano">
          <p className="text-sm muted">
            As ferramentas de produção (análise, tensão, fontes) fazem parte do plano{' '}
            <strong>Profissional</strong>. Suas opções pessoais ficam em{' '}
            <Link to="/conta" className="font-semibold text-brand-400 dark:text-brand-300 hover:text-brand-300">Minha conta</Link>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/planos" className="btn-primary">Ver planos</Link>
            <Link to="/conta" className="btn-ghost">Ir para Minha conta</Link>
          </div>
        </Section>
      )}
    </div>
  )
}

function AppearanceSection() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Section icon={Palette} title="Aparência e idioma">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Tema</span>
          <button onClick={toggleTheme} className="btn-ghost text-sm">
            {isDark ? <><Sun size={15} /> Claro</> : <><Moon size={15} /> Escuro</>}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm">Idioma</span>
            <span className="block text-xs muted">
              A plataforma é publicada em português do Brasil.
            </span>
          </span>
          <span className="chip shrink-0">Português (BR)</span>
        </div>
      </div>
    </Section>
  )
}

// Plano atual (resumo). Gestão completa fica em Minha conta › Assinatura.
function PlanSection() {
  const plan = useSubscriptionStore((st) => st.plan)
  const current = PLANS.find((p) => p.id === plan) || PLANS[0]

  return (
    <Section icon={CreditCard} title="Plano atual">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{current.name} <span className="text-sm font-normal muted">· {current.price} {current.period}</span></p>
          <p className="mt-0.5 text-sm muted">{current.tagline}</p>
        </div>
        <Link to="/conta" className="btn-ghost shrink-0">Gerenciar assinatura</Link>
      </div>
    </Section>
  )
}

// Aqui havia um bloco "Números da plataforma" com quatro numeros escritos a mao:
// 1.284 usuarios ativos (+12%), 48,7 mil visualizacoes (+8%), 326 assinantes
// pagos (+5%) e 4,2% de conversao. Nenhum vinha de lugar nenhum — nao existe
// analitica de uso nesta plataforma, e nao existe cobranca: "326 assinantes
// pagos" era uma invencao sobre um sistema de pagamento que nao foi escrito.
//
// Eram exibidos ao ADMINISTRADOR, que e exatamente quem tomaria decisao com
// base neles. Numero de negocio inventado num painel de administracao e a
// forma mais direta de transformar um diagnostico em ficcao.
//
// O que entra no lugar e o que o servidor sabe contar: contas cadastradas por
// papel e o tamanho do acervo. Sao numeros pequenos e verdadeiros.
function Analytics() {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    request('GET /admin/overview')
      .then(({ data }) => { if (vivo) setD(data) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [])

  if (erro) return <p className="text-sm muted">O servidor nao respondeu — sem numeros a mostrar.</p>
  if (!d) return <p className="text-sm muted">Consultando o servidor…</p>

  const m = d.metrics || {}
  const cartoes = [
    { label: 'Artigos no acervo', value: m.artigos ?? '—', nota: `${m.artigosRelevantes ?? 0} aprovados pelo filtro` },
    { label: 'Fontes cadastradas', value: m.fontes ?? '—', nota: m.fontesComErro ? `${m.fontesComErro} com erro na última coleta` : 'todas responderam' },
    { label: 'Proposições acompanhadas', value: m.proposicoes ?? '—', nota: 'Câmara, dados abertos' },
    { label: 'Pontos de série', value: m.indicadores ?? '—', nota: 'BCB, World Bank e Comex Stat' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cartoes.map((a) => (
        <div key={a.label} className="rounded-lg bg-white/5 p-3">
          <p className="text-xs muted">{a.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{a.value}</p>
          <p className="text-[11px] muted">{a.nota}</p>
        </div>
      ))}
    </div>
  )
}

function InterestAreasSection() {
  const interestAreas = useSettingsStore((st) => st.interestAreas)
  const toggleInterestArea = useSettingsStore((st) => st.toggleInterestArea)
  return (
    <Section icon={Star} title="Áreas de maior interesse">
      <p className="mb-3 text-sm muted">Escolha os temas que mais te interessam para destacar no seu conteúdo.</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const on = interestAreas.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleInterestArea(cat)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                on ? 'border-transparent text-white' : 'border-gray-600/50 text-gray-400 hover:text-gray-200'
              }`}
              style={on ? { background: categoryColor(cat) } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : categoryColor(cat) }} />
              {cat}
            </button>
          )
        })}
      </div>
      {interestAreas.length > 0 && (
        <p className="mt-3 text-xs muted">{interestAreas.length} área(s) selecionada(s).</p>
      )}
    </Section>
  )
}

function NotificationsSection({ enabled, onToggle }) {
  return (
    <Section icon={Bell} title="Notificações">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm">Receber alertas de notícias críticas</span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-600'}`}
          role="switch"
          aria-label="Ativar ou desativar notificações"
          aria-checked={enabled}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </label>
    </Section>
  )
}

function SourcesEditor() {
  const fontes = useFontesReais()

  // Esta tela mostrava 15 fontes escritas à mão, com `status: 'online'`
  // literal — entre elas Marinha, FAB e Exército, que o próprio código
  // documenta como HTTP 403 e 404 e que por isso NEM ESTÃO cadastradas no
  // servidor. E vinha com ativar, desativar, adicionar e remover: quatro
  // controles que não controlavam nada, porque a coleta roda no servidor e
  // nunca leu essa lista.
  //
  // Agora são as fontes de verdade, com o estado medido na última coleta. É
  // leitura, e a tela diz por quê: quem administra a coleta é o Administrador,
  // no console de governança.
  const porCategoria = fontes.itens.reduce((acc, f) => {
    (acc[f.category || 'Outras'] ||= []).push(f)
    return acc
  }, {})

  return (
    <>
      <p className="mb-3 text-xs muted">
        As fontes que alimentam o acervo, com o estado apurado na última coleta. Quem busca é o
        <strong> servidor</strong>, a cada 30 minutos — o navegador não lê feed direto, porque a
        maioria dos sites não autoriza leitura de outro domínio (CORS).
        {' '}Cadastrar ou desativar fonte é ato de administração, em <em>Console de Governança</em>.
      </p>

      {fontes.carregando && <p className="text-sm muted">Consultando o servidor…</p>}

      {!fontes.carregando && !fontes.itens.length && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Não foi possível ler a lista de fontes — a API não respondeu.
        </p>
      )}

      {fontes.total != null && (
        <p className="mb-3 text-sm">
          <strong className="font-mono">{fontes.ok}</strong> de{' '}
          <strong className="font-mono">{fontes.total}</strong> responderam na última execução.
        </p>
      )}

      <div className="space-y-4">
        {Object.entries(porCategoria).map(([cat, lista]) => (
          <div key={cat}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider muted">
              {cat} · {lista.length}
            </p>
            <div className="space-y-1.5">
              {lista.map((f) => (
                <div key={f.name} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Circle
                      size={9}
                      className={f.status === 'ok'
                        ? 'fill-emerald-400 text-emerald-700 dark:text-emerald-400'
                        : f.status === 'nunca'
                          ? 'fill-gray-400 text-gray-500'
                          : 'fill-red-400 text-red-700 dark:text-red-400'}
                    />
                    <span className="truncate font-medium">{f.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs muted">
                    {f.status === 'ok' ? `${f.items ?? 0} itens` : f.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ApiKeyEditor({ s }) {
  const [showKey, setShowKey] = useState(false)
  return (
    <>
      <p className="mb-3 text-sm muted">
        Opcional. Sobrescreve a variável de ambiente apenas neste navegador.{' '}
        {iaConfigurada()
          ? <span className="font-semibold text-emerald-800 dark:text-emerald-400">● IA configurada</span>
          : <span className="font-semibold text-yellow-600 dark:text-yellow-400">● sem chave — nenhuma análise por IA é gerada</span>}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={showKey ? 'text' : 'password'} value={s.apiKeyOverride}
            onChange={(e) => s.setApiKeyOverride(e.target.value)} placeholder="sk-ant-..." className="input pr-10 font-mono"
            aria-label="Chave da API da Anthropic" />
          <button type="button" onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="Mostrar/ocultar chave">
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button onClick={() => { s.setApiKeyOverride(''); toast.success('Chave removida') }} className="btn-ghost shrink-0">Limpar</button>
      </div>
      <div className="mt-3 rounded-lg border border-military-red/40 bg-military-red/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-red-700 dark:text-red-300">
          <ShieldAlert size={15} /> Isto não é seguro em produção
        </p>
        <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          <li>
            A chave fica em <strong>texto puro no armazenamento deste navegador</strong> e é enviada
            diretamente da máquina de quem usa — qualquer script na página, extensão ou pessoa com
            acesso ao dispositivo consegue lê-la.
          </li>
          <li>
            Toda chamada consome a <strong>sua cota</strong>, sem limite por usuário e sem trilha de
            quem gastou o quê.
          </li>
          <li>
            Em produção, a chave vive <strong>apenas no servidor</strong>: o front chama um endpoint
            próprio, que autentica a pessoa e repassa a requisição.
          </li>
        </ul>
        <p className="mt-2 text-[11px] muted">
          Use este campo apenas com uma chave descartável, de teste, e remova-a ao terminar.
        </p>
      </div>
    </>
  )
}

function Diagnostics() {
  // Media as fontes REAIS do servidor. Antes contava a lista escrita a mao,
  // cujo `status` era literal — o indicador dizia "8/8 habilitadas" com o
  // servidor inteiro fora do ar.
  const fontes = useFontesReais()
  const online = fontes.ok ?? 0
  const total = fontes.total ?? 0
  const ai = iaConfigurada()
  // Este bloco marcava AwesomeAPI e World Bank como `ok: true` fixo — dois
  // "ok" que nunca mudavam, mesmo com o servidor fora do ar —, dizia "modo
  // demo" para a IA (o modo não existe mais) e anunciava a versão v1.0.0, que
  // não é a do projeto. O estado das integrações é medido no console de
  // governança, a partir das execuções reais; aqui fica só o que esta tela
  // sabe de fato.
  const items = [
    { name: 'Síntese por IA', ok: ai, note: ai ? 'configurada' : 'não conectada' },
    { name: 'Fontes de coleta', ok: total > 0 && online === total, note: total ? `${online}/${total} responderam` : 'servidor não respondeu' },
    { name: 'Versão da interface', ok: true, note: APP_VERSION },
  ]
  return (
    <ul className="space-y-2 text-sm">
      {items.map((a) => (
        <li key={a.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-gray-300">{a.name}</span>
          <span className="flex items-center gap-1.5 text-xs muted">
            <span className={`h-2 w-2 rounded-full ${a.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} /> {a.note}
          </span>
        </li>
      ))}
    </ul>
  )
}

// [REMOVIDO] DemoProfileSection — a troca de persona agora vive no menu do
// usuário (Navbar), evitando duplicação. "Menos, porém melhor."

// -----------------------------------------------------------------------------
// CAMADA DE DADOS — onde a troca por um backend real acontece.
// Nenhum componente da interface conhece a origem do dado: tudo passa por
// src/services. Esta seção existe para tornar isso auditável pela governança.
// -----------------------------------------------------------------------------
function DataLayerSection() {
  const endpoints = listEndpoints()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Origem</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            API — origem única
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Endereço da API</p>
          <p className="mt-0.5 truncate font-mono text-xs">{API_BASE_URL || 'não configurado'}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider muted">Versão</p>
          <p className="mt-0.5 font-mono text-sm font-bold">{APP_VERSION}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <PlugZap size={15} className="text-brand-400 dark:text-brand-300" /> Como a interface obtém dados
        </p>
        <p className="mt-1 text-xs leading-relaxed muted">
          Toda tela lê por <code className="font-mono text-gold-600 dark:text-gold-400">src/services</code>,
          que fala com uma origem só: a API. Não há resolvedor local nem modo alternativo — se o
          servidor não responde, a tela mostra erro em vez de um número plausível.
          O endereço vem de <code className="font-mono text-gold-600 dark:text-gold-400">VITE_API_BASE_URL</code>;
          vazio significa mesma origem do site.
        </p>
      </div>

      <details className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
          <Database size={15} className="text-brand-400 dark:text-brand-300" />
          Endpoints registrados
          <span className="chip ml-1">{endpoints.length}</span>
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {endpoints.map((e) => (
            <li key={e} className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] muted">{e}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
