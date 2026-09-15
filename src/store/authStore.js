import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE_URL } from '../services/config'
import { useNewsStore } from './newsStore'
import { ROLE_LABELS } from '../auth/permissions'

// -----------------------------------------------------------------------------
// SESSÃO
//
// O papel vem de um token assinado pelo servidor, e é o servidor que decide o
// que aquele token alcança — a cada requisição, lendo papel e situação da conta
// no banco. Editar o localStorage muda o que a INTERFACE desenha e não abre
// nenhuma rota.
//
// O token fica no localStorage, com a limitação que isso implica (um XSS o
// alcança); a alternativa correta é cookie httpOnly, que exige o mesmo domínio
// e uma camada de CSRF.
// -----------------------------------------------------------------------------

const api = (caminho) => `${API_BASE_URL}/api${caminho}`

/** Evento disparado pela camada de dados quando o servidor responde 401. */
export const EVENTO_SESSAO_PERDIDA = 'defesabr:sessao-perdida'

/** Papéis do produto — os mesmos que o servidor atribui. */
export const ROLES = {
  user: { id: 'user', label: ROLE_LABELS.user },
  admin: { id: 'admin', label: ROLE_LABELS.admin },
}

async function chamar(metodo, caminho, corpo, token) {
  const r = await fetch(api(caminho), {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(dados?.error || 'Não foi possível concluir.')
    err.campo = dados?.campo
    err.code = dados?.code
    err.status = r.status
    throw err
  }
  return dados
}

/**
 * A pasta de favoritos segue a CONTA, e não o navegador.
 *
 * Não é aguardado: a sincronização é efeito colateral bem-vindo do login, não
 * condição dele. Um servidor lento não pode atrasar a entrada.
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
      /** Por que a última sessão terminou sem a pessoa pedir, para a tela avisar. */
      motivoSaida: null,

      /** Entra com nome de usuário OU e-mail e senha. */
      login: async (identificador, password) => {
        set({ carregando: true })
        try {
          const { user, token } = await chamar('POST', '/auth/login', { username: identificador, password })
          set({ user, token, isAuthenticated: true, carregando: false, motivoSaida: null })
          sincronizarPasta()
          return { ok: true, user }
        } catch (err) {
          set({ carregando: false })
          return { ok: false, error: err.message, campo: err.campo, code: err.code }
        }
      },

      /** Cria conta. O servidor sempre atribui o papel `user`. */
      register: async ({ name, email, password }) => {
        set({ carregando: true })
        try {
          const { user, token } = await chamar('POST', '/auth/register', { name, email, password })
          set({ user, token, isAuthenticated: true, carregando: false, motivoSaida: null })
          sincronizarPasta()
          return { ok: true, user }
        } catch (err) {
          set({ carregando: false })
          return { ok: false, error: err.message, campo: err.campo }
        }
      },

      logout: (motivo = null) => {
        // O que é da pessoa sai junto: a pasta (cópia da que está no servidor),
        // os avisos e os clippings arquivados. Deixá-los faria a próxima conta
        // a entrar neste navegador herdá-los — e enviar a pasta anterior para a
        // própria, na sincronização do login.
        useNewsStore.setState({ favorites: [], notifications: [], clippings: [], latestClipping: null })
        set({ user: null, token: null, isAuthenticated: false, motivoSaida: motivo })
      },

      /**
       * Revalida a sessão guardada contra o servidor, na subida.
       *
       * Só descarta a sessão quando o servidor RECUSA o token (401). Descartava
       * em qualquer falha — e um servidor reiniciando por dez segundos
       * desconectava todo mundo que abrisse a página nesse intervalo.
       */
      revalidar: async () => {
        const token = get().token
        if (!token) return
        try {
          const r = await fetch(api('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
          if (r.status === 401) {
            get().logout('expirada')
            return
          }
          if (!r.ok) return
          const { user } = await r.json()
          set({ user, isAuthenticated: true })
          sincronizarPasta()
        } catch { /* sem rede: mantém a sessão; a próxima consulta decide */ }
      },

      /** Troca o nome de exibição — no servidor. */
      atualizarNome: async (name) => {
        try {
          const { user } = await chamar('PATCH', '/auth/me', { name }, get().token)
          set({ user })
          return { ok: true, user }
        } catch (err) {
          return { ok: false, error: err.message, campo: err.campo, code: err.code }
        }
      },

      /** Troca a senha. As outras sessões caem; esta recebe token novo. */
      trocarSenha: async (atual, nova) => {
        try {
          const { user, token } = await chamar('PUT', '/auth/senha', { atual, nova }, get().token)
          set({ user, token })
          // A senha padrão pode ter deixado de valer: o atalho de entrada muda.
          window.dispatchEvent(new CustomEvent('defesabr:contas-iniciais-mudaram'))
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err.message, campo: err.campo, code: err.code }
        }
      },

      /** Derruba todas as outras sessões desta conta. */
      encerrarOutrasSessoes: async () => {
        try {
          const { user, token } = await chamar('POST', '/auth/sessoes/encerrar', null, get().token)
          set({ user, token })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err.message, code: err.code }
        }
      },
    }),
    {
      name: 'defesabr-auth-v5',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// A SESSÃO CAI QUANDO O SERVIDOR DIZ QUE CAIU
//
// Suspensão, remoção, troca de senha em outro aparelho ou token vencido fazem
// o servidor responder 401. A interface continuava desenhando o menu de quem
// estava logado, com toda consulta falhando por baixo — e a mensagem era
// "Sua sessão não tem permissão para esta consulta".
//
// A camada de dados dispara o evento; aqui a sessão local é desfeita.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener(EVENTO_SESSAO_PERDIDA, () => {
    if (useAuthStore.getState().isAuthenticated) useAuthStore.getState().logout('expirada')
  })
}

/** Token atual, para o cliente HTTP anexar às consultas. */
export const tokenAtual = () => useAuthStore.getState().token

export default useAuthStore
