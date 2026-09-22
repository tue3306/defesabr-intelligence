import { Link } from 'react-router-dom'
import { Shield, Github, Compass } from 'lucide-react'
import { useCan } from '../../auth/useCan'

// Os ícones de LinkedIn, X, YouTube e Instagram apontavam para a página inicial
// de cada rede — não há perfil do projeto em nenhuma delas. "Termos de Uso" e
// "Política de Privacidade" levavam à página Sobre, que não tinha nenhum dos
// dois; ela agora tem a seção "Dados e privacidade", e o link diz isso.

export default function Footer() {
  const can = useCan()
  // A visita guiada é de conta de usuário: quem administra não a recebe.
  const podeVerTour = can('news.read') && !can('admin.access')
  return (
    // pb extra no mobile para o botão flutuante de status não cobrir o rodapé
    <footer className="border-t border-white/[0.06] px-6 pb-24 pt-8 text-sm sm:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 muted">
          <Shield size={16} className="text-brand-400 dark:text-brand-300" />
          <span>DefesaBR Intelligence — {new Date().getFullYear()}</span>
        </div>

        <p className="order-last text-center text-xs muted sm:order-none">
          Projeto de código aberto. Agrega fontes públicas e cita a origem de cada dado — confira sempre o original.
        </p>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/tue3306/defesabr-intelligence"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 muted hover:text-brand-400 dark:text-brand-300"
          >
            <Github size={16} /> Repositório
          </a>
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-4 text-xs muted">
        <Link to="/sobre" className="hover:text-brand-400 dark:hover:text-brand-300">Sobre</Link>
        <span className="text-gray-600">·</span>
        <Link to="/metodologia" className="hover:text-brand-400 dark:hover:text-brand-300">Como decidimos</Link>
        <span className="text-gray-600">·</span>
        <Link to="/privacidade" className="hover:text-brand-400 dark:hover:text-brand-300">Privacidade e LGPD</Link>
        {podeVerTour && (
          <>
            <span className="text-gray-600">·</span>
            <button
              onClick={() => window.dispatchEvent(new Event('defesabr:open-tour'))}
              className="inline-flex items-center gap-1 hover:text-brand-400 dark:hover:text-brand-300"
            >
              <Compass size={12} /> Rever as boas-vindas
            </button>
          </>
        )}
      </div>
    </footer>
  )
}
