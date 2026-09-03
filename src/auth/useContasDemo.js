import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { API_BASE_URL } from '../services/config'

// -----------------------------------------------------------------------------
// CONTAS DE EXEMPLO
//
// A plataforma precisa ser percorrível sem cadastro — é um projeto acadêmico, e
// quem avalia não vai criar conta para ver as três visões. Este hook busca as
// contas de exemplo no servidor e oferece "entrar como", que faz um LOGIN DE
// VERDADE: POST /api/auth/login, senha conferida por scrypt, token assinado.
//
// A diferença em relação ao que havia antes não é cosmética. Antes, "entrar
// como administrador" escrevia `{ role: 'admin' }` no localStorage e nada mais
// acontecia — os endpoints de administração atendiam qualquer um. Agora o papel
// vem no token, e é o servidor que decide o que ele alcança.
//
// Se as contas forem removidas do banco, a lista vem vazia e as telas deixam de
// oferecê-las, em vez de mostrar credenciais que não funcionam.
// -----------------------------------------------------------------------------

export const ROTULO_PAPEL = { admin: 'Administrador', analyst: 'Analista', user: 'Usuário' }

export function useContasDemo() {
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    let vivo = true
    fetch(`${API_BASE_URL}/api/auth/accounts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.items) setContas(d.items) })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  /** Entra como a conta de exemplo do papel pedido. Login real. */
  const entrarComo = useCallback(async (papel) => {
    const c = contas.find((x) => x.role === papel)
    if (!c) return { ok: false, error: 'Conta de exemplo indisponível.' }
    return login(c.email, c.senha)
  }, [contas, login])

  return { contas, carregando, entrarComo }
}

export default useContasDemo
