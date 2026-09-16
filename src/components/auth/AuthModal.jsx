import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, Loader2, AlertCircle, ShieldPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import { useAuthStore } from '../../store/authStore'
import { request } from '../../services/client'

// -----------------------------------------------------------------------------
// ENTRAR E CADASTRAR
//
// As duas abas falam com `/api/auth`, e o papel vem assinado pelo servidor.
//
// O CADASTRO pede só usuário e senha, e cria conta com papel Usuário — sempre.
// Escolher o próprio papel no formulário faria de "Administrador" um campo de
// texto; promover alguém é ato de quem administra.
// -----------------------------------------------------------------------------

const RX_USUARIO = /^[a-z0-9._-]{3,32}$/
const SENHA_MINIMA = 6
const FORM_VAZIO = { username: '', password: '', confirmacao: '', codigo: '' }

export default function AuthModal({ open, onClose, abaInicial = 'entrar' }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const adotar = useAuthStore((s) => s.adotar)
  const carregando = useAuthStore((s) => s.carregando)

  // A instalação subiu sem administrador? Só então a adoção aparece.
  const [adocao, setAdocao] = useState(false)

  const [aba, setAba] = useState(abaInicial)
  const [erro, setErro] = useState(null)
  const [campoComErro, setCampoComErro] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)

  useEffect(() => { setAba(abaInicial) }, [abaInicial, open])
  useEffect(() => { setErro(null); setCampoComErro(null) }, [aba])
  // Fechar e abrir de novo não deixa a senha digitada no campo.
  useEffect(() => { if (!open) setForm(FORM_VAZIO) }, [open])

  useEffect(() => {
    if (!open) return undefined
    let vivo = true
    request('GET /auth/adocao')
      .then(({ data }) => { if (vivo) setAdocao(!!data?.disponivel) })
      .catch(() => { /* sem resposta: a opção simplesmente não aparece */ })
    return () => { vivo = false }
  }, [open])

  const falhar = (mensagem, campo = null) => { setErro(mensagem); setCampoComErro(campo) }

  const concluir = (user) => {
    toast.success(`Bem-vindo, ${String(user.name || user.username).split(' ')[0]}.`)
    onClose?.()
    navigate('/painel')
  }

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro(null); setCampoComErro(null)
    const username = form.username.trim().toLowerCase()

    if (aba === 'entrar') {
      const r = await login(username, form.password)
      return r.ok ? concluir(r.user) : falhar(r.error, r.campo)
    }

    if (aba === 'adotar') {
      if (!form.codigo.trim()) return falhar('Informe o código de adoção.', 'codigo')
      if (!RX_USUARIO.test(username)) {
        return falhar('Use 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.', 'username')
      }
      if (form.password.length < SENHA_MINIMA) {
        return falhar(`A senha precisa de ao menos ${SENHA_MINIMA} caracteres.`, 'password')
      }
      if (form.password !== form.confirmacao) return falhar('As senhas não conferem.', 'confirmacao')

      const r = await adotar({ codigo: form.codigo.trim(), username, password: form.password })
      return r.ok ? concluir(r.user) : falhar(r.error, r.campo)
    }

    // Conferido aqui para responder na hora; o servidor confere de novo.
    if (!RX_USUARIO.test(username)) {
      return falhar('Use 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.', 'username')
    }
    if (form.password.length < SENHA_MINIMA) {
      return falhar(`A senha precisa de ao menos ${SENHA_MINIMA} caracteres.`, 'password')
    }
    if (form.password !== form.confirmacao) {
      return falhar('As senhas não conferem.', 'confirmacao')
    }

    const r = await register({ username, password: form.password })
    return r.ok ? concluir(r.user) : falhar(r.error, r.campo)
  }

  const campo = (nome) => ({
    value: form[nome],
    onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.value })),
    'aria-invalid': campoComErro === nome || undefined,
    className: `input ${campoComErro === nome ? 'border-red-500 dark:border-red-400' : ''}`,
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={aba === 'adotar' ? 'Criar o administrador' : aba === 'entrar' ? 'Entrar' : 'Criar conta'}
      maxWidth="max-w-md"
    >
      <div className={`mb-5 grid gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5 ${adocao ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {[
          { id: 'entrar', label: 'Entrar', icon: LogIn },
          { id: 'cadastrar', label: 'Criar conta', icon: UserPlus },
          ...(adocao ? [{ id: 'adotar', label: 'Administrador', icon: ShieldPlus }] : []),
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

      <form onSubmit={aoEnviar} className="space-y-3" noValidate>
        {aba === 'adotar' && (
          <>
            <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs leading-relaxed text-brand-800 dark:text-brand-200">
              Esta instalação ainda não tem administrador. Com o código de adoção, você cria o
              primeiro — e esta opção some assim que ele existir.
            </p>
            <div>
              <label htmlFor="auth-codigo" className="mb-1 block text-sm font-medium">Código de adoção</label>
              <input
                id="auth-codigo"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={40}
                required
                {...campo('codigo')}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="auth-usuario" className="mb-1 block text-sm font-medium">Usuário</label>
          <input
            id="auth-usuario"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            required
            {...campo('username')}
          />
          {aba !== 'entrar' && (
            <p className="mt-1 text-xs muted">3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.</p>
          )}
        </div>

        <div>
          <label htmlFor="auth-senha" className="mb-1 block text-sm font-medium">Senha</label>
          <input
            id="auth-senha"
            type="password"
            autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
            maxLength={128}
            required
            {...campo('password')}
          />
          {aba !== 'entrar' && <p className="mt-1 text-xs muted">Ao menos {SENHA_MINIMA} caracteres.</p>}
        </div>

        {aba !== 'entrar' && (
          <div>
            <label htmlFor="auth-confirmacao" className="mb-1 block text-sm font-medium">Confirme a senha</label>
            <input
              id="auth-confirmacao"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
              {...campo('confirmacao')}
            />
          </div>
        )}

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
              : aba === 'adotar'
                ? <><ShieldPlus size={16} /> Criar administrador</>
                : <><UserPlus size={16} /> Criar conta</>}
        </button>

        {aba === 'cadastrar' && (
          <p className="text-center text-xs muted">
            A conta criada aqui acessa a plataforma por completo: clipping, correlações, mapa
            estratégico, incidentes, notificações e busca no acervo.
          </p>
        )}
        {aba === 'adotar' && (
          <p className="text-center text-xs muted">
            O caminho recomendado continua sendo definir `ADMIN_USERNAME` e `ADMIN_PASSWORD` no
            ambiente: com elas, o administrador volta a existir a cada subida.
          </p>
        )}
      </form>
    </Modal>
  )
}
