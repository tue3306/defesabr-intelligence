import { useEffect, useState, useCallback } from 'react'
import { fetchAllFeeds } from '../api/rss'
import { useSettingsStore } from '../store/settingsStore'

// Busca noticias agregadas das fontes RSS habilitadas (com fallback mock).
export function useNews(autoLoad = true) {
  const sources = useSettingsStore((s) => s.rssSources)
  const [news, setNews] = useState([])
  const [source, setSource] = useState('demo')
  const [loading, setLoading] = useState(autoLoad)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, source } = await fetchAllFeeds(sources)
    setNews(data)
    setSource(source)
    setLoading(false)
    return { data, source }
  }, [sources])

  useEffect(() => {
    if (autoLoad) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { news, source, loading, reload: load }
}
