import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  generateDailyClipping,
  generateWeeklyAnalysis,
  semanticSearch,
  isApiConfigured,
} from '../api/anthropic'
import { mockDailyClipping, mockWeeklyAnalysis, todayNews } from '../data/mockData'
import { formatDateBR } from '../utils/dateUtils'

const STEPS = [
  'Buscando notícias nas fontes configuradas…',
  'Filtrando por relevância para Segurança & Defesa…',
  'Compilando e resumindo com IA…',
  'Gerando análise de impacto…',
]

export function useClaudeAI() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(-1) // índice da etapa atual
  const [source, setSource] = useState(null) // 'ai' | 'demo'

  const runSteps = useCallback(async (work) => {
    setLoading(true)
    setStep(0)
    // anima as duas primeiras etapas (busca/filtragem) artificialmente
    await wait(500)
    setStep(1)
    await wait(500)
    setStep(2)
    const result = await work()
    setStep(3)
    await wait(400)
    setStep(4) // todas completas
    setLoading(false)
    return result
  }, [])

  const generateClipping = useCallback(
    async (rawNews = todayNews) => {
      return runSteps(async () => {
        if (!isApiConfigured()) {
          toast('Modo demonstração: exibindo clipping de exemplo (configure a chave de API)', { icon: '🟡' })
          setSource('demo')
          return { ...mockDailyClipping, date: formatDateBR() }
        }
        try {
          const clip = await generateDailyClipping(rawNews)
          setSource('ai')
          toast.success('Clipping gerado com IA')
          return clip
        } catch (err) {
          console.warn('Falha na IA, usando fallback:', err.message)
          toast.error('IA indisponível — exibindo dados demonstrativos')
          setSource('demo')
          return { ...mockDailyClipping, date: formatDateBR() }
        }
      })
    },
    [runSteps]
  )

  const generateWeekly = useCallback(async (weeklyNews, focusArea = 'empresarial') => {
    setLoading(true)
    setSource(null)
    try {
      if (!isApiConfigured()) {
        toast('Modo demonstração: análise semanal de exemplo', { icon: '🟡' })
        setSource('demo')
        return mockWeeklyAnalysis[focusArea]
      }
      const analysis = await generateWeeklyAnalysis(weeklyNews || todayNews, focusArea)
      setSource('ai')
      toast.success('Análise semanal gerada com IA')
      return analysis
    } catch (err) {
      console.warn('Falha na IA (semanal):', err.message)
      toast.error('IA indisponível — análise demonstrativa')
      setSource('demo')
      return mockWeeklyAnalysis[focusArea]
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(async (query, articles) => {
    if (!isApiConfigured()) {
      // busca local simples por substring
      const q = query.toLowerCase()
      return {
        source: 'demo',
        results: articles
          .filter((a) => `${a.title} ${a.summary}`.toLowerCase().includes(q))
          .map((a) => ({ id: a.id, relevance: 1, snippet: a.summary })),
      }
    }
    try {
      const res = await semanticSearch(query, articles)
      return { source: 'ai', ...res }
    } catch {
      const q = query.toLowerCase()
      return {
        source: 'demo',
        results: articles
          .filter((a) => `${a.title} ${a.summary}`.toLowerCase().includes(q))
          .map((a) => ({ id: a.id, relevance: 1, snippet: a.summary })),
      }
    }
  }, [])

  return { loading, step, source, steps: STEPS, generateClipping, generateWeekly, search, apiConfigured: isApiConfigured() }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
