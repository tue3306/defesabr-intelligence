import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { User, Shield, Check, LogOut, Lock, Info, KeyRound, MonitorX, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ROLE_LABELS } from '../auth/permissions'
import ChaveDaIa from '../components/ia/ChaveDaIa'
import ConfirmDialog from '../components/ui/ConfirmDialog'

// -----------------------------------------------------------------------------
// MINHA CONTA
//
// Tudo que se altera aqui é alterado no servidor.
//
// A tela já teve: foto de perfil guardada como dataURL no navegador; nome e
// e-mail "salvos" só na memória local, desfeitos pela revalidação seguinte;
// um seletor de idioma com uma opção; uma aba de "Permissões" listando dossiês,
// matriz de riscos e planos que nunca existiram; preferências duplicadas de
// Configurações; e o rodapé "Sem servidor de identidade: as alterações ficam
// neste navegador" — falso desde que as contas passaram a viver no banco.
// -----------------------------------------------------------------------------

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
]

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

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10" role="tablist">
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

      {user?.compartilhada && (
        <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed dark:border-white/10 dark:bg-white/[0.03]">
          <Info size={16} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
          <span>
            Esta é a conta de <strong>uso compartilhado</strong> do projeto: a senha é pública, então
            nome, senha, sessões e chave de IA não podem ser alterados nela. Para ter esses controles,
            saia e crie a sua conta.
          </span>
        </p>
      )}

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

  const bloqueada = !!user?.compartilhada
  const mudou = name.trim().replace(/\s+/g, ' ') !== (user?.name || '')

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    const r = await atualizarNome(name)
    setSalvando(false)
    if (r.ok) toast.success('Nome atualizado.')
    else setErro(r.error)
  }

  const email = user?.email && !user.email.endsWith('.invalid') ? user.email : null

  return (
    <div className="space-y-6">
      <Card title="Identidade">
        <form onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="conta-nome" className="mb-1 block text-xs font-medium muted">Nome de exibição</label>
            <input
              id="conta-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={bloqueada}
              maxLength={80}
              className="input disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <ReadOnly label="Nome de usuário" value={user?.username || '—'} />
          <ReadOnly
            label="E-mail"
            value={email || 'não informado'}
            hint="Identificador de entrada. Trocá-lo exigiria confirmar o novo endereço, e a plataforma não envia e-mail."
          />
          {erro && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-2">{erro}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={bloqueada || salvando || !mudou || name.trim().length < 2} className="btn-primary disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar nome
            </button>
          </div>
        </form>
      </Card>

      <Card title="Acesso">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info2 termo="Papel" valor={ROLE_LABELS[user?.role] || '—'} />
          <Info2 termo="Conta criada em" valor={user?.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '—'} />
        </dl>
      </Card>
    </div>
  )
}

function ReadOnly({ label, value, hint }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium muted">{label}</span>
      <p className="input flex items-center truncate bg-gray-50 font-mono text-sm dark:bg-white/[0.03]">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-relaxed muted">{hint}</p>}
    </div>
  )
}

// ──────────────────────── SEGURANÇA ───────────────────────
function SecurityTab() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const encerrarOutrasSessoes = useAuthStore((s) => s.encerrarOutrasSessoes)
  const navigate = useNavigate()
  const [confirmarSessoes, setConfirmarSessoes] = useState(false)

  // O payload do token é legível e não guarda segredo — id, nome, papel e
  // prazo. O que impede forjá-lo é a assinatura, conferida no servidor.
  let expiraEm = null
  try {
    const corpo = token ? JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) : null
    expiraEm = corpo?.exp ? new Date(corpo.exp) : null
  } catch { /* token ilegível: a tela mostra ausência */ }

  const bloqueada = !!user?.compartilhada

  const encerrar = async () => {
    const r = await encerrarOutrasSessoes()
    if (r.ok) toast.success('As outras sessões desta conta foram encerradas.')
    else toast.error(r.error)
  }

  return (
    <div className="space-y-6">
      <Card
        title="Assistente por IA"
        desc="A sua chave do modelo. Fica cifrada no servidor e o navegador nunca a lê de volta."
      >
        <ChaveDaIa />
      </Card>

      {!bloqueada && <TrocarSenha />}

      <Card title="Sessões" desc="Onde esta conta está conectada agora.">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info2 termo="Esta sessão expira em" valor={expiraEm ? expiraEm.toLocaleString('pt-BR') : '—'} />
          <Info2 termo="Última entrada" valor={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : '—'} />
        </dl>
        <p className="mt-4 text-xs leading-relaxed muted">
          O servidor não guarda lista de dispositivos, então não há o que listar. O que dá para fazer é
          derrubar todas as sessões desta conta de uma vez — em qualquer navegador ou aparelho —, mantendo
          só esta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!bloqueada && (
            <button onClick={() => setConfirmarSessoes(true)} className="btn-ghost text-sm">
              <MonitorX size={15} /> Encerrar as outras sessões
            </button>
          )}
          <button onClick={() => { logout(); navigate('/') }} className="btn-ghost text-sm">
            <LogOut size={15} /> Sair desta sessão
          </button>
        </div>
      </Card>

      <Card title="O que ainda não existe">
        <ul className="space-y-2.5">
          {[
            ['Recuperação de senha por e-mail', 'Depende de envio de mensagem, que a plataforma não faz. Quem esquecer a senha pede a um administrador uma senha temporária e a troca aqui.'],
            ['Verificação em duas etapas', 'Não implementada.'],
            ['Entrar com conta Google', 'Não implementada.'],
          ].map(([titulo, porque]) => (
            <li key={titulo} className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <Lock size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-xs leading-relaxed muted">{porque}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmarSessoes}
        onClose={() => setConfirmarSessoes(false)}
        onConfirm={encerrar}
        tone="default"
        icon={MonitorX}
        title="Encerrar as outras sessões"
        description="Todo navegador ou aparelho conectado a esta conta será desconectado na próxima ação. Esta sessão continua."
        confirmLabel="Encerrar"
      />
    </div>
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
    if (form.nova !== form.confirma) return setErro('A confirmação não confere com a nova senha.')
    setEnviando(true)
    const r = await trocarSenha(form.atual, form.nova)
    setEnviando(false)
    if (r.ok) {
      setForm({ atual: '', nova: '', confirma: '' })
      toast.success('Senha trocada. As outras sessões desta conta foram encerradas.')
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
        value={form[nome]}
        onChange={(e) => setForm((f) => ({ ...f, [nome]: e.target.value }))}
        className="input"
      />
    </div>
  )

  return (
    <Card title="Senha" desc="Trocar a senha encerra as sessões abertas em outros navegadores.">
      <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {campo('atual', 'Senha atual', 'current-password')}
        {campo('nova', 'Nova senha (mín. 6)', 'new-password')}
        {campo('confirma', 'Confirme a nova', 'new-password')}
        {erro && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-3">{erro}</p>}
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={enviando || !form.atual || form.nova.length < 6 || !form.confirma}
            className="btn-primary disabled:opacity-50"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Trocar senha
          </button>
        </div>
      </form>
    </Card>
  )
}

function Info2({ termo, valor }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <dt className="text-[10px] font-bold uppercase tracking-wider muted">{termo}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{valor}</dd>
    </div>
  )
}
