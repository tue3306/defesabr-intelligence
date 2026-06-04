import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  CalendarDays,
  FileDown,
  Mail,
  Share2,
  Save,
  Rss,
  ChevronDown,
  Plus,
  Circle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import NewsCard from '../components/ui/NewsCard'
import Badge from '../components/ui/Badge'
import AITypingIndicator from '../components/ui/AITypingIndicator'
import { useClaudeAI } from '../hooks/useClaudeAI'
import { useNews } from '../hooks/useNews'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { alertMeta } from '../utils/textUtils'
import { formatFullDate } from '../utils/dateUtils'
import { exportClippingToPDF } from '../utils/exportUtils'
import { clipboard } from '../utils/textUtils'

export default function DailyClipping() {
  const { news } = useNews()
  const { loading, step, steps, source, generateClipping, apiConfigured } = useClaudeAI()
  const addClipping = useNewsStore((s) => s.addClipping)
  const latest = useNewsStore((s) => s.latestClipping)
  const clippings = useNewsStore((s) => s.clippings)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [result, setResult] = useState(latest)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const printRef = useRef()

  const canGenerate = hasPermission('generate')
  const canExport = hasPermission('export')

  const handleGenerate = async () => {
    const clip = await generateClipping(news.length ? news : undefined)
    setResult(clip)
  }

  const handleSave = () => {
    if (!result) return
    addClipping(result)
    toast.success('Clipping salvo no arquivo')
  }

  const handlePDF = () => {
    if (!result) return
    exportClippingToPDF(result)
  }

  const handleDateChange = (e) => {
    const iso = e.target.value
    const found = clippings.find((c) => c.date === iso)
    if (found) {
      setResult(found.data)
      toast.success(`Clipping de ${found.date} carregado`)
    } else {
      toast('Sem clipping arquivado nesta data', { icon: '📭' })
    }
  }

  const alert = alertMeta[result?.alert_level] || alertMeta.NORMAL

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">Clipping Diário</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{formatFullDate()}</h1>
            <p className="mt-1 text-sm muted">
              {result?.news?.length || 5} notícias selecionadas de {news.length || 47} encontradas
              {!apiConfigured && <span className="ml-2 text-yellow-400">· chave de IA não configurada</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-600/50 px-3 py-2 text-sm">
              <CalendarDays size={16} className="text-brand-400" />
              <input type="date" onChange={handleDateChange} className="bg-transparent text-sm focus:outline-none" />
            </label>
            <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate}
              className="btn-primary"
              title={!canGenerate ? 'Seu perfil não permite gerar (visitante)' : undefined}
            >
              <Bot size={18} /> {loading ? 'Gerando…' : 'Gerar Clipping com IA'}
            </button>
          </div>
        </div>
      </div>

      {/* PROGRESSO */}
      {loading && <AITypingIndicator steps={steps} current={step} />}

      {/* RESULTADO */}
      {result && !loading && (
        <motion.div
          ref={printRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Bloco A — Resumo executivo */}
          <div className={`card border-l-4 p-6 ${alert.classes.split(' ').find((c) => c.startsWith('border')) || ''}`}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight">Resumo Executivo</h2>
              <Badge type="alert" value={result.alert_level} />
              <Badge type={source === 'ai' ? 'live' : 'demo'} />
            </div>
            {result.summary_executive?.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed text-gray-300">{p}</p>
            ))}
            {result.editor_note && (
              <blockquote className="editorial-quote mt-4">
                <span className="font-semibold not-italic text-brand-300">Nota do analista: </span>
                {result.editor_note}
              </blockquote>
            )}
          </div>

          {/* Bloco B — Notícias */}
          <div>
            <h2 className="mb-3 text-lg font-bold tracking-tight">
              Principais notícias ({result.news?.length || 0})
            </h2>
            <div className="space-y-4">
              {result.news?.map((n, i) => (
                <NewsCard key={n.id || i} news={n} variant="full" defaultOpen={i === 0} />
              ))}
            </div>
          </div>

          {/* Bloco C — Tendências */}
          {result.trends?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide muted">Tendências do dia</h3>
              <div className="flex flex-wrap gap-2">
                {result.trends.map((t, i) => (
                  <span key={i} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-sm text-brand-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bloco D — Ações */}
          <div className="card flex flex-wrap gap-3 p-4">
            <button onClick={handlePDF} disabled={!canExport} className="btn-ghost" title={!canExport ? 'Perfil sem permissão de exportar' : undefined}>
              <FileDown size={16} /> Exportar PDF
            </button>
            <button onClick={() => toast.success('Envio por e-mail simulado')} className="btn-ghost">
              <Mail size={16} /> Simular e-mail
            </button>
            <button
              onClick={() => clipboard(window.location.href).then(() => toast.success('Link copiado'))}
              className="btn-ghost"
            >
              <Share2 size={16} /> Compartilhar
            </button>
            <button onClick={handleSave} className="btn-ghost">
              <Save size={16} /> Salvar no arquivo
            </button>
          </div>
        </motion.div>
      )}

      {/* Fontes configuradas */}
      <SourcesPanel open={sourcesOpen} onToggle={() => setSourcesOpen((o) => !o)} />
    </div>
  )
}

function SourcesPanel({ open, onToggle }) {
  const sources = useSettingsStore((s) => s.rssSources)
  const toggleSource = useSettingsStore((s) => s.toggleSource)
  const addSource = useSettingsStore((s) => s.addSource)
  const [url, setUrl] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!url.trim()) return
    addSource(url.trim())
    setUrl('')
    toast.success('Fonte adicionada')
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4" aria-expanded={open}>
        <span className="flex items-center gap-2 font-semibold">
          <Rss size={17} className="text-brand-400" /> Fontes configuradas ({sources.length})
        </span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-gray-700/40 p-4">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Circle
                  size={9}
                  className={s.status === 'online' ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}
                />
                <span className="font-medium">{s.name}</span>
              </span>
              <button
                onClick={() => toggleSource(s.id)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  s.enabled ? 'bg-brand-500/20 text-brand-300' : 'bg-gray-600/30 text-gray-400'
                }`}
              >
                {s.enabled ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          ))}
          <form onSubmit={add} className="flex gap-2 pt-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/feed.rss"
              className="input"
            />
            <button type="submit" className="btn-ghost shrink-0">
              <Plus size={16} /> Adicionar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
