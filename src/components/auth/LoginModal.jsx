import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Logo from '../ui/Logo'
import { useAuthStore, DEMO_CREDENTIALS, PROFILES } from '../../store/authStore'

export default function LoginModal({ open, onClose }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const res = login(email, password)
    if (res.ok) {
      toast.success('Bem-vindo, Administrador')
      onClose?.()
      navigate('/painel') // [ALTERADO] após login, vai ao painel
    } else {
      setError(res.error)
    }
  }

  const demo = (role) => {
    loginAsDemo(role)
    toast.success(`Conectado como ${PROFILES[role].label}`)
    onClose?.()
    navigate('/painel') // [ALTERADO] após login, vai ao painel
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-3 flex justify-center">
          <Logo size="lg" showText={false} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">DefesaBR Intelligence</h2>
        <p className="mt-1 text-sm muted">Acesse a plataforma de inteligência</p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium muted">E-mail</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@defesabr.com"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium muted">Senha</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full">
          <LogIn size={16} /> Entrar
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs muted">
        <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" />
        entrar como (demonstração)
        <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" />
      </div>

      {/* [ALTERADO] Papéis de acesso com função explícita — ordenados por nível */}
      <div className="space-y-2">
        {['gratuito', 'analista', 'admin'].map((r) => (
          <button
            key={r}
            onClick={() => demo(r)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 px-3 py-2 text-left transition-colors hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{PROFILES[r].label}</span>
              <span className="block truncate text-xs muted">{PROFILES[r].tagline}</span>
            </span>
            <LogIn size={15} className="shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
      {/* Visitante = continuar sem login (somente área pública) */}
      <button onClick={() => onClose?.()} className="mt-2 w-full text-center text-xs muted hover:text-brand-400">
        Continuar como <strong className="font-semibold">Visitante</strong> (sem login)
      </button>

      <div className="mt-4 rounded-lg bg-brand-500/10 p-3 text-xs text-brand-200">
        📌 Demo: <strong>{DEMO_CREDENTIALS.email}</strong> · senha <strong>{DEMO_CREDENTIALS.password}</strong>
      </div>
    </Modal>
  )
}
