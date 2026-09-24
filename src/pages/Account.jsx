import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { User, Shield, Check, LogOut, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ROLE_LABELS } from '../auth/permissions'

// -----------------------------------------------------------------------------
// MINHA CONTA
//
// Tudo que se altera aqui é alterado no servidor: o nome de exibição
// (`PATCH /api/auth/me`) e a senha (`PUT /api/auth/senha`). Vale igual para
// usuário e administrador.
// -----------------------------------------------------------------------------

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
]

const SENHA_MINIMA = 6

export default function Account() {
  const [tab, setTab] = useState('perfil')
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300">
          <User size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
          <p className="font-mono text-sm muted">{user?.username}</p>
        </div>
      </div>

      {/* Sem `overflow-x-auto`: com duas abas não há o que rolar, e o `-mb-px`
        * das abas fazia o navegador desenhar uma barra de rolagem minúscula
        * ao lado delas. */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? 'border-gold-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <ProfileTab />}
      {tab === 'seguranca' && <SecurityTab />}
    </div>
  )
}

function Card({ title, desc, children }) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {desc && <p className="mt-0.5 text-sm muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ───────────────────────── PERFIL ─────────────────────────
function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const atualizarNome = useAuthStore((s) => s.atualizarNome)
  const [name, setName] = useState(user?.name || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => { setName(user?.name || '') }, [user?.name])

  const normalizado = name.trim().replace(/\s+/g, ' ')
  const mudou = normalizado !== (user?.name || '')

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    const r = await atualizarNome(normalizado)
    setSalvando(false)
    if (r.ok) toast.success('Nome atualizado.')
    else setErro(r.error)
  }

  return (
    <div className="space-y-6">
      <Card title="Identidade">
        <form onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="conta-nome" className="mb-1 block text-xs font-medium muted">Nome de exibição</label>
            <input
              id="conta-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="input"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium muted">Nome de usuário</span>
            <p className="input flex items-center truncate bg-gray-50 font-mono text-sm dark:bg-white/[0.03]">{user?.username || '—'}</p>
            <p className="mt-1 text-[11px] leading-relaxed muted">É o identificador de entrada e não muda.</p>
          </div>
          {erro && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-2">{erro}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={salvando || !mudou || normalizado.length < 2} className="btn-primary disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar nome
            </button>
          </div>
        </form>
      </Card>

      <Card title="Acesso">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Info termo="Papel" valor={ROLE_LABELS[user?.role] || '—'} />
          <Info termo="Conta criada em" valor={user?.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '—'} />
          <Info termo="Última entrada" valor={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : '—'} />
        </dl>
      </Card>
    </div>
  )
}

// ──────────────────────── SEGURANÇA ───────────────────────
function SecurityTab() {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  // O payload do token é legível e não guarda segredo — id, nome, papel e
  // prazo. O que impede forjá-lo é a assinatura, conferida no servidor.
  let expiraEm = null
  try {
    const corpo = token ? JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) : null
    expiraEm = corpo?.exp ? new Date(corpo.exp) : null
  } catch { /* token ilegível: a tela mostra ausência */ }

  return (
    <div className="space-y-6">
      <TrocarSenha />

      <Card title="Sessão">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info termo="Esta sessão expira em" valor={expiraEm ? expiraEm.toLocaleString('pt-BR') : '—'} />
        </dl>
        <div className="mt-4">
          <button onClick={() => { logout(); navigate('/') }} className="btn-ghost text-sm">
            <LogOut size={15} /> Sair da conta
          </button>
        </div>
      </Card>

      <ExcluirConta />
    </div>
  )
}

