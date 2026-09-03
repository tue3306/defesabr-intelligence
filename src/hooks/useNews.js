import { useEffect, useState, useCallback } from 'react'
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
// procedência.
//
// A cadeia tinha TRÊS degraus: API, depois RSS pelo cliente via rss2json,
// depois um acervo de notícias escrito à mão. Os dois últimos saíram.
//
// O segundo saiu por ser inútil: rss2json é proxy de terceiro, com cota, e
// existia só para contornar o CORS que o servidor já resolve. O terceiro saiu
// por ser pior que inútil — sem servidor, a plataforma exibia manchetes que
// ninguém publicou, com data e veículo, indistinguíveis das reais.
//
// Restou um degrau. Sem API a lista vem vazia e `erro` diz o motivo; a tela
// mostra ausência, que é a resposta correta.
// -----------------------------------------------------------------------------

export function useNews(autoLoad = true, opcoes = {}) {
  const { dias = 90, limite = 40 } = opcoes

  const [news, setNews] = useState([])
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(autoLoad)
  const [meta, setMeta] = useState(null)
  const [erro, setErro] = useState(null)

  const load = useCallback(async (forcar = false) => {
    setLoading(true)
    setErro(null)
    // Uma coleta manual acabou de rodar? A sonda em cache diria que a API
    // continua como estava. Invalidar força a releitura.
    if (forcar) invalidarSonda()

    try {
      if (!(await apiOnline())) throw new Error('O servidor de coleta não respondeu.')

      const d = await viaPonte('GET /news', { days: dias, limit: limite })
      const itens = d?.items || []
      setNews(itens)
      setSource('live')
      setMeta({
        totalCollected: d?.totalCollected,
        totalRelevant: d?.totalRelevant,
        lastFetchAt: d?.lastFetchAt,
        method: d?.method,
      })
      setLoading(false)
      // Acervo vazio é resposta legítima — a coleta pode não ter aprovado nada
      // no período. Não é erro, e a tela distingue os dois casos.
      return { data: itens, source: 'live', meta: d }
    } catch (e) {
      setNews([])
      setSource(null)
      setMeta(null)
      setErro(e?.userMessage || e?.message || 'Não foi possível consultar o acervo.')
      setLoading(false)
      return { data: [], source: null, erro: e }
    }
  }, [dias, limite])

  useEffect(() => {
    if (autoLoad) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { news, source, loading, meta, erro, reload: load }
}
