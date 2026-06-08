import { Link } from 'react-router-dom'
import { Shield, Github, Linkedin, Twitter, Youtube, Instagram, Compass } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const SOCIALS = [
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com' },
  { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com' },
]

export default function Footer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return (
    // pb extra no mobile para o botão flutuante de status não cobrir o rodapé
    <footer className="border-t border-gray-700/50 px-6 pb-24 pt-6 text-sm sm:pb-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 muted">
          <Shield size={16} className="text-brand-400" />
          <span>DefesaBR Intelligence — {new Date().getFullYear()}</span>
        </div>

        <p className="order-last text-center text-xs muted sm:order-none">
          Site demonstrativo. Análises geradas por IA não substituem análise especializada humana.
        </p>

        <div className="flex items-center gap-3">
          {SOCIALS.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className="muted hover:text-brand-400"
            >
              <Icon size={17} />
            </a>
          ))}
          <span className="h-4 w-px bg-gray-600/40" />
          <a
            href="https://github.com/tue3306/defesabr-intelligence"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 muted hover:text-brand-400"
          >
            <Github size={16} /> Repositório
          </a>
        </div>
      </div>

      {/* [ALTERADO] Links legais/institucionais */}
      <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gray-700/40 pt-4 text-xs muted">
        <Link to="/sobre" className="hover:text-brand-400">Sobre</Link>
        <span className="text-gray-600">·</span>
        <Link to="/sobre" className="hover:text-brand-400">Termos de Uso</Link>
        <span className="text-gray-600">·</span>
        <Link to="/sobre" className="hover:text-brand-400">Política de Privacidade</Link>
        <span className="text-gray-600">·</span>
        <Link to="/planos" className="hover:text-brand-400">Planos</Link>
        {isAuthenticated && (
          <>
            <span className="text-gray-600">·</span>
            <button
              onClick={() => window.dispatchEvent(new Event('defesabr:open-tour'))}
              className="inline-flex items-center gap-1 hover:text-brand-400"
            >
              <Compass size={12} /> Rever tour guiado
            </button>
          </>
        )}
      </div>
    </footer>
  )
}
