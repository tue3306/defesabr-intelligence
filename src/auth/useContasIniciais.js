import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { API_BASE_URL } from '../services/config'

// -----------------------------------------------------------------------------
// CONTAS INICIAIS DO PROJETO ABERTO
//
// A plataforma nasce com duas contas — `admin123` e `usuario123` —, e este
// hook as oferece na tela de entrada. Entrar por elas é um LOGIN DE VERDADE:
// POST /api/auth/login, senha conferida por scrypt, token assinado, papel
// verificado por rota no servidor.
//
// Isso não é modo de demonstração, e a diferença é concreta. Numa versão
// anterior, "entrar como administrador" escrevia `{ role: 'admin' }` no
// localStorage e mais nada acontecia — os endpoints de administração atendiam
// qualquer um. Hoje o papel vem no token e é o servidor que decide o que ele
// alcança; trocar o papel no armazenamento do navegador não abre uma rota
// sequer.
//
// A SENHA NÃO VEM DO SERVIDOR, e é de propósito. Ela é configurável por
// ambiente, e quem publicar a plataforma para valer vai trocá-la — uma rota
// que devolvesse a senha em uso entregaria a instalação de quem a trocou. O
// servidor informa apenas se a conta ainda usa o valor documentado
// (`senhaPadrao`); só nesse caso o atalho de entrada aparece.
//
// Se as contas forem removidas do banco, a lista vem vazia e a tela deixa de
// oferecê-las, em vez de mostrar credenciais que não funcionam.
// -----------------------------------------------------------------------------

export const ROTULO_PAPEL = { admin: 'Administrador', analyst: 'Analista', user: 'Usuário' }

export function useContasIniciais() {
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    let vivo = true
    fetch(`${API_BASE_URL}/api/auth/contas`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.items) setContas(d.items) })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  /**
   * Entra com a conta inicial do papel pedido.
   *
   * Só funciona enquanto a senha for a documentada — que é igual ao nome de
   * usuário. Numa instalação que trocou a senha, `senhaPadrao` vem `false`, o
   * atalho não é oferecido e quem entra digita a credencial própria.
   */
  const entrarComo = useCallback(async (papel) => {
    const c = contas.find((x) => x.role === papel && x.senhaPadrao)
    if (!c) return { ok: false, error: 'Conta indisponível nesta instalação.' }
    return login(c.username, c.username)
  }, [contas, login])

  return { contas, carregando, entrarComo }
}

export default useContasIniciais
