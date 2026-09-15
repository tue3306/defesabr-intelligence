import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LifeBuoy, X, Lightbulb, ArrowRight, Compass, BookOpen, Ban } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { request } from '../../services/client'

// -----------------------------------------------------------------------------
// GUIA DA PLATAFORMA
//
// O botão de ajuda no canto da tela: por onde começar, o que cada tela faz, os
// conceitos que não são óbvios e o que a plataforma não faz. O conteúdo é
// escrito à mão e vem de `GET /api/guia` (server/src/lib/guia.js) — uma fonte
// só, para a ajuda não divergir do que as telas fazem.
// -----------------------------------------------------------------------------

const ABAS = [
  { id: 'comecar', rotulo: 'Por onde começar', icone: Compass },
  { id: 'telas', rotulo: 'As telas', icone: BookOpen },
  { id: 'conceitos', rotulo: 'Conceitos', icone: Lightbulb },
  { id: 'limites', rotulo: 'O que não faz', icone: Ban },
]

/** Os grupos de telas, na ordem da navegação: visão geral, os três níveis, conta e recursos. */
function gruposDeTelas(g) {
  const niveis = g.niveis.map((n) => n.nome)
  const extras = [...new Set(g.telas.map((t) => t.nivel))].filter((n) => !niveis.includes(n))
  const antes = extras.filter((n) => n === 'Visão geral').map((nome) => ({ nome }))
  const depois = extras.filter((n) => n !== 'Visão geral').map((nome) => ({ nome }))
  return [...antes, ...g.niveis, ...depois]
}

export default function GuiaDaPlataforma() {
  const autenticado = useAuthStore((s) => s.isAuthenticated)
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState('comecar')

  // Só busca quando o painel abre: a maior parte das visitas não usa a ajuda.
  const guia = useResource(() => request('GET /guia'), [], { enabled: autenticado && aberto })

  if (!autenticado) return null
  const g = guia.data

  return (
    <>
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? 'Fechar o guia' : 'Abrir o guia da plataforma'}
        aria-expanded={aberto}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        {aberto ? <X size={20} /> : <LifeBuoy size={20} />}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Guia da plataforma"
            className="card fixed bottom-20 right-5 z-40 flex max-h-[min(32rem,calc(100vh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden p-0"
          >
            <div className="shrink-0 border-b border-gray-200 p-4 dark:border-white/10">
              <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
                <LifeBuoy size={16} className="text-brand-500 dark:text-brand-300" />
                Como usar a plataforma
              </p>
              <p className="mt-0.5 text-xs muted">Por onde começar, o que cada tela faz e o que a plataforma não faz.</p>
            </div>

            <div className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 px-2 dark:border-white/10" role="tablist">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-semibold transition-colors ${
                    aba === a.id
                      ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                      : 'border-transparent muted hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <a.icone size={13} /> {a.rotulo}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {guia.loading && <p className="text-sm muted">Carregando o guia…</p>}
              {guia.error && (
                <p className="text-sm muted">
                  O guia não carregou.{' '}
                  <button onClick={() => guia.refetch()} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                    Tentar de novo
                  </button>
                </p>
              )}

              {g && aba === 'comecar' && (
                <ol className="space-y-3">
                  {g.primeirosPassos.map((p, i) => (
                    <li key={p.caminho} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <Link
                          to={p.caminho}
                          onClick={() => setAberto(false)}
                          className="flex items-center gap-1 text-sm font-semibold hover:text-brand-600 dark:hover:text-brand-300"
                        >
                          {p.passo} <ArrowRight size={12} />
                        </Link>
                        <span className="mt-0.5 block text-xs leading-relaxed muted">{p.porque}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {g && aba === 'telas' && (
                <div className="space-y-4">
                  {gruposDeTelas(g).map((n) => (
                    <div key={n.nome}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
                        {n.nome}{n.pergunta ? ` — ${n.pergunta}` : ''}
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {g.telas.filter((t) => t.nivel === n.nome).map((t) => (
                          <li key={t.id}>
                            <Link
                              to={t.caminho}
                              onClick={() => setAberto(false)}
                              className="text-sm font-medium hover:text-brand-600 dark:hover:text-brand-300"
                            >
                              {t.nome}
                            </Link>
                            <span className="block text-xs leading-relaxed muted">{t.resumo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {g && aba === 'conceitos' && (
                <dl className="space-y-3">
                  {g.conceitos.map((c) => (
                    <div key={c.termo}>
                      <dt className="text-sm font-bold">{c.termo}</dt>
                      <dd className="mt-0.5 text-xs leading-relaxed muted">{c.texto}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {g && aba === 'limites' && (
                <ul className="space-y-2">
                  {g.naoFaz.map((x) => (
                    <li key={x} className="flex gap-2 text-xs leading-relaxed muted">
                      <Ban size={13} className="mt-0.5 shrink-0 text-gray-400" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
