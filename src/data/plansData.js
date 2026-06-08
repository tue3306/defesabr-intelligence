// -----------------------------------------------------------------------------
// PLANOS DE ASSINATURA, ÁREAS e DESTAQUES da página inicial (demonstrativo)
// -----------------------------------------------------------------------------

// [ALTERADO] Áreas de interesse do plano "Simples" — as 5 perspectivas da
// plataforma (escolhe apenas UMA; as demais ficam bloqueadas neste plano).
export const SUBSCRIPTION_AREAS = [
  { id: 'academico', label: 'Acadêmica', icon: 'GraduationCap', color: '#2b6cb0', desc: 'Análises voltadas à pesquisa, estudos estratégicos e produção científica em segurança e defesa.' },
  { id: 'investimento', label: 'Investimentos', icon: 'TrendingUp', color: '#2e7d46', desc: 'Indicadores de risco-país, impacto de conflitos em mercados e oportunidades em defesa.' },
  { id: 'comercial', label: 'Comercial/Industrial', icon: 'Factory', color: '#caa733', desc: 'Impactos geopolíticos em cadeias produtivas, comércio exterior e setor industrial.' },
  { id: 'empresarial', label: 'Empresarial', icon: 'Briefcase', color: '#13315c', desc: 'Inteligência competitiva, riscos corporativos e contexto de segurança para negócios.' },
  { id: 'diplomatico', label: 'Diplomática', icon: 'Globe', color: '#8b5cf6', desc: 'Relações internacionais, acordos, tensões diplomáticas e posicionamento do Brasil.' },
]

export const PLANS = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    price: 'R$ 0',
    period: 'para sempre',
    tagline: 'Para começar a acompanhar o cenário de defesa.',
    features: ['Notícias gerais de defesa', 'Mini glossário', 'Mapa global de risco', 'Painel público'],
    notIncluded: ['Análises e briefings', 'Cenários estratégicos', 'Exportar relatórios'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    id: 'simples',
    name: 'Simples',
    price: 'R$ 49',
    period: 'por mês',
    tagline: 'Foco total em UMA área de interesse.',
    features: ['Tudo do Gratuito', 'Análises de uma área à sua escolha', 'Briefings da área escolhida', 'Glossário completo'],
    notIncluded: ['Acesso às demais áreas'],
    cta: 'Assinar Simples',
    highlight: true,
    requiresArea: true,
  },
  {
    id: 'completo',
    name: 'Completo',
    price: 'R$ 99',
    period: 'por mês',
    tagline: 'Inteligência estratégica sem limites.',
    features: ['Tudo do Simples', 'TODAS as áreas, sem restrição', 'Cenários e análise semanal', 'Exportar PDF e CSV', 'Alertas prioritários'],
    notIncluded: [],
    cta: 'Assinar Completo',
    highlight: false,
  },
]

// "Por que usar este site?" — diferenciais exibidos na landing (item 2.1).
export const LANDING_FEATURES = [
  { icon: 'Newspaper', title: 'Clipping diário com IA', text: 'Notícias de defesa reunidas, resumidas e classificadas por urgência automaticamente.' },
  { icon: 'Globe2', title: 'Panorama global de risco', text: 'Mapa de calor com a intensidade de eventos por país e a relação de cada um com o Brasil.' },
  { icon: 'BarChart3', title: 'Cenários estratégicos', text: 'Análises semanais com cenários base, otimista e adverso — e recomendações por perfil.' },
  { icon: 'LineChart', title: 'Dados militares e econômicos', text: 'Gastos de defesa, câmbio e indicadores setoriais em gráficos atualizados.' },
  { icon: 'GraduationCap', title: 'Centro educacional', text: 'Glossário e quiz para quem está começando em defesa, geopolítica e cibersegurança.' },
  { icon: 'ShieldCheck', title: 'Fontes confiáveis', text: 'Agregação de fontes públicas e institucionais de Segurança e Defesa do Brasil.' },
]
