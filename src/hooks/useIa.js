import { useCallback, useEffect, useState } from 'react'
import { estadoIa } from '../services/ia'
import { useAuthStore } from '../store/authStore'

// -----------------------------------------------------------------------------
// O ESTADO DO ASSISTENTE, NUM LUGAR SÓ
//
// Substitui `iaConfigurada()`, que devolvia `false` fixo. Três telas perguntam
// "existe modelo ligado aqui?", e a resposta agora depende da instalação — ela
// vem do servidor, que é quem guarda a chave.
//
// SEM SESSÃO NÃO PERGUNTA. `/api/ia/estado` exige papel `user`, e chamá-lo
// deslogado produziria um 401 no console em toda visita à página pública —
// ruído que faz um erro real passar despercebido.
// -----------------------------------------------------------------------------

const VAZIO = {
  configurada: false,
  origem: null,
  modelo: null,
  podeConfigurar: false,
  fixadoPorAmbiente: false,
  finalDaChave: null,
  nota: null,
}

export function useIa() {
  const autenticado = useAuthStore((s) => s.isAuthenticated)
  const [estado, setEstado] = useState(VAZIO)
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!autenticado) { setEstado(VAZIO); return }
    setCarregando(true)
    try {
      setEstado(await estadoIa())
    } catch {
      // Falha ao consultar o estado é tratada como "não configurada": a tela
      // então não oferece o botão, que é o comportamento seguro. Ela nunca
      // mostra erro por causa disto — a ausência do recurso não é uma falha.
      setEstado(VAZIO)
    } finally {
      setCarregando(false)
    }
  }, [autenticado])

  useEffect(() => { recarregar() }, [recarregar])

  return { ...estado, carregando, recarregar }
}

export default useIa
