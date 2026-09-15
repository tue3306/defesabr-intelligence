import { Link } from 'react-router-dom'
import {
  Shield, Cpu, Database, AlertTriangle, Github, Send, Star, GitFork, ExternalLink, Code2,
  Compass, Radar, Cog, Share2, Layers, PlugZap, Bell, Lock,
} from 'lucide-react'
import { APP_VERSION } from '../services/config'

const REPO_URL = 'https://github.com/tue3306/defesabr-intelligence'
const TECH_STACK = ['React 18', 'Vite', 'Tailwind CSS', 'Zustand', 'Recharts', 'Node.js', 'Express', 'SQLite']

// As fontes que o servidor REALMENTE consulta. A lista omitia o ransomware.live,
// que alimenta duas telas inteiras, e o texto de abertura falava em "quatro
// APIs de governo" contando o World Bank, que não é governo.
const APIS = [
  { name: 'Feeds RSS', use: '50 fontes: gov.br, Agência Brasil/EBC, Senado e imprensa', custo: 'Gratuita' },
  { name: 'Câmara dos Deputados', use: 'Proposições de defesa, via Dados Abertos', custo: 'Gratuita' },
  { name: 'Banco Central — SGS', use: 'Dólar, euro, Selic, IPCA e IGP-M', custo: 'Gratuita' },
  { name: 'Comex Stat (MDIC)', use: 'Exportações da indústria de defesa por NCM', custo: 'Gratuita' },
  { name: 'World Bank Open Data', use: 'Gasto militar e PIB, série histórica', custo: 'Gratuita' },
  { name: 'ransomware.live', use: 'Organizações brasileiras divulgadas por grupos de extorsão, e os grupos', custo: 'Chave gratuita' },
]

// O ciclo clássico tem cinco etapas. A plataforma cobre três — DIREÇÃO e ANÁLISE
// dependem de julgamento humano.
const INTEL_CYCLE = [
  { title: 'Coleta', icon: Radar, module: 'Grupos contra o Brasil', to: '/atores',
    text: 'Reunir material de fontes públicas — imprensa, órgãos oficiais, dados abertos e sites de extorsão.' },
  { title: 'Processamento', icon: Cog, module: 'Clipping Diário', to: '/clipping',
    text: 'Filtrar por relevância, classificar por urgência, agrupar o mesmo fato e correlacionar com o Brasil.' },
  { title: 'Difusão', icon: Share2, module: 'Séries e indicadores', to: '/dados',
    text: 'Entregar em série, mapa e comparativo — com a origem de cada número declarada.' },
]

const ARCHITECTURE_NOTES = [
  {
    title: 'Uma fronteira única de dados',
    text: 'Toda tela lê por src/services, que fala com a API e mais nada. Se o servidor não responde, a tela mostra erro em vez de um número plausível.',
  },
  {
    title: 'Autorização no servidor',
    text: 'Cada rota protegida confere a sessão e o papel no banco a cada requisição. O menu esconder um item é conveniência; quem bloqueia é o servidor.',
  },
  {
    title: 'O que não existe',
    text: 'Recuperação de senha por e-mail, verificação em duas etapas e entrada por provedor externo.',
  },
]

// O que a instalação guarda. Os links de "Termos de Uso" e "Política de
// Privacidade" do rodapé apontavam para esta página, que não tinha nenhum dos
// dois. Em vez de um texto jurídico genérico, a lista do que de fato é gravado.
const DADOS_GUARDADOS = [
  ['Conta', 'Nome de exibição, nome de usuário, papel, situação e a senha como hash scrypt com sal — nunca a senha em texto.'],
  ['Pasta', 'As matérias que você salva, ligadas à sua conta.'],
  ['Notificações', 'Quais avisos você leu ou removeu, ligados à sua conta.'],
  ['Auditoria', 'Atos de administração — papel, suspensão, remoção de conta, fontes, coleta manual — com o nome de quem os fez.'],
  ['Neste navegador', 'A sessão, o tema, as áreas de interesse e o progresso das trilhas, no armazenamento local.'],
]

