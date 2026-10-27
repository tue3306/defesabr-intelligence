import { useEffect, useRef } from 'react'

// A coleta roda a cada 5 minutos; reler a tela no mesmo ritmo mantém o que se
// vê atual sem multiplicar chamadas à API.
export const INTERVALO_AO_VIVO_MS = 5 * 60_000

/**
 * Chama `atualizar` a cada `ms` enquanto a aba estiver visível. Aba escondida
 * não consulta nada; ao voltar, atualiza na hora se o intervalo já passou.
 */
export function useAoVivo(atualizar, ms = INTERVALO_AO_VIVO_MS) {
  const fn = useRef(atualizar)
  fn.current = atualizar

  useEffect(() => {
    let ultima = Date.now()
    const talvez = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < ms) return
      ultima = Date.now()
      fn.current()
    }
    const id = setInterval(talvez, Math.min(ms, 60_000))
    document.addEventListener('visibilitychange', talvez)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', talvez)
    }
  }, [ms])
}

export default useAoVivo
