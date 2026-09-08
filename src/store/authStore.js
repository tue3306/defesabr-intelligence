import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE_URL } from '../services/config'
import { useSubscriptionStore } from './subscriptionStore'
import { useNewsStore } from './newsStore'

// -----------------------------------------------------------------------------
// SESSÃO
//
// Este store guardava um objeto de usuário inventado no navegador: escolher uma
// persona escrevia `{ role: 'admin' }` no localStorage, e pronto — você era
// administrador. Nada verificava.
//
// Agora ele conversa com `/api/auth`. O papel vem de um token assinado pelo
// servidor, e é o servidor que decide o que aquele token alcança. Editar o
// localStorage à mão continua mudando o que a INTERFACE mostra, mas os
// endpoints protegidos respondem 403 — que é a diferença entre esconder um
// botão e controlar acesso.
//
// O token é guardado junto da sessão porque toda consulta precisa dele. Fica
// no localStorage, com a limitação que isso implica (um XSS o alcança); a
// alternativa correta é cookie httpOnly, que exige o mesmo domínio e uma
// camada de CSRF — trabalho que faz sentido quando houver dado sensível.
// -----------------------------------------------------------------------------

const api = (caminho) => `${API_BASE_URL}/api${caminho}`

/** Papéis do produto. A ordem é a hierarquia. */
export const ROLES = {
  user: { id: 'user', label: 'Usuário' },
  analyst: { id: 'analyst', label: 'Analista' },
  admin: { id: 'admin', label: 'Administrador' },
}

async function postar(caminho, corpo) {
  const r = await fetch(api(caminho), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(dados?.error || 'Não foi possível concluir.')
    err.campo = dados?.campo
    err.status = r.status
    throw err
  }
  return dados
}

/**
 * A pasta de favoritos passa a seguir a CONTA, e não o navegador.
 *
 * Chamado nos três pontos em que uma sessão se estabelece — entrar, cadastrar
 * e revalidar na subida. Sem isto, `/api/bookmarks` continuaria existindo sem
 * que nenhum caminho de usuário o alcançasse, e "Minha Pasta" seria uma pasta
 * por navegador.
 *
 * Não é aguardado: a sincronização é um efeito colateral bem-vindo do login,
 * não uma condição dele. Um servidor lento não pode atrasar a entrada, e uma
 * falha aqui não pode transformar um login correto em erro na tela.
 */
function sincronizarPasta() {
  useNewsStore.getState().sincronizarFavoritos?.()
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      carregando: false,

      /**
       * Entra com IDENTIFICADOR e senha.
       *
       * O parametro deixou de se chamar `email` porque deixou de ser um
       * e-mail: as contas do projeto aberto entram por nome de usuario
       * (`admin123`), e o servidor aceita nome de usuario OU endereco no mesmo
       * campo. Manter o nome `email` aqui faria a proxima pessoa acreditar que
       * so endereco funciona — e e justamente esse campo que vai receber o
       * e-mail do Google quando o provedor externo entrar.
       */
      login: async (identificador, password) => {
        set({ carregando: true })
        try {
          const { user, token } = await postar('/auth/login', { username: identificador, password })
          useSubscriptionStore.getState().setPlan(user.plan)
          set({ user, token, isAuthenticated: true, carregando: false })
          sincronizarPasta()
          return { ok: true, user }
        } catch (err) {
          set({ carregando: false })
          return { ok: false, error: err.message, campo: err.campo }
        }
      },

      /** Cria conta. O servidor sempre atribui o papel `user`. */
      register: async ({ name, email, password }) => {
        set({ carregando: true })
        try {
          const { user, token } = await postar('/auth/register', { name, email, password })
          useSubscriptionStore.getState().setPlan(user.plan)
          set({ user, token, isAuthenticated: true, carregando: false })
          sincronizarPasta()
          return { ok: true, user }
        } catch (err) {
          set({ carregando: false })
          return { ok: false, error: err.message, campo: err.campo }
        }
      },

      logout: () => {
        useSubscriptionStore.getState().setPlan('explorar')
        set({ user: null, token: null, isAuthenticated: false })
      },

      /**
       * Revalida a sessão guardada contra o servidor.
       *
       * Chamado na subida. Sem isto, um token vencido (ou assinado com um
       * segredo que o servidor não usa mais, o que acontece a cada deploy sem
       * AUTH_SECRET) manteria a interface parecendo autenticada enquanto toda
       * consulta protegida falhava.
       */
      revalidar: async () => {
        const token = get().token
        if (!token) return
        try {
          const r = await fetch(api('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
          if (!r.ok) throw new Error('sessão inválida')
          const { user } = await r.json()
          useSubscriptionStore.getState().setPlan(user.plan)
          set({ user, isAuthenticated: true })
          sincronizarPasta()
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      /** Edição de perfil — só o que o cliente pode mudar sem o servidor. */
      updateProfile: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),

      // ── Helpers de autorização ──
      // Delegam a src/auth/permissions.js; nenhum componente checa papel cru.
      authContext: () => ({
        isAuthenticated: get().isAuthenticated,
        role: get().user?.role,
        plan: useSubscriptionStore.getState().plan,
      }),
    }),
    {
      name: 'defesabr-auth-v5',
      // O token entra na persistência porque toda consulta precisa dele; sem
      // isso, recarregar a página derrubaria a sessão.
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

/** Token atual, para o cliente HTTP anexar às consultas. */
export const tokenAtual = () => useAuthStore.getState().token

export default useAuthStore
