import { useState } from 'react'
import { Shield, Cpu, Database, AlertTriangle, Github, Send, Star, GitFork, ExternalLink, Code2 } from 'lucide-react'
import toast from 'react-hot-toast'

const REPO_URL = 'https://github.com/tue3306/defesabr-intelligence'
const TECH_STACK = ['React 18', 'Vite', 'Tailwind CSS', 'Zustand', 'Recharts', 'Framer Motion']

const APIS = [
  { name: 'GDELT Project', use: 'Notícias globais em tempo real', free: true },
  { name: 'World Bank API', use: 'Gastos militares (histórico e % do PIB)', free: true },
  { name: 'AwesomeAPI', use: 'Cotações de câmbio BRL', free: true },
  { name: 'rss2json', use: 'Leitura de feeds RSS de defesa', free: true },
  { name: 'Alpha Vantage', use: 'Ações do setor de defesa', free: true },
  { name: 'Anthropic Claude', use: 'Compilação, resumo e análise por IA', free: false },
]

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const submit = (e) => {
    e.preventDefault()
    toast.success('Mensagem enviada (simulação). Obrigado pelo contato!')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Shield size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sobre o projeto</h1>
            <p className="text-sm muted">DefesaBR Intelligence — clipping e análise de Segurança e Defesa</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          O DefesaBR Intelligence é uma plataforma demonstrativa de inteligência estratégica focada no
          cenário brasileiro de Segurança e Defesa. Agrega notícias de fontes públicas, organiza o
          clipping diário e gera análises de cenários com apoio de IA (Claude, da Anthropic), oferecendo
          dados ao vivo de gastos militares, câmbio e indicadores setoriais.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card icon={Cpu} title="Metodologia">
          <p className="text-sm leading-relaxed text-gray-300">
            As notícias são coletadas de feeds RSS e APIs públicas, filtradas por relevância para Segurança
            &amp; Defesa e processadas por um modelo de linguagem que estrutura resumos, pontos-chave, impacto
            para o Brasil e nível de urgência. As análises semanais aplicam cenários (base, otimista e
            adverso) sob diferentes perspectivas.
          </p>
        </Card>
        <Card icon={Cpu} title="Modelo de IA">
          <p className="text-sm leading-relaxed text-gray-300">
            Utilizamos o <strong>Claude Sonnet</strong> (Anthropic) via API. Quando a chave não está
            configurada ou indisponível, o site opera em <strong>modo demonstração</strong> com dados
            realistas pré-carregados, sempre sinalizado por um selo amarelo.
          </p>
        </Card>
      </div>

      <Card icon={Database} title="Fontes e APIs utilizadas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 text-left text-xs uppercase muted">
                <th className="py-2 pr-4">Fonte</th>
                <th className="py-2 pr-4">Uso</th>
                <th className="py-2">Custo</th>
              </tr>
            </thead>
            <tbody>
              {APIS.map((a) => (
                <tr key={a.name} className="border-b border-gray-700/30">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  <td className="py-2 pr-4 muted">{a.use}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.free ? 'bg-military-green/20 text-emerald-300' : 'bg-brand-500/15 text-brand-300'}`}>
                      {a.free ? 'Gratuita' : 'Chave própria'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="card border-l-4 border-military-amber/60 p-5">
        <h3 className="flex items-center gap-2 font-bold text-amber-300">
          <AlertTriangle size={18} /> Disclaimer
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">
          Este site é demonstrativo. As análises são geradas por IA e <strong>não substituem análise
          especializada humana</strong>. Os dados podem conter aproximações e devem ser conferidos nas
          fontes originais antes de qualquer decisão.
        </p>
      </div>

      {/* Contato */}
      <Card icon={Send} title="Contato">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <textarea className="input sm:col-span-2" rows={3} placeholder="Mensagem" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary"><Send size={16} /> Enviar mensagem</button>
          </div>
        </form>
      </Card>

      {/* Repositório / Código aberto */}
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
                    <Code2 size={12} /> Open Source
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-brand-300">
                  github.com/tue3306/defesabr-intelligence
                </p>
                <p className="mt-2 text-sm text-gray-300">
                  Código-fonte completo, documentação de deploy e histórico de versões. Contribuições e
                  estrelas são bem-vindas.
                </p>
              </div>
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-primary shrink-0 justify-center whitespace-nowrap"
            >
              <Github size={17} /> Acessar repositório <ExternalLink size={14} />
            </a>
          </div>

          {/* Stack + ações */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            {TECH_STACK.map((t) => (
              <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300">
                {t}
              </span>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <a
                href={`${REPO_URL}/stargazers`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-amber-300"
              >
                <Star size={14} /> Estrela
              </a>
              <a
                href={`${REPO_URL}/fork`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-brand-300"
              >
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
        <Icon size={18} className="text-brand-400" /> {title}
      </h2>
      {children}
    </div>
  )
}
