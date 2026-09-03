import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, Loader2, ShieldCheck, PenTool, UserCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import { useAuthStore } from '../../store/authStore'
import { API_BASE_URL } from '../../services/config'

// -----------------------------------------------------------------------------
// ENTRAR E CADASTRAR
//
// Substitui o modal anterior, que "entrava" escrevendo um objeto de usuário
// inventado no localStorage — inclusive um com `role: 'admin'`. Agora as duas
// abas falam com `/api/auth`, e o papel vem assinado pelo servidor.
//
// As contas de exemplo continuam sendo oferecidas, e a senha delas aparece na
// tela de propósito: são contas públicas de um projeto acadêmico, e a
// plataforma precisa ser percorrível sem cadastro. O que mudou é que entrar
// nelas é um POST de verdade, com senha conferida por scrypt.
//
// O CADASTRO cria conta com papel Usuário — sempre. Escolher o próprio papel
// no formulário faria de "Administrador" um campo de texto.
// -----------------------------------------------------------------------------

const ICONE_PAPEL = { admin: ShieldCheck, analyst: PenTool, user: UserCircle }
const ROTA_INICIAL = { admin: '/painel', analyst: '/painel', user: '/painel' }

export default function AuthModal({ open, onClose, abaInicial = 'entrar' }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const carregando = useAuthStore((s) => s.carregando)

  const [aba, setAba] = useState(abaInicial)
  const [contas, setContas] = useState([])
  const [erro, setErro] = useState(null)
  const [campoComErro, setCampoComErro] = useState(null)

  const [form, setForm] = useState({ name: '', email: '', password: '' })

  useEffect(() => { setAba(abaInicial) }, [abaInicial, open])
  useEffect(() => { setErro(null); setCampoComErro(null) }, [aba])

  // As contas de exemplo vêm do servidor: se alguém as remover do banco, a tela
  // deixa de oferecê-las em vez de mostrar credenciais que não funcionam.
  useEffect(() => {
    if (!open) return
    let vivo = true
    fetch(`${API_BASE_URL}/api/auth/accounts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.items) setContas(d.items) })
      .catch(() => {})
    return () => { vivo = false }
  }, [open])

  const concluir = (user) => {
    toast.success(`Bem-vindo, ${user.name.split(' ')[0]}.`)
    onClose?.()
    navigate(ROTA_INICIAL[user.role] || '/painel')
  }

  const entrarCom = async (email, password) => {
    setErro(null); setCampoComErro(null)
    const r = await login(email, password)
    if (r.ok) concluir(r.user)
    else { setErro(r.error); setCampoComErro(r.campo) }
  }

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro(null); setCampoComErro(null)

    if (aba === 'entrar') {
      return entrarCom(form.email, form.password)
    }

    const r = await register(form)
    if (r.ok) concluir(r.user)
    else { setErro(r.error); setCampoComErro(r.campo) }
  }

  const campo = (nome) => ({
    value: form[nome],
    onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.value })),
    className: `input ${campoComErro === nome ? 'border-red-500 dark:border-red-400' : ''}`,
  })

  return (
    <Modal open={open} onClose={onClose} title={aba === 'entrar' ? 'Entrar' : 'Criar conta'} maxWidth="max-w-md">
      {/* Abas */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
        {[
          { id: 'entrar', label: 'Entrar', icon: LogIn },
          { id: 'cadastrar', label: 'Criar conta', icon: UserPlus },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            aria-pressed={aba === id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              aba === id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={aoEnviar} className="space-y-3">
        {aba === 'cadastrar' && (
          <div>
            <label htmlFor="auth-nome" className="mb-1 block text-sm font-medium">Nome</label>
            <input id="auth-nome" type="text" autoComplete="name" required {...campo('name')} />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1 block text-sm font-medium">E-mail</label>
          <input id="auth-email" type="email" autoComplete="email" required {...campo('email')} />
        </div>

        <div>
          <label htmlFor="auth-senha" className="mb-1 block text-sm font-medium">Senha</label>
          <input
            id="auth-senha"
            type="password"
            autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            {...campo('password')}
          />
          {aba === 'cadastrar' && (
            <p className="mt-1 text-xs muted">Ao menos 6 caracteres.</p>
          )}
        </div>

        {erro && (
          <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {erro}
          </p>
        )}

        <button type="submit" disabled={carregando} className="btn-primary w-full justify-center">
          {carregando
            ? <><Loader2 size={16} className="animate-spin" /> Aguarde…</>
            : aba === 'entrar'
              ? <><LogIn size={16} /> Entrar</>
              : <><UserPlus size={16} /> Criar conta</>}
        </button>

        {aba === 'cadastrar' && (
          <p className="text-center text-xs muted">
            Contas criadas aqui recebem o perfil <strong>Usuário</strong>. Analista e Administrador
            são atribuídos pela governança, não escolhidos no cadastro.
          </p>
        )}
      </form>

      {/* Contas de exemplo — uma por perfil */}
      {aba === 'entrar' && contas.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-5 dark:border-white/10">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider muted">
            ou entre com uma conta de exemplo
          </p>
          <div className="space-y-2">
            {contas.map((c) => {
              const Icon = ICONE_PAPEL[c.role] || UserCircle
              return (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => entrarCom(c.email, c.senha)}
                  disabled={carregando}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-gold-500/40 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                >
                  <Icon size={18} className="shrink-0 text-brand-400 dark:text-brand-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{c.name}</span>
                    <span className="block truncate text-xs muted">{c.email} · {c.senha}</span>
                  </span>
                  <span className="chip shrink-0">{ROTULO_PAPEL[c.role] || c.role}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-[11px] muted">
            Cada perfil vê um recorte diferente da plataforma — e a diferença é verificada no
            servidor, não apenas na interface.
          </p>
        </div>
      )}
    </Modal>
  )
}

const ROTULO_PAPEL = { admin: 'Administrador', analyst: 'Analista', user: 'Usuário' }
