import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// -----------------------------------------------------------------------------
// useResource — consumo padronizado da camada de serviços.
//
// Entrega SEMPRE os quatro estados que a interface precisa tratar:
//   data · loading · error · refetch
// além de `meta` (origem do dado: demo | live | fallback) para os selos.
//
//   const { data, loading, error, refetch, meta } =
//     useResource(() => intelligenceService.narratives({ q }), [q])
//
// Cancela requisições obsoletas: se os parâmetros mudarem no meio do caminho,
// a resposta antiga é descartada em vez de sobrescrever a nova.
// -----------------------------------------------------------------------------
export function useResource(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null, keepPreviousData = false } = options

  const [state, setState] = useState({
    data: initialData,
    meta: null,
    loading: enabled,
    error: null,
  })

  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(async () => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    const id = ++requestId.current
    setState((s) => ({
      data: keepPreviousData ? s.data : initialData,
      meta: keepPreviousData ? s.meta : null,
      loading: true,
      error: null,
    }))
    try {
      const result = await fetcherRef.current()
      if (id !== requestId.current) return // resposta obsoleta
      const { data, meta } = result && typeof result === 'object' && 'data' in result
        ? result
        : { data: result, meta: null }
      setState({ data, meta, loading: false, error: null })
    } catch (error) {
      if (id !== requestId.current) return
      setState({ data: initialData, meta: null, loading: false, error })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keepPreviousData, ...deps])

  useEffect(() => {
    run()
    return () => { requestId.current++ } // invalida em caso de desmontagem
  }, [run])

  return useMemo(
    () => ({ ...state, refetch: run, source: state.meta?.source || null }),
    [state, run]
  )
}

/**
 * Versão para ações disparadas pelo usuário (gerar relatório, salvar, etc.).
 * Não executa sozinha: devolve `run` e os estados da execução.
 */
export function useAction(action) {
  const [state, setState] = useState({ loading: false, error: null, data: null })
  const actionRef = useRef(action)
  actionRef.current = action

  const run = useCallback(async (...args) => {
    setState({ loading: true, error: null, data: null })
    try {
      const result = await actionRef.current(...args)
      const data = result && typeof result === 'object' && 'data' in result ? result.data : result
      setState({ loading: false, error: null, data })
      return { ok: true, data }
    } catch (error) {
      setState({ loading: false, error, data: null })
      return { ok: false, error }
    }
  }, [])

  const reset = useCallback(() => setState({ loading: false, error: null, data: null }), [])

  return { ...state, run, reset }
}

export default useResource
