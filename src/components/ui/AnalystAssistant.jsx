import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Bot, User } from 'lucide-react'
import { answerQuestion, suggestedQuestions } from '../../utils/analystKnowledge'

// Renderiza **negrito** e quebras de linha simples.
function RichText({ text }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-semibold text-brand-200">{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>
          )}
        </p>
      ))}
    </>
  )
}

export default function AnalystAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Olá! Sou o **Analista virtual** do DefesaBR. Pergunte sobre programas, conceitos, a Amazônia Azul, a balança militar ou os dossiês.',
    },
  ])
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, open])

  const ask = (question) => {
    const text = (question ?? input).trim()
    if (!text || typing) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    // Simula "raciocínio" para dar sensação de assistente.
    setTimeout(() => {
      const ans = answerQuestion(text)
      setMessages((m) => [...m, { role: 'bot', ...ans }])
      setTyping(false)
    }, 650)
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="card mb-3 flex h-[28rem] w-[min(92vw,22rem)] flex-col overflow-hidden shadow-2xl"
          >
            {/* Cabeçalho */}
            <div className="on-dark flex items-center gap-2 border-b border-gray-700/50 bg-military-darker p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                <Bot size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">Pergunte ao Analista</p>
                <p className="text-[10px] text-emerald-300">● disponível (modo demonstração)</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-gray-400 hover:text-white" aria-label="Fechar assistente">
                <X size={18} />
              </button>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-gray-600/40 text-gray-200' : 'bg-brand-500/20 text-brand-300'}`}>
                    {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </span>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-white/5 text-gray-200'}`}>
                    <RichText text={m.text} />
                    {m.links?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link
                            key={l.to}
                            to={l.to}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-200 hover:bg-brand-500/20"
                          >
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-brand-300"><Bot size={14} /></span>
                  <div className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-2.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sugestões (só no início) */}
              {messages.length === 1 && !typing && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold uppercase muted">Sugestões</p>
                  {suggestedQuestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="block w-full rounded-lg border border-gray-700/50 px-3 py-1.5 text-left text-xs text-gray-300 hover:border-brand-500/50 hover:bg-white/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Entrada */}
            <form
              onSubmit={(e) => { e.preventDefault(); ask() }}
              className="flex items-center gap-2 border-t border-gray-700/50 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta…"
                className="input py-2 text-sm"
                aria-label="Pergunta ao analista"
              />
              <button type="submit" disabled={!input.trim() || typing} className="btn-primary shrink-0 px-3 py-2" aria-label="Enviar">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-brand-500 py-3 pl-3 pr-4 text-white shadow-lg transition-colors hover:bg-brand-600"
          aria-label="Abrir Pergunte ao Analista"
        >
          <Sparkles size={20} />
          <span className="text-sm font-semibold">Pergunte ao Analista</span>
        </button>
      )}
    </div>
  )
}
