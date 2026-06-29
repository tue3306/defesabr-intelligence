import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink, Copy, Bookmark, BookmarkCheck, Share2, MapPin, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from './Badge'
import { timeAgo } from '../../utils/dateUtils'
import { clipboard } from '../../utils/textUtils'
import { useNewsStore } from '../../store/newsStore'

// variant: 'compact' (feed) | 'full' (clipping com pontos-chave expansíveis)
export default function NewsCard({ news, variant = 'compact', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const toggleFavorite = useNewsStore((s) => s.toggleFavorite)
  const favored = useNewsStore((s) => s.favorites.some((f) => f.id === news.id))

  const saveFavorite = () => {
    const added = toggleFavorite(news)
    toast.success(added ? 'Salvo na sua pasta' : 'Removido da pasta')
  }

  const copy = () => {
    clipboard(`${news.title}\n\n${news.summary}\n\nFonte: ${news.source}`)
      .then(() => toast.success('Copiado para a área de transferência'))
      .catch(() => toast.error('Não foi possível copiar'))
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: news.title, text: news.summary, url: news.url }).catch(() => {})
    } else {
      clipboard(news.url || news.title).then(() => toast.success('Link copiado'))
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-4 hover:border-gold-500/25 hover:shadow-card-hover"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge type="urgency" value={news.urgency} />
        <Badge type="category" value={news.category} />
        <span className="muted">{news.source}</span>
        <span className="muted">·</span>
        <span className="muted">{timeAgo(news.date)}</span>
      </div>

      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">{news.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-300 dark:text-gray-300">
        {news.summary}
      </p>

      {variant === 'full' && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
            aria-expanded={open}
          >
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Recolher detalhes' : 'Ver pontos-chave'}
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 border-t border-gray-700/40 pt-3 text-sm">
                  {news.key_points?.length > 0 && (
                    <div>
                      <p className="mb-1 font-semibold text-gray-200">▼ Pontos-chave</p>
                      <ul className="ml-1 space-y-1">
                        {news.key_points.map((p, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-brand-400">•</span>
                            <span className="text-gray-300">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {news.impact_br && (
                    <div className="rounded-lg bg-brand-500/10 p-3">
                      <p className="font-semibold text-brand-300">📍 Impacto para o Brasil</p>
                      <p className="mt-1 text-gray-300">{news.impact_br}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs muted">
                    {news.region && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} /> {news.region}
                      </span>
                    )}
                    {news.actors?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} /> {news.actors.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-700/40 pt-3">
            <ActionBtn href={news.url} icon={ExternalLink} label="Fonte" />
            <ActionBtn onClick={copy} icon={Copy} label="Copiar" />
            <ActionBtn onClick={saveFavorite} icon={favored ? BookmarkCheck : Bookmark} label={favored ? 'Salvo' : 'Salvar'} active={favored} />
            <ActionBtn onClick={share} icon={Share2} label="Compartilhar" />
          </div>
        </>
      )}

      {variant === 'compact' && news.url && (
        <a
          href={news.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
        >
          Ler mais <ExternalLink size={13} />
        </a>
      )}
    </motion.article>
  )
}

function ActionBtn({ href, onClick, icon: Icon, label, active }) {
  const cls = active
    ? 'inline-flex items-center gap-1.5 rounded-lg border border-brand-500/50 bg-brand-500/15 px-2.5 py-1.5 text-xs font-medium text-brand-300'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-gray-600/50 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5'
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} aria-label={label}>
        <Icon size={13} /> {label}
      </a>
    )
  }
  return (
    <button onClick={onClick} className={cls} aria-label={label}>
      <Icon size={13} /> {label}
    </button>
  )
}
