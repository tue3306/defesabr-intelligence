import { useState, useId, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, ArrowLeft, Loader2, MailCheck, AlertCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Logo from '../ui/Logo'
import { useAuthStore, DEMO_PERSONAS, LOGIN_PERSONAS } from '../../store/authStore'

// -----------------------------------------------------------------------------
// FLUXOS DE AUTENTICAÇÃO (DEMONSTRAÇÃO): Entrar · Criar conta · Recuperar senha.
//
// A validação real vive no `authStore` (login/register), que é o mesmo ponto
// que um backend substituiria — o formulário não conhece a regra, só a exibe.
// Nenhuma credencial é publicada na interface: o acesso de demonstração é
// feito pelos botões de perfil.
// -----------------------------------------------------------------------------

// Para onde cada perfil é levado após entrar — a "casa" daquele perfil.
const PERSONA_HOME = { usuario: '/painel', analista: '/painel', admin: '/admin' }

/** Força da senha (0–3) — orienta sem bloquear. */
function passwordStrength(pwd = '') {
  let score = 0
  if (pwd.length >= 6) score += 1
  if (pwd.length >= 10) score += 1
  if (/[^a-zA-Z0-9]/.test(pwd) || (/[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd))) score += 1
  return Math.min(score, 3)
}

const STRENGTH_META = [
  { label: 'Muito curta', color: '#c0392b' },
  { label: 'Fraca', color: '#d4841a' },
  { label: 'Razoável', color: '#caa733' },
  { label: 'Boa', color: '#2e7d46' },
]

export default function LoginModal({ open, onClose }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo)

  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const firstFieldRef = useRef(null)

  // O foco começa no primeiro campo da visão ativa (acessibilidade por teclado).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [open, view])

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError('') }

  const close = () => {
    onClose?.()
    setTimeout(() => { setView('login'); setSent(false); setError(''); setBusy(false) }, 200)
  }

  const goTo = (persona) => {
    close()
    navigate(PERSONA_HOME[persona] || '/painel')
  }

  const submitLogin = (e) => {
    e.preventDefault()
    setBusy(true)
    const res = login(form.email, form.password)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    toast.success(res.persona === 'admin' ? 'Bem-vindo, Administrador' : 'Bem-vindo à plataforma')
    goTo(res.persona)
  }

  const submitSignup = (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    // Pequena espera para o estado de carregamento existir como numa chamada real.
    setTimeout(() => {
      const res = register({ name: form.name, email: form.email, password: form.password })
      setBusy(false)
      if (!res.ok) { setError(res.error); return }
      toast.success('Conta criada — bem-vindo!')
      goTo(res.persona)
    }, 600)
  }

  const submitForgot = (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    setError('')
    setBusy(true)
    setTimeout(() => { setBusy(false); setSent(true) }, 700)
  }

  const enterAsDemo = (key) => {
    const persona = DEMO_PERSONAS[key]
    loginAsDemo(key)
    toast.success(`Conectado como ${persona.roleLabel}`)
    goTo(key)
  }

  const titles = {
    login: 'Acesse a plataforma de inteligência',
    signup: 'Crie sua conta gratuita',
    forgot: 'Recuperar acesso',
  }

  const strength = passwordStrength(form.password)

  return (
    <Modal open={open} onClose={close} maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-3 flex justify-center"><Logo size="lg" showText={false} /></div>
        <h2 className="text-xl font-bold tracking-tight">DefesaBR Intelligence</h2>
        <p className="mt-1 text-sm muted">{titles[view]}</p>
      </div>

      {/* ───────────── ENTRAR ───────────── */}
      {view === 'login' && (
        <>
          <form onSubmit={submitLogin} className="mt-6 space-y-3">
            <Field
              inputRef={firstFieldRef}
              label="E-mail"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="voce@exemplo.com"
              autoComplete="username"
            />
            <Field
              label="Senha"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="current-password"
              action={
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError('') }}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400"
                >
                  Esqueci a senha
                </button>
              }
            />
            <ErrorLine message={error} />
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Entrar
            </button>
          </form>

          <p className="mt-3 text-center text-xs muted">
            Não tem conta?{' '}
            <button
              onClick={() => { setView('signup'); setError('') }}
              className="font-semibold text-brand-500 hover:text-brand-400 dark:text-brand-400"
            >
              Criar conta gratuita
            </button>
          </p>

          <div className="my-4 flex items-center gap-3 text-xs muted">
            <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" />
            entrar como (demonstração)
            <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600/40" />
          </div>

          {/* Os três perfis autenticáveis — o Visitante é justamente não entrar. */}
          <div className="space-y-2">
            {LOGIN_PERSONAS.map((key) => {
              const persona = DEMO_PERSONAS[key]
              return (
                <button
                  key={key}
                  onClick={() => enterAsDemo(key)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 px-3 py-2 text-left transition-colors hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-sm font-semibold">{persona.roleLabel}</span>
                      <span className="text-[11px] muted">· {persona.name}</span>
                    </span>
                    <span className="block truncate text-xs muted">{persona.tagline}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-gray-400" />
                </button>
              )
            })}
          </div>

          <button onClick={close} className="mt-3 w-full text-center text-xs muted hover:text-brand-400 dark:text-brand-300">
            Continuar como <strong className="font-semibold">Visitante</strong> (sem login)
          </button>

          <p className="mt-4 rounded-lg bg-brand-500/10 p-3 text-center text-xs text-gray-600 dark:text-gray-300">
            Ambiente de demonstração — os dados são ilustrativos e nenhuma informação real é enviada.
          </p>
        </>
      )}

      {/* ───────────── CRIAR CONTA ───────────── */}
      {view === 'signup' && (
        <form onSubmit={submitSignup} className="mt-6 space-y-3">
          <Field inputRef={firstFieldRef} label="Nome" value={form.name} onChange={set('name')} placeholder="Seu nome" autoComplete="name" />
          <Field label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="voce@exemplo.com" autoComplete="email" />
          <div>
            <Field
              label="Senha"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
            />
            {form.password && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex flex-1 gap-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background: i < strength ? STRENGTH_META[strength].color : 'rgba(148,163,184,0.3)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: STRENGTH_META[strength].color }}>
                  {STRENGTH_META[strength].label}
                </span>
              </div>
            )}
          </div>
          <Field
            label="Confirmar senha"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
          <ErrorLine message={error} />
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {busy ? 'Criando…' : 'Criar conta gratuita'}
          </button>
          <p className="text-center text-[11px] muted">
            A conta é criada no plano Explorar. Nenhum dado sai deste navegador.
          </p>
          <BackToLogin onClick={() => { setView('login'); setError('') }} />
        </form>
      )}

      {/* ───────────── RECUPERAR SENHA ───────────── */}
      {view === 'forgot' && (
        sent ? (
          <div className="mt-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <MailCheck size={24} />
            </div>
            <p className="text-sm">
              Se houver uma conta para <strong>{form.email}</strong>, enviamos um link de redefinição.
            </p>
            <p className="mt-1 text-xs muted">(Demonstração — nenhum e-mail é realmente enviado.)</p>
            <button onClick={() => { setView('login'); setSent(false) }} className="btn-primary mt-5 w-full justify-center">
              <ArrowLeft size={15} /> Voltar para Entrar
            </button>
          </div>
        ) : (
          <form onSubmit={submitForgot} className="mt-6 space-y-3">
            <p className="text-sm muted">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
            <Field inputRef={firstFieldRef} label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="voce@exemplo.com" autoComplete="email" />
            <ErrorLine message={error} />
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>
            <BackToLogin onClick={() => { setView('login'); setError('') }} />
          </form>
        )
      )}
    </Modal>
  )
}

// ── Campo com rótulo REALMENTE associado (id/htmlFor) ────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, action, inputRef }) {
  const id = useId()
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium muted">{label}</label>
        {action}
      </div>
      <input
        id={id}
        ref={inputRef}
        type={type}
        className="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  )
}

function ErrorLine({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-red-800 dark:text-red-400">
      <AlertCircle size={15} className="mt-0.5 shrink-0" /> {message}
    </p>
  )
}

function BackToLogin({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 text-xs font-semibold muted hover:text-brand-400 dark:text-brand-300"
    >
      <ArrowLeft size={13} /> Voltar para Entrar
    </button>
  )
}
