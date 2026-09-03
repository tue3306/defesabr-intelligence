import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react'

// -----------------------------------------------------------------------------
// ERROR BOUNDARY — rede de segurança da aplicação.
//
// Um erro de render em qualquer módulo deixaria a tela em branco. Aqui o erro é
// capturado, registrado no coletor (hoje: console; amanhã: serviço de telemetria)
// e substituído por uma tela honesta com caminho de recuperação.
//
// Uso:
//   <ErrorBoundary scope="Clipping Diário"> … </ErrorBoundary>
//   <ErrorBoundary variant="inline" scope="Mapa de risco"> … </ErrorBoundary>
// -----------------------------------------------------------------------------

/**
 * O erro é "a página está velha", e não um defeito?
 *
 * A interface é dividida em pedaços carregados sob demanda, com o conteúdo no
 * nome do arquivo (`DailyClipping-CYfP2weM.js`). Depois de um deploy os nomes
 * mudam, e quem estava com a aba aberta segura um `index.html` que aponta para
 * arquivos que não existem mais: o primeiro clique num módulo ainda não
 * carregado falha.
 *
 * Não é bug, e "Tentar novamente" não resolve — remontar o componente refaz o
 * mesmo import para o mesmo endereço morto. O que resolve é recarregar, e é
 * isso que a tela precisa oferecer, com o motivo dito em português.
 */
function ehVersaoAntiga(error) {
  const m = `${error?.message || ''} ${error?.name || ''}`
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError|MIME type of "text\/html"/i.test(m)
}

/** Ponto único de envio de erros. Trocar por Sentry/Datadog em produção. */
export function reportError(error, info = {}) {
  const payload = {
    message: error?.message || String(error),
    stack: error?.stack,
    ...info,
    at: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.hash : undefined,
  }
  // eslint-disable-next-line no-console
  console.error('[DefesaBR] Erro capturado:', payload)
  return payload
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack, scope: this.props.scope })
    this.setState({ info })
  }

  reset = () => this.setState({ error: null, info: null, showDetails: false })

  render() {
    const { error, showDetails } = this.state
    const { children, scope, variant = 'page', fallback } = this.props
    if (!error) return children

    if (fallback) return typeof fallback === 'function' ? fallback(error, this.reset) : fallback

    const inline = variant === 'inline'
    const versaoAntiga = ehVersaoAntiga(error)

    return (
      <div
        role="alert"
        className={`card flex flex-col items-center gap-3 text-center ${inline ? 'p-6' : 'my-8 p-8 sm:p-12'}`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 dark:text-red-400">
          <AlertTriangle size={28} />
        </span>
        <h2 className={`font-bold tracking-tight ${inline ? 'text-base' : 'text-xl sm:text-2xl'}`}>
          {versaoAntiga
            ? 'Uma nova versão foi publicada'
            : inline ? 'Não foi possível carregar este bloco' : 'Algo saiu do previsto'}
        </h2>
        <p className="max-w-md text-sm muted">
          {versaoAntiga
            ? 'Esta aba está com a versão anterior da plataforma, cujos arquivos não existem mais no servidor. Recarregar resolve — nada do que você salvou se perde.'
            : scope
              ? `Ocorreu uma falha inesperada em “${scope}”. O restante da plataforma continua funcionando.`
              : 'Ocorreu uma falha inesperada ao montar esta tela. Nenhum dado foi perdido.'}
        </p>

        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {versaoAntiga ? (
            // Recarregar de verdade: remontar refaria o mesmo import morto.
            <button onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCw size={15} /> Recarregar a página
            </button>
          ) : (
            <button onClick={this.reset} className="btn-primary">
              <RefreshCw size={15} /> Tentar novamente
            </button>
          )}
          {!inline && (
            <a href="#/" className="btn-ghost">
              <Home size={15} /> Voltar ao início
            </a>
          )}
        </div>

        <button
          onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold muted hover:text-gray-300"
          aria-expanded={showDetails}
        >
          Detalhes técnicos
          <ChevronDown size={13} className={showDetails ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {showDetails && (
          <pre className="mt-1 max-h-40 w-full overflow-auto rounded-lg bg-black/30 p-3 text-left font-mono text-[11px] leading-relaxed text-red-300">
            {error?.message}
            {this.state.info?.componentStack}
          </pre>
        )}
      </div>
    )
  }
}
