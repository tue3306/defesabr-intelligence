import { useState } from 'react'
import { ExternalLink, Bookmark, BookmarkCheck, Info, Loader2 } from 'lucide-react'
import { META_URGENCIA, corDaCategoria } from '../../data/reference'
import { timeAgo, formatDateTimeBR } from '../../utils/dateUtils'
import { noticias } from '../../services'

// -----------------------------------------------------------------------------
// CARTÃO DE NOTÍCIA
//
// Sempre com PROCEDÊNCIA visível: fonte, data e link para o original. Um
// agregador que exibe texto sem dizer de onde veio pede que se confie nele —
// e essa é exatamente a confiança que ele não merece.
//
// O botão "por quê?" abre a explicação do filtro para AQUELE item: quais
// termos casaram e por que ele entrou. É o que torna a regra verificável caso
// a caso, em vez de só declarada.
// -----------------------------------------------------------------------------
export default function NewsCard({ noticia, salvo, onAlternarSalvo }) {
  const [explicacao, setExplicacao] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const u = META_URGENCIA[noticia.urgency] || META_URGENCIA.BAIXO

  const explicar = async () => {
    if (explicacao) { setExplicacao(null); return }
    setCarregando(true)
    try {
      const { data } = await noticias.detalhe(noticia.id)
      setExplicacao(data.explicacao)
    } catch { /* silencioso: é um detalhe opcional */ }
    finally { setCarregando(false) }
  }

  return (
    <article className="card p-4 transition-colors hover:border-gold-500/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.classes}`}>
          {u.rotulo}
        </span>
        {/* A categoria é comunicada pelo FUNDO tingido e pela borda; o texto
            herda a cor de primeiro plano do tema.

            Colorir o texto com a cor da categoria dava 2,31:1 no tema claro
            (Diplomacia, ouro sobre branco) — ilegível. Escurecer a paleta
            quebraria o tema escuro, onde a mesma cor precisa ser clara.
            Mudar o portador da informação resolve os dois de uma vez. */}
        {noticia.category && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold text-gray-800 dark:text-gray-100"
            style={{
              background: `${corDaCategoria(noticia.category)}26`,
              borderColor: `${corDaCategoria(noticia.category)}80`,
            }}
          >
            {noticia.category}
          </span>
        )}
        <span className="text-[11px] muted" title={noticia.date ? formatDateTimeBR(noticia.date) : ''}>
          {noticia.date ? timeAgo(noticia.date) : 'sem data'}
        </span>

        {onAlternarSalvo && (
          <button
            onClick={() => onAlternarSalvo(noticia)}
            className="ml-auto rounded p-1 text-gray-500 transition-colors hover:text-gold-500"
            aria-label={salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            title={salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
          >
            {salvo ? <BookmarkCheck size={15} className="text-gold-500" /> : <Bookmark size={15} />}
          </button>
        )}
      </div>

      <h3 className="mt-2 text-sm font-bold leading-snug tracking-tight">{noticia.title}</h3>

      {noticia.summary && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {noticia.summary}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200 pt-2.5 text-[11px] dark:border-white/[0.06]">
        <span className="font-semibold muted">{noticia.source}</span>

        {noticia.url && (
          <a
            href={noticia.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-500 hover:underline dark:text-brand-400"
          >
            Abrir na fonte <ExternalLink size={10} />
          </a>
        )}

        <button onClick={explicar} className="ml-auto inline-flex items-center gap-1 muted hover:text-gold-600 dark:hover:text-gold-400">
          {carregando ? <Loader2 size={11} className="animate-spin" /> : <Info size={11} />}
          por que está aqui?
        </button>
      </div>

      {explicacao && (
        <div className="mt-2 rounded-lg bg-white/5 p-3 text-xs">
          <p className="font-semibold">
            {explicacao.relevante ? 'Aprovado pelo filtro' : 'Recusado pelo filtro'}
            <span className="ml-2 font-mono muted">{explicacao.pontos} ponto(s)</span>
          </p>
          <dl className="mt-1.5 space-y-1">
            {explicacao.termosFortes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <dt className="muted">inequívocos:</dt>
                <dd className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {explicacao.termosFortes.join(', ')}
                </dd>
              </div>
            )}
            {explicacao.termosFracos?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <dt className="muted">ambíguos:</dt>
                <dd className="font-mono muted">{explicacao.termosFracos.join(', ')}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="muted">termo forte na abertura:</dt>
              <dd className="font-semibold">{explicacao.forteNaAbertura ? 'sim' : 'não'}</dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  )
}
