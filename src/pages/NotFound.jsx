import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft, Home, Newspaper, Activity } from 'lucide-react'

// A versão anterior tinha mais páginas. Um link antigo que caia aqui merece
// saber o que aconteceu, não só um "404" seco — e a explicação é a mesma que a
// plataforma dá em toda parte: o que dependia de análise humana ou de IA foi
// removido em vez de mantido com conteúdo de exemplo.
const REMOVIDAS = {
  '/dossies': 'Dossiês exigiam contas e redação de analista — fora do escopo desta etapa.',
  '/riscos': 'A matriz de riscos exigia avaliação humana; sem autoria registrada, não existe.',
  '/narrativas': 'O monitor de narrativas exigia classificação por analista.',
  '/analise': 'A análise semanal exigia um modelo de linguagem.',
  '/mesa': 'A mesa de trabalho exigia contas de usuário.',
  '/relatorios': 'A composição de relatórios dependia de conteúdo analítico que não existe mais.',
  '/conta': 'Não há contas nesta versão: a plataforma é aberta.',
  '/configuracoes': 'A única preferência que restou — o tema — fica na própria barra superior.',
  '/notificacoes': 'As notificações dependiam de contas de usuário.',
  '/amazonia-azul': 'A página era conteúdo curado apresentado como inteligência. O tema aparece agora no mapa de cobertura e no clipping, com notícia real.',
  '/fronteiras': 'A página era conteúdo curado. O tema aparece agora no mapa de cobertura, derivado das notícias coletadas.',
  '/industria': 'A página era conteúdo curado. Notícias de indústria de defesa aparecem no clipping, na categoria Indústria.',
  '/programas': 'A página era conteúdo curado sobre programas estratégicos, sem fonte que o sustentasse.',
  '/calendario': 'A agenda exigia uma fonte confiável de eventos, que não existe entre as fontes públicas usadas.',
}

export default function NotFound() {
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const explicacao = REMOVIDAS[pathname]

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Compass size={44} className="text-gold-500" />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
        {explicacao ? 'Esta página não existe mais' : 'Página não encontrada'}
      </h1>

      <p className="mt-2 max-w-lg text-sm leading-relaxed muted">
        {explicacao || 'O endereço acessado não corresponde a nenhuma tela desta versão.'}
      </p>

      <code className="mt-3 rounded bg-white/10 px-2 py-1 font-mono text-xs muted">{pathname}</code>

      {explicacao && (
        <p className="mt-4 max-w-lg text-xs leading-relaxed muted">
          O painel de status lista, com a mesma seriedade, o que existe e o que não existe nesta
          instalação.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={() => navegar(-1)} className="btn-ghost text-sm">
          <ArrowLeft size={15} /> Voltar
        </button>
        <Link to="/" className="btn-primary text-sm"><Home size={15} /> Início</Link>
        <Link to="/clipping" className="btn-ghost text-sm"><Newspaper size={15} /> Clipping</Link>
        <Link to="/status" className="btn-ghost text-sm"><Activity size={15} /> Status</Link>
      </div>
    </div>
  )
}