export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 dark:text-brand-300">
            <Shield size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sobre o projeto</h1>
            <p className="text-sm muted">DefesaBR Intelligence — clipping e correlação de Segurança e Defesa</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          O DefesaBR Intelligence coleta, filtra e organiza informação pública sobre Segurança e
          Defesa do Brasil. Um servidor lê 50 fontes RSS a cada 15 minutos e as APIs listadas abaixo,
          aplica um filtro de relevância auditável, correlaciona as matérias com incidentes contra
          organizações brasileiras e guarda tudo com a procedência de cada item. Nada nas telas é
          dado de exemplo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card icon={Cpu} title="Metodologia">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            O filtro de relevância decide o que é defesa por termos com fronteira de palavra,
            separando os inequívocos dos ambíguos e exigindo que os primeiros apareçam na abertura do
            texto. A regra é exibida no clipping, e cada item guarda os termos que o aprovaram. As
            correlações seguem sete regras determinísticas, cada uma com a evidência literal à vista.
          </p>
        </Card>
        <Card icon={Bell} title="Notificações">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            A cada coleta, o servidor grava um aviso para cada matéria relevante de urgência alta ou
            crítica e para cada organização brasileira com incidente crítico nas últimas 48 horas. Cada
            conta guarda o próprio estado de leitura, e o administrador recebe também os avisos de
            falha de coleta.
          </p>
        </Card>
      </div>

      <Card icon={Database} title="Fontes e APIs utilizadas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase muted dark:border-white/10">
                <th className="py-2 pr-4">Fonte</th>
                <th className="py-2 pr-4">Uso</th>
                <th className="py-2">Custo</th>
              </tr>
            </thead>
            <tbody>
              {APIS.map((a) => (
                <tr key={a.name} className="border-b border-gray-100 dark:border-white/[0.06]">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  <td className="py-2 pr-4 muted">{a.use}</td>
                  <td className="py-2">
                    <span className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold dark:bg-white/5">
                      {a.custo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CICLO DE INTELIGÊNCIA */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Compass size={18} className="text-brand-400 dark:text-brand-300" /> O ciclo de inteligência
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed muted">
          O ciclo clássico tem cinco etapas. A plataforma cobre três delas; direção e análise dependem
          de julgamento humano, que nenhuma coleta produz.
        </p>
        <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {INTEL_CYCLE.map((phase, i) => {
            const Icon = phase.icon
            return (
              <li key={phase.title} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-600 dark:text-gold-400">
                    <Icon size={17} />
                  </span>
                  <span className="font-mono text-xs font-bold muted">{i + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold tracking-tight">{phase.title}</h3>
                <p className="mt-1 text-xs leading-relaxed muted">{phase.text}</p>
                <Link to={phase.to} className="mt-2 inline-block text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  {phase.module} →
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ARQUITETURA */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Layers size={18} className="text-brand-400 dark:text-brand-300" /> Arquitetura e limites
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed muted">
          Um processo Node serve a API e a interface. O servidor coleta, filtra e guarda em SQLite; a
          interface fala com uma origem só.
        </p>
        <div className="mt-4 space-y-2">
          {ARCHITECTURE_NOTES.map((note) => (
            <div key={note.title} className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <PlugZap size={15} className="mt-0.5 shrink-0 text-brand-400 dark:text-brand-300" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{note.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed muted">{note.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-xs muted">versão {APP_VERSION}</p>
      </section>

      {/* DADOS E PRIVACIDADE */}
      <Card icon={Lock} title="Dados e privacidade">
        <p className="mb-3 text-sm leading-relaxed muted">
          O que esta instalação guarda sobre quem a usa. Não há rastreamento de terceiros, anúncio nem
          venda de dado; o servidor não envia e-mail.
        </p>
        <dl className="space-y-2">
          {DADOS_GUARDADOS.map(([termo, texto]) => (
            <div key={termo} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <dt className="text-sm font-semibold">{termo}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed muted">{texto}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed muted">
          Remover a conta apaga a pasta e os resumos gerados com a chave dela. Quem administra a instalação pode fazer
          isso pelo Console de Governança.
        </p>
      </Card>

      <div className="card border-l-4 border-military-amber/60 p-5">
        <h3 className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
          <AlertTriangle size={18} /> Aviso
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Projeto independente de código aberto. Os dados vêm de fontes públicas e <strong>não
          substituem análise especializada humana</strong>; podem conter aproximações e devem ser
          conferidos nas fontes originais antes de qualquer decisão. Menções a órgãos, programas ou
          normas não implicam vínculo, homologação ou certificação.
        </p>
      </div>

      {/* CONTATO — as issues do repositório são o canal que existe. */}
      <Card icon={Send} title="Contato">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="btn-primary justify-center">
            <Send size={16} /> Relatar um problema
          </a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="btn-ghost justify-center">
            <Github size={16} /> Ver as issues abertas
          </a>
          <p className="text-xs leading-relaxed muted sm:col-span-2">
            As issues do repositório são públicas e ficam registradas. Não há formulário de contato:
            a plataforma não envia e-mail, e um formulário que não chega a ninguém seria pior que nenhum.
          </p>
        </div>
      </Card>

      {/* REPOSITÓRIO */}
      <div className="card overflow-hidden">
        <div className="on-dark bg-gradient-to-br from-military-darker via-military-card to-brand-900/30 p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <Github size={26} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">Repositório do projeto</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    <Code2 size={12} /> Código aberto
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-brand-300">github.com/tue3306/defesabr-intelligence</p>
                <p className="mt-2 text-sm text-gray-300">
                  Código-fonte completo, documentação de instalação e deploy e histórico de versões.
                </p>
              </div>
            </div>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn-primary shrink-0 justify-center whitespace-nowrap">
              <Github size={17} /> Acessar repositório <ExternalLink size={14} />
            </a>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            {TECH_STACK.map((t) => (
              <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300">{t}</span>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <a href={`${REPO_URL}/stargazers`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-amber-300">
                <Star size={14} /> Estrela
              </a>
              <a href={`${REPO_URL}/fork`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-brand-300">
                <GitFork size={14} /> Fork
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ icon: Icon, title, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
        <Icon size={18} className="text-brand-400 dark:text-brand-300" /> {title}
      </h2>
      {children}
    </div>
  )
}
