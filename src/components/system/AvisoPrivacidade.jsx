import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'

// -----------------------------------------------------------------------------
// O AVISO DE PRIVACIDADE — e por que ele NÃO é um "aceite de cookies"
//
// O banner que a web ensinou a fazer pergunta "aceita cookies?" e trava a tela
// até alguém clicar. Ele existe porque o site quer CONSENTIMENTO para rastrear:
// sem o clique, o pixel de publicidade e o analytics ficariam ilegais.
//
// Aqui não há nada disso. A plataforma usa armazenamento local para três
// coisas que a própria pessoa pediu — manter a sessão, lembrar o tema e a
// pasta — e a LGPD não exige consentimento para o que é necessário à execução
// do serviço (art. 7º, V). Pedir um "aceito" para isso seria teatro: uma
// pergunta cuja única resposta possível é sim, num site que não rastreia.
//
// Então o banner AVISA e sai do caminho. Diz o que é guardado, aponta para a
// política inteira e fecha com um botão. Não bloqueia leitura, não volta a
// cada visita e não finge uma escolha que não existe.
//
// O "Entendi" fica no navegador de quem leu. Sem ele, o aviso reapareceria a
// cada carregamento — que é a forma mais rápida de treinar alguém a clicar sem
// ler.
// -----------------------------------------------------------------------------

const CHAVE = 'defesabr-aviso-privacidade-v1'

export default function AvisoPrivacidade() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    // Em janela anônima ou com armazenamento bloqueado, `localStorage` lança.
    // O aviso não pode derrubar a aplicação: sem poder ler, ele simplesmente
    // não aparece.
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true)
    } catch { /* sem armazenamento: segue sem aviso */ }
  }, [])

  if (!visivel) return null

  const fechar = () => {
    setVisivel(false)
    try { localStorage.setItem(CHAVE, new Date().toISOString()) } catch { /* idem */ }
    // O alerta crítico espera este aviso sair: os dois ocupam o pé da tela.
    window.dispatchEvent(new Event('defesabr:privacidade-vista'))
  }

  return (
    <div
      role="region"
      aria-label="Aviso de privacidade"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl animate-scale-in rounded-xl border border-gray-200 bg-white p-4 shadow-dropdown dark:border-white/10 dark:bg-military-dark sm:inset-x-4 sm:bottom-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500 dark:text-brand-300">
          <Cookie size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Este site não rastreia você</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Não há cookies de publicidade nem analytics. O navegador guarda apenas o necessário para o
            site funcionar: sua sessão, suas preferências e sua pasta de leitura — e tudo isso some se
            você limpar os dados do site.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={fechar} className="btn-primary px-3 py-1.5 text-sm">
              Entendi
            </button>
            <Link
              to="/privacidade"
              onClick={fechar}
              className="btn-ghost px-3 py-1.5 text-sm"
            >
              Privacidade e LGPD
            </Link>
            <Link
              to="/privacidade#navegador"
              onClick={fechar}
              className="px-2 py-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              Ver e apagar o que fica guardado
            </Link>
          </div>
        </div>
        <button
          onClick={fechar}
          aria-label="Fechar aviso de privacidade"
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