// -----------------------------------------------------------------------------
// EXCLUIR A PRÓPRIA CONTA
//
// A política de privacidade listava a eliminação dos dados entre os direitos
// da LGPD e mandava "falar com quem opera a instalação". O direito dependia de
// outra pessoa para ser exercido. Agora ele está aqui, com duas travas contra
// o clique acidental: a senha e a confirmação digitada.
// -----------------------------------------------------------------------------
function ExcluirConta() {
  const user = useAuthStore((s) => s.user)
  const excluirConta = useAuthStore((s) => s.excluirConta)
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const FRASE = 'EXCLUIR'

  if (user?.role === 'admin') {
    return (
      <Card title="Excluir conta" desc="Conta de administrador é removida pelo Console de Governança, por outro administrador — assim a plataforma nunca fica sem quem a opere." />
    )
  }

  const enviar = async (e) => {
    e.preventDefault()
    setErro(null)
    if (confirmacao.trim().toUpperCase() !== FRASE) return setErro(`Digite ${FRASE} para confirmar.`)
    setEnviando(true)
    const r = await excluirConta(senha)
    setEnviando(false)
    if (r.ok) {
      toast.success('Conta excluída. Sua pasta e seus avisos foram apagados do servidor.')
      navigate('/')
    } else {
      setErro(r.error)
    }
  }

  return (
    <Card
      title="Excluir conta"
      desc="Apaga para sempre a sua conta, a sua pasta de matérias salvas e o estado das suas notificações. Não dá para desfazer."
    >
      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className="btn-ghost border-red-500/40 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-300">
          <Trash2 size={15} aria-hidden="true" /> Quero excluir minha conta
        </button>
      ) : (
        <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="excluir-senha" className="mb-1 block text-xs font-medium muted">Sua senha</label>
            <input
              id="excluir-senha"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="excluir-confirma" className="mb-1 block text-xs font-medium muted">
              Digite <strong>{FRASE}</strong> para confirmar
            </label>
            <input
              id="excluir-confirma"
              type="text"
              autoComplete="off"
              maxLength={20}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="input"
            />
          </div>
          <p className="text-xs muted sm:col-span-2">
            As preferências deste navegador (tema, tamanho do texto, interesses) não são dados da conta e
            ficam aqui; você pode apagá-las em{' '}
            <Link to="/privacidade#navegador" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Privacidade</Link>.
          </p>
          {erro && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-2">{erro}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando || !senha || !confirmacao}
              className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Excluir definitivamente
            </button>
            <button type="button" onClick={() => { setAberto(false); setSenha(''); setConfirmacao(''); setErro(null) }} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}

function TrocarSenha() {
  const trocarSenha = useAuthStore((s) => s.trocarSenha)
  const [form, setForm] = useState({ atual: '', nova: '', confirma: '' })
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro(null)
    if (form.nova.length < SENHA_MINIMA) return setErro(`A nova senha precisa de ao menos ${SENHA_MINIMA} caracteres.`)
    if (form.nova !== form.confirma) return setErro('A confirmação não confere com a nova senha.')
    setEnviando(true)
    const r = await trocarSenha(form.atual, form.nova)
    setEnviando(false)
    if (r.ok) {
      setForm({ atual: '', nova: '', confirma: '' })
      toast.success('Senha trocada. As sessões abertas em outros navegadores foram encerradas.')
    } else {
      setErro(r.error)
    }
  }

  const campo = (nome, rotulo, autoComplete) => (
    <div>
      <label htmlFor={`senha-${nome}`} className="mb-1 block text-xs font-medium muted">{rotulo}</label>
      <input
        id={`senha-${nome}`}
        type="password"
        autoComplete={autoComplete}
        maxLength={128}
        value={form[nome]}
        onChange={(e) => setForm((f) => ({ ...f, [nome]: e.target.value }))}
        className="input"
      />
    </div>
  )

  return (
    <Card title="Senha" desc="Exige a senha atual. Trocar a senha encerra as sessões abertas em outros navegadores.">
      <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {campo('atual', 'Senha atual', 'current-password')}
        {campo('nova', `Nova senha (mín. ${SENHA_MINIMA})`, 'new-password')}
        {campo('confirma', 'Confirme a nova', 'new-password')}
        {erro && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-3">{erro}</p>}
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={enviando || !form.atual || !form.nova || !form.confirma}
            className="btn-primary disabled:opacity-50"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Trocar senha
          </button>
        </div>
      </form>
    </Card>
  )
}

function Info({ termo, valor }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <dt className="text-[10px] font-bold uppercase tracking-wider muted">{termo}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{valor}</dd>
    </div>
  )
}
