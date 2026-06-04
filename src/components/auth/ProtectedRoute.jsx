import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import LoginModal from './LoginModal'

// Bloqueia o conteúdo até o usuário autenticar (modo demo).
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [open, setOpen] = useState(false)

  if (isAuthenticated) return children

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-military-amber/15 text-amber-400">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Área restrita</h2>
        <p className="mt-2 text-sm muted">
          Esta seção requer autenticação. Entre com a conta demo para acessar o clipping e as análises.
        </p>
        <button onClick={() => setOpen(true)} className="btn-primary mt-5 w-full">
          Entrar para continuar
        </button>
      </div>
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
