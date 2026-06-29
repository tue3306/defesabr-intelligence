import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Logo from '../ui/Logo'
import { useAuthStore, DEMO_CREDENTIALS, DEMO_PERSONAS } from '../../store/authStore'

// Fluxos de autenticação (DEMO): Entrar · Criar conta · Recuperar senha.
// Tudo simulado no front-end. // TODO: conectar backend real (auth/e-mail).
export default function LoginModal({ open, onClose }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const close = () => { onClose?.(); setTimeout(() => { setView('login'); setSent(false); setError('') }, 200) }

  const submitLogin = (e) => {
    e.preventDefault()
    const res = login(form.email, form.password)
    if (res.ok) { toast.success('Bem-vindo, Administrador'); close(); navigate('/painel') }
    else setError(res.error)
  }

  const submitSignup = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !/.+@.+\..+/.test(form.email) || form.password.length < 4) {
      setError('Preencha nome, um e-mail válido e uma senha (mín. 4).')
      return
    }
    setError(''); setBusy(true)
    // DEMO: cria a "conta" e entra no plano Explorar com os dados informados.
    setTimeout(() => {
      loginAsDemo('explorar')
      updateProfile({ name: form.name.trim(), email: form.email.trim() })
      setBusy(false); toast.success('Conta criada — bem-vindo!'); close(); navigate('/painel')
    }, 800)
  }

  const submitForgot = (e) => {
    e.preventDefault()
    if (!/.+@.+\..+/.test(form.email)) { setError('Informe um e-mail válido.'); return }
    setError(''); setBusy(true)
    setTimeout(() => { setBusy(false); setSent(true) }, 800) // DEMO
  }

  const demo = (key) => {
    loginAsDemo(key)
    toast.success(`Conectado como ${DEMO_PERSONAS[key].label}`)
    close(); navigate('/painel')
  }

  const titles = {
    login: 'Acesse a plataforma de inteligência',
    signup: 'Crie sua conta gratuita',
    forgot: 'Recuperar acesso',
  }

  return (
    <Modal open={open} onClose={close} maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-3 flex justify-center"><Logo size="lg" showText={false} /></div>
        <h2 className="text-xl font-bold tracking-tight">DefesaBR Intelligence</h2>
        <p className="mt-1 text-sm muted">{titles[view]}</p>
      </div>

      {/* ENTRAR */}
      {view === 'login' && (
        <>
          <form onSubmit={submitLogin} className="mt-6 space-y-3">
            <Input label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="admin@defesabr.com" autoComplete="username" />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium muted">Senha</label>
                <button type="button" onClick={() => { setView('forgot'); setError('') }} className="text-xs font-semibold text-brand-400 hover:text-brand-300">Esqueci a senha</button>
              </div>
              <input type="password" className="input" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <button type="submit" className="btn-primary w-full"><LogIn size={16} /> Entrar</button>
          </form>

          <p className="mt-3 text-center text-xs muted">
            Não tem conta?{' '}
            <button onClick={() => { setView('signup'); setError('') }} className="font-semibold text-brand-400 hover:text-brand-300">Criar conta gratuita</button>
          </p>

          <div className="my-4 flex items-center gap-3 text-xs muted">
            <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" /> entrar como (demonstração) <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" />
          </div>
          <div className="space-y-2">
            {['explorar', 'profissional', 'admin'].map((k) => (
              <button key={k} onClick={() => demo(k)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 px-3 py-2 text-left transition-colors hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{DEMO_PERSONAS[k].label}</span>
                  <span className="block truncate text-xs muted">{DEMO_PERSONAS[k].tagline}</span>
                </span>
                <LogIn size={15} className="shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
          <button onClick={close} className="mt-2 w-full text-center text-xs muted hover:text-brand-400">
            Continuar como <strong className="font-semibold">Visitante</strong> (sem login)
          </button>
          <div className="mt-4 rounded-lg bg-brand-500/10 p-3 text-xs text-brand-200">
            📌 Demo: <strong>{DEMO_CREDENTIALS.email}</strong> · senha <strong>{DEMO_CREDENTIALS.password}</strong>
          </div>
        </>
      )}

      {/* CRIAR CONTA */}
      {view === 'signup' && (
        <form onSubmit={submitSignup} className="mt-6 space-y-3">
          <Input label="Nome" value={form.name} onChange={set('name')} placeholder="Seu nome" autoComplete="name" />
          <Input label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="voce@exemplo.com" autoComplete="email" />
          <Input label="Senha" type="password" value={form.password} onChange={set('password')} placeholder="Crie uma senha" autoComplete="new-password" />
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {busy ? 'Criando…' : 'Criar conta gratuita'}
          </button>
          <button type="button" onClick={() => { setView('login'); setError('') }} className="flex w-full items-center justify-center gap-1 text-xs font-semibold muted hover:text-brand-400">
            <ArrowLeft size={13} /> Voltar para Entrar
          </button>
        </form>
      )}

      {/* RECUPERAR SENHA */}
      {view === 'forgot' && (
        sent ? (
          <div className="mt-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <MailCheck size={24} />
            </div>
            <p className="text-sm">Se houver uma conta para <strong>{form.email}</strong>, enviamos um link de redefinição.</p>
            <p className="mt-1 text-xs muted">(Demonstração — nenhum e-mail é realmente enviado.)</p>
            <button onClick={() => { setView('login'); setSent(false) }} className="btn-primary mt-5 w-full"><ArrowLeft size={15} /> Voltar para Entrar</button>
          </div>
        ) : (
          <form onSubmit={submitForgot} className="mt-6 space-y-3">
            <p className="text-sm muted">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
            <Input label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="voce@exemplo.com" autoComplete="email" />
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null} {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>
            <button type="button" onClick={() => { setView('login'); setError('') }} className="flex w-full items-center justify-center gap-1 text-xs font-semibold muted hover:text-brand-400">
              <ArrowLeft size={13} /> Voltar para Entrar
            </button>
          </form>
        )
      )}
    </Modal>
  )
}

function Input({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium muted">{label}</label>
      <input type={type} className="input" value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
    </div>
  )
}
