import { useEffect, useState, useCallback } from 'react'
import { fetchAllFeeds } from '../api/rss'
import { useSettingsStore } from '../store/settingsStore'
import { apiOnline, viaPonte, invalidarSonda } from '../services/apiBridge'

// -----------------------------------------------------------------------------
// NOTÍCIAS
//
// Este hook alimenta a Landing, o Clipping e o painel. Ele tinha um problema
// que nenhuma quantidade de código no navegador resolve: buscava os feeds RSS
// direto do cliente, e navegador não lê RSS de outro domínio — a política de
// mesma origem barra. O caminho anterior dependia de um proxy de terceiro
// (rss2json), que é lento, limitado por cota e some sem aviso.
//
// O backend em `server/` existe justamente para isso: ele busca o XML do lado
// do servidor, onde não há CORS, filtra por relevância e guarda com
// procedência. Aqui a ordem passa a ser:
//
//   1. API própria      → dado real, coletado e filtrado no servidor
//   2. RSS pelo cliente → só se a API estiver fora e houver fonte habilitada
//   3. Acervo local     → última reserva, para a tela nunca ficar quebrada
//
// `source` diz qual dos três aconteceu, e a interface já usa isso nos selos.
// -----------------------------------------------------------------------------

export function useNews(autoLoad = true, opcoes = {}) {
  const { dias = 90, limite = 40 } = opcoes
  const sources = useSettingsStore((s) => s.rssSources)

  const [news, setNews] = useState([])
  const [source, setSource] = useState('demo')
  const [loading, setLoading] = useState(autoLoad)
  const [meta, setMeta] = useState(null)

  const load = useCallback(async (forcar = false) => {
    setLoading(true)
    // Uma coleta manual acabou de rodar? A sonda em cache diria que a API
    // continua como estava. Invalidar força a releitura.
    if (forcar) invalidarSonda()

    try {
      if (await apiOnline()) {
        const d = await viaPonte('GET /news', { days: dias, limit: limite })
        if (d?.items?.length) {
          setNews(d.items)
          setSource('live')
          setMeta({
            totalCollected: d.totalCollected,
            totalRelevant: d.totalRelevant,
            lastFetchAt: d.lastFetchAt,
            method: d.method,
          })
          setLoading(false)
          return { data: d.items, source: 'live', meta: d }
        }
      }
    } catch {
      // A API respondeu à sonda mas falhou na consulta. Segue para o RSS.
    }

    // Reserva: o caminho antigo. Continua aqui porque uma instalação sem o
    // servidor no ar ainda precisa mostrar alguma coisa.
    const { data, source: origem } = await fetchAllFeeds(sources)
    setNews(data)
    setSource(origem)
    setMeta(null)
    setLoading(false)
    return { data, source: origem }
  }, [sources, dias, limite])

  useEffect(() => {
    if (autoLoad) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { news, source, loading, meta, reload: load }
}
