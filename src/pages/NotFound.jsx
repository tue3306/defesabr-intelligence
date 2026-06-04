import { Link } from 'react-router-dom'
import { ShieldAlert, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <ShieldAlert size={56} className="text-brand-400" />
      <h1 className="mt-4 text-5xl font-extrabold tracking-tight">404</h1>
      <p className="mt-2 text-lg muted">Página não encontrada nesta zona de operações.</p>
      <Link to="/" className="btn-primary mt-6">
        <Home size={16} /> Voltar ao Dashboard
      </Link>
    </div>
  )
}
