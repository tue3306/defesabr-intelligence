import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldAlert, Home, Search, LayoutDashboard, Newspaper, Link2,
  ShieldCheck, GraduationCap, Sparkles, ArrowRight, Activity,
} from 'lucide-react'
import { useProfile, useProfileMeta } from '../auth/useCan'

// Atalhos — quem se perdeu volta para destinos que existem e que ele alcança.
const SHORTCUTS = {
  visitor: [
    { to: '/', icon: Home, label: 'Início', hint: 'Conheça a plataforma' },
    { to: '/aprender', icon: GraduationCap, label: 'Centro Educacional', hint: 'Conceitos e glossário' },
    { to: '/mapa', icon: Sparkles, label: 'Mapa estratégico', hint: 'Cobertura por país cruzada com incidentes' },
  ],
  user: [
    { to: '/painel', icon: LayoutDashboard, label: 'Painel', hint: 'Situação do dia' },
    { to: '/clipping', icon: Newspaper, label: 'Clipping Diário', hint: 'Últimas 24 horas' },
    { to: '/correlacoes', icon: Link2, label: 'Correlações', hint: 'Matérias ligadas ao Brasil' },
  ],
  admin: [
    { to: '/admin', icon: ShieldCheck, label: 'Console de Governança', hint: 'Contas, fontes e auditoria' },
    { to: '/painel', icon: LayoutDashboard, label: 'Painel', hint: 'Estado da instalação' },
    { to: '/coleta', icon: Activity, label: 'Método & Coleta', hint: 'Filtro e execuções' },
  ],
}

export default function NotFound() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const profile = useProfile()
  const profileMeta = useProfileMeta()
  const [query, setQuery] = useState('')

  const shortcuts = SHORTCUTS[profile] || SHORTCUTS.visitor

  const search = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/busca?q=${encodeURIComponent(q)}` : '/busca')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <ShieldAlert size={32} />
      </span>
      <h1 className="mt-5 text-5xl font-extrabold tracking-tight">404</h1>
      <p className="mt-2 text-lg font-semibold">Esta rota não existe nesta zona de operações.</p>
      <p className="mt-1 max-w-md text-sm muted">
        O endereço <code className="font-mono text-gold-600 dark:text-gold-400">{pathname}</code> não
        corresponde a nenhum módulo da plataforma. Talvez o link esteja desatualizado.
      </p>

      {/* Busca no acervo — a saída mais provável de quem procurava um conteúdo */}
      <form onSubmit={search} className="mt-6 flex w-full max-w-md gap-2">
        <label htmlFor="busca-404" className="sr-only">Buscar no acervo</label>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="busca-404"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar em todos os módulos (ex.: PROSUB, fronteira)…"
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">Buscar</button>
      </form>

      {/* Atalhos do perfil ativo */}
      <div className="mt-8 w-full">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider muted">
          Para onde ir
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {shortcuts.map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="card flex flex-col items-center gap-1.5 p-4 text-center transition-colors hover:border-gold-500/40"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${profileMeta.color}22`, color: profileMeta.color }}
              >
                <Icon size={17} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-[11px] muted">{hint}</span>
            </Link>
          ))}
        </div>
      </div>

      <Link to="/" className="btn-ghost mt-6">
        <Home size={16} /> Voltar ao início <ArrowRight size={14} />
      </Link>
    </div>
  )
}
