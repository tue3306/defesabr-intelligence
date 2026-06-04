import { Shield, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-700/50 px-6 py-6 text-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 muted">
          <Shield size={16} className="text-brand-400" />
          <span>DefesaBR Intelligence — {new Date().getFullYear()}</span>
        </div>
        <p className="text-center text-xs muted">
          Site demonstrativo. Análises geradas por IA não substituem análise especializada humana.
        </p>
        <a
          href="https://github.com/SEU-USUARIO/defesabr-intelligence"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 muted hover:text-brand-400"
        >
          <Github size={16} /> Repositório
        </a>
      </div>
    </footer>
  )
}
