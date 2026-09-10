import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LifeBuoy, X, Sparkles, ArrowRight, CornerDownLeft, Compass, BookOpen, Ban,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useResource } from '../../hooks/useResource'
import { request } from '../../services/client'
import { perguntarAoGuia } from '../../services/ia'

// -----------------------------------------------------------------------------
// A VISITA GUIADA
//
// ─────────────────────────────────────────────────────────────────────────────
// O GUIA ESCRITO É A BASE. A IA É A CAMADA DE CIMA.
//
// A tentação era fazer isto só com modelo: um chat que explica a plataforma.
// Não funciona, e o motivo é de ordem prática antes de ser de princípio —
// quem precisa de uma visita guiada é quem acabou de chegar, e quem acabou de
// chegar é exatamente quem AINDA NÃO CONFIGUROU CHAVE NENHUMA.
//
// Um assistente que só responde com IA estaria quebrado para a única pessoa que
// ele existe para atender.
//
// Então há dois estados, e os dois são úteis:
//
//   SEM CHAVE   os tópicos do guia, navegáveis — por onde começar, as telas por
//               nível, os conceitos e o que a plataforma não faz.
//   COM CHAVE   os mesmos tópicos, mais um campo de pergunta livre. O modelo
//               responde SOMENTE a partir do guia, e é instruído a dizer "o
//               guia não cobre isso" quando a pergunta cai fora.
//
// ─────────────────────────────────────────────────────────────────────────────
// SÓ PARA CONTA DE USUÁRIO
//
// Quem administra a instalação subiu a plataforma e leu o README — não precisa
// que ela se explique. Uma bolha de ajuda permanente na tela de quem opera é
// ruído sobre a pessoa que menos precisa dela.
// -----------------------------------------------------------------------------

const ABAS = [
  { id: 'comecar', rotulo: 'Por onde começar', icone: Compass },
  { id: 'telas', rotulo: 'As telas', icone: BookOpen },
  { id: 'conceitos', rotulo: 'Conceitos', icone: Sparkles },
  { id: 'limites', rotulo: 'O que não faz', icone: Ban },
]

export default function AssistenteGuia() {
  const papel = useAuthStore((s) => s.user?.role)
  const autenticado = useAuthStore((s) => s.isAuthenticated)
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState('comecar')
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState(null)
  const [carregando, setCarregando] = useState(false)

  const guia = useResource(() => request('GET /ia/guia'), [], { enabled: autenticado && papel === 'user' })

  // Só conta de usuário, e só autenticada. Ver a nota acima.
  if (!autenticado || papel !== 'user') return null

  const g = guia.data
  const perguntar = async (e) => {
    e?.preventDefault()
    const q = pergunta.trim()
    if (q.length < 3) return
    setCarregando(true)
    setResposta(null)
    try {
      setResposta(await perguntarAoGuia(q))
    } catch (err) {
      toast.error(err?.message || 'Não foi possível responder agora.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      {/* O BOTÃO fica acima do rodapé e abaixo dos avisos: presente sem
        * disputar a leitura. */}
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? 'Fechar o guia' : 'Abrir o guia da plataforma'}
        aria-expanded={aberto}
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
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
            className="card fixed bottom-20 left-5 z-40 flex max-h-[min(32rem,calc(100vh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden p-0"
          >
            <div className="shrink-0 border-b border-gray-200 p-4 dark:border-white/10">
              <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
                <LifeBuoy size={16} className="text-brand-500 dark:text-brand-300" />
                Como usar a plataforma
              </p>
              <p className="mt-0.5 text-xs muted">
                {g?.perguntaDisponivel
                  ? 'Navegue pelos tópicos ou pergunte com as suas palavras.'
                  : 'Um guia dos três níveis, das telas e do que a plataforma não faz.'}
              </p>
            </div>

            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-200 px-2 dark:border-white/10">
              {ABAS.map((a) => (
                <button
                  key={a.id}
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
              {guia.error && <p className="text-sm muted">O guia não carregou. Tente de novo em instantes.</p>}

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
                  {g.niveis.map((n) => (
                    <div key={n.nome}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400">
                        {n.nome} — {n.pergunta}
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

              {/* ESTA ABA É TÃO IMPORTANTE QUANTO AS OUTRAS TRÊS.
                * Saber o que a plataforma NÃO faz poupa a pessoa de procurar
                * por vinte minutos um botão que nunca existiu — e é o que
                * permite ao assistente recusar sem inventar um caminho. */}
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

              {resposta && (
                <div className="mt-4 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  <p className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                      <Sparkles size={10} /> Escrito por máquina
                    </span>
                    <span className="font-mono text-[10px] muted">{resposta.modelo}</span>
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{resposta.texto}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed muted">
                    Resposta montada a partir do guia acima — o modelo não consulta o acervo nem a
                    internet, e é instruído a dizer quando o guia não cobre o assunto.
                  </p>
                </div>
              )}
            </div>

            {g?.perguntaDisponivel && (
              <form onSubmit={perguntar} className="shrink-0 border-t border-gray-200 p-3 dark:border-white/10">
                <div className="flex gap-2">
                  <label htmlFor="pergunta-guia" className="sr-only">Pergunte como usar a plataforma</label>
                  <input
                    id="pergunta-guia"
                    type="text"
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                    maxLength={300}
                    placeholder="Onde vejo os ataques a órgãos públicos?"
                    className="min-w-0 flex-1 text-sm"
                  />
                  <button type="submit" disabled={carregando} className="btn-primary shrink-0 px-2.5">
                    <CornerDownLeft size={15} />
                    <span className="sr-only">{carregando ? 'Consultando' : 'Perguntar'}</span>
                  </button>
                </div>
              </form>
            )}

            {g && !g.perguntaDisponivel && (
              <p className="shrink-0 border-t border-gray-200 p-3 text-[11px] leading-relaxed muted dark:border-white/10">
                Quer perguntar com as suas palavras? Configure a sua chave em{' '}
                <Link to="/conta" onClick={() => setAberto(false)} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Minha conta → Segurança
                </Link>
                . Sem ela, o guia acima continua completo.
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
