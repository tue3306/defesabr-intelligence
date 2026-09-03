import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE_URL } from '../services/config'
import { useSubscriptionStore } from './subscriptionStore'

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

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      carregando: false,

      /**
       * Entra com e-mail e senha.
       *
       * O plano vem do servidor junto do papel, e é sincronizado com o store de
       * assinatura: os dois eixos (papel e plano) governam o que a interface
       * libera, e deixá-los divergir foi a causa de Usuário e Analista
       * parecerem iguais.
       */
      login: async (email, password) => {
        set({ carregando: true })
        try {
          const { user, token } = await postar('/auth/login', { email, password })
          useSubscriptionStore.getState().setPlan(user.plan)
          set({ user, token, isAuthenticated: true, carregando: false })
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
