import { useEffect, useState } from 'react'
import { viaPonte, apiOnline } from '../services/apiBridge'

// -----------------------------------------------------------------------------
// AS FONTES QUE REALMENTE ALIMENTAM O ACERVO
//
// Três telas — Configurações, o painel de fontes do Clipping e o bloco de
// diagnóstico — mostravam uma lista de 15 fontes escrita à mão em
// `mockData.js`, com `status: 'online'` literal. Entre as "online" estavam
// Marinha, FAB e Exército, que o próprio código documenta como HTTP 403 e 404
// e que por isso NÃO estão cadastradas no servidor.
//
// Pior: a lista vinha com botões de ativar, desativar, adicionar e remover, e
// nenhum deles fazia nada. A coleta roda no servidor e nunca leu essa lista.
// Um controle que não controla é mais enganoso que um controle ausente.
//
// Este hook traz as fontes de verdade, com o estado medido na última coleta.
// -----------------------------------------------------------------------------
export function useFontesReais() {
  const [estado, setEstado] = useState({ itens: [], total: null, ok: null, carregando: true })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const d = await viaPonte('GET /intel/sources/summary', {})
        if (!vivo || !d) return
        setEstado({ itens: d.items || [], total: d.total ?? null, ok: d.ok ?? null, carregando: false })
      } catch {
        // Mantém a lista vazia: a tela sabe dizer que não conseguiu ler.
      } finally {
        if (vivo) setEstado((e) => ({ ...e, carregando: false }))
      }
    })()
    return () => { vivo = false }
  }, [])

  return estado
}

export default useFontesReais
