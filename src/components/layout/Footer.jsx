import { Link } from 'react-router-dom'
import { Shield, Github, ExternalLink } from 'lucide-react'
import { APP_VERSION } from '../../services/config'

const REPO = 'https://github.com/tue3306/defesabr-intelligence'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 px-6 py-8 text-sm dark:border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 muted">
          <Shield size={16} className="text-brand-400" />
          <span>DefesaBR Intelligence v{APP_VERSION} — {new Date().getFullYear()}</span>
        </div>

        {/* A ressalva que a plataforma precisa carregar: ela AGREGA fonte
            pública, não produz análise. Confundir os dois é o erro que este
            tipo de sistema mais facilmente induz. */}
        <p className="max-w-md text-xs leading-relaxed muted">
          Agregador de fontes públicas para fins acadêmicos. Não produz análise —
          confira sempre a fonte original antes de usar qualquer informação.
        </p>

        <div className="flex items-center gap-4 text-xs">
          <Link to="/status" className="muted transition-colors hover:text-gold-600 dark:hover:text-gold-400">
            Status
          </Link>
          <Link to="/sobre" className="muted transition-colors hover:text-gold-600 dark:hover:text-gold-400">
            Sobre
          </Link>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 muted transition-colors hover:text-gold-600 dark:hover:text-gold-400"
          >
            <Github size={13} /> Código <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </footer>
  )
}
