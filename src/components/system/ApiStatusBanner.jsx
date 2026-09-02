import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { ping } from '../../services'

// -----------------------------------------------------------------------------
// FAIXA DE STATUS DA API
//
// Existe para separar dois casos que, sem ela, produzem a mesma tela vazia:
//
//   "não há resultado para esta consulta"   ← comportamento normal
//   "o servidor não está no ar"             ← problema de infraestrutura
//
// Confundir os dois é o que faz alguém passar meia hora depurando uma query
// quando esqueceu de rodar `npm run dev:api`. Por isso a mensagem diz o
// comando exato.
// -----------------------------------------------------------------------------
export default function ApiStatusBanner() {
  const [offline, setOffline] = useState(false)
  const [dispensado, setDispensado] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const verificar = async () => {
    setVerificando(true)
    const r = await ping()
    setOffline(!r.online)
    if (r.online) setDispensado(false)
    setVerificando(false)
  }

  useEffect(() => {
    verificar()
    // Reconsulta a cada 30s enquanto estiver fora: assim a faixa some sozinha
    // quando o servidor volta, sem exigir recarga da página.
    const t = setInterval(verificar, 30_000)
    return () => clearInterval(t)
  }, [])

  if (!offline || dispensado) return null

  return (
    <div role="alert" className="sticky top-0 z-[60] border-b border-red-500/30 bg-red-500/10 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
        <AlertTriangle size={16} className="shrink-0 text-red-500 dark:text-red-400" />
        <p className="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
          <strong>A API não está respondendo.</strong>{' '}
          <span className="muted">
            Suba o servidor com{' '}
            <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs dark:bg-white/10">
              npm run dev:api
            </code>
            {' '}— sem ele a interface não tem de onde ler.
          </span>
        </p>
        <button onClick={verificar} disabled={verificando} className="btn-ghost shrink-0 px-2.5 py-1 text-xs">
          {verificando ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Tentar de novo
        </button>
        <button
          onClick={() => setDispensado(true)}
          className="shrink-0 rounded p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          aria-label="Dispensar aviso"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
