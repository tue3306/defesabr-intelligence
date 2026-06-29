// -----------------------------------------------------------------------------
// PLANOS DE ASSINATURA (Sprint 1) — Explorar · Profissional · Institucional.
// Decisões de produto: removida a "trava de 1 área"; "Profissional" é o
// recomendado; preço anual com ~17% de economia; Institucional como âncora B2B.
// Valores demonstrativos (sem cobrança real).
// -----------------------------------------------------------------------------

export const PLANS = [
  {
    id: 'explorar',
    name: 'Explorar',
    icon: 'Compass',
    monthly: 0,
    annualMonthly: 0,
    priceLabel: 'R$ 0',
    period: 'para sempre',
    tagline: 'Conheça o cenário de defesa do Brasil.',
    cta: 'Começar grátis',
    features: [
      'Notícias e mapa de risco',
      'Painel de situação (essencial)',
      'Centro Educacional e glossário',
      'Prévia de dossiês e análises',
    ],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    icon: 'Crosshair',
    recommended: true,
    monthly: 89,
    annualMonthly: 74, // ~17% de economia no plano anual
    priceLabel: 'R$ 89',
    period: '/mês',
    tagline: 'Inteligência completa para quem decide.',
    cta: 'Assinar agora',
    features: [
      'Tudo do Explorar',
      'Todas as 5 áreas de análise',
      'Análise semanal + cenários',
      'Dossiês completos e Monitor de Narrativas',
      'Gerar e exportar (PDF/CSV) com IA',
      'Alertas personalizados e Minha Pasta',
    ],
  },
  {
    id: 'institucional',
    name: 'Institucional',
    icon: 'Building2',
    contact: true,
    priceLabel: 'Sob consulta',
    period: 'equipes e órgãos',
    tagline: 'Para equipes, empresas e órgãos públicos.',
    cta: 'Falar com especialistas',
    features: [
      'Tudo do Profissional',
      'Múltiplos usuários (assentos)',
      'Papéis e gestão de usuários',
      'Onboarding e suporte prioritário',
      'Exportações com identidade própria',
      'Integrações / SSO (roadmap)',
    ],
  },
]

export const PLAN_LABEL = { explorar: 'Explorar', profissional: 'Profissional', institucional: 'Institucional' }

// Tabela comparativa (expansível na página de planos).
export const PLAN_COMPARISON = [
  {
    group: 'Conteúdo',
    rows: [
      { label: 'Notícias e mapa de risco', explorar: true, profissional: true, institucional: true },
      { label: 'Centro Educacional e glossário', explorar: 'Essencial', profissional: 'Completo', institucional: 'Completo' },
      { label: 'Todas as 5 áreas de análise', explorar: false, profissional: true, institucional: true },
      { label: 'Análise semanal e cenários', explorar: false, profissional: true, institucional: true },
      { label: 'Dossiês "Em Foco"', explorar: 'Prévia', profissional: true, institucional: true },
    ],
  },
  {
    group: 'Produção de inteligência',
    rows: [
      { label: 'Gerar clipping/análise com IA', explorar: false, profissional: true, institucional: true },
      { label: 'Exportar PDF / CSV', explorar: false, profissional: true, institucional: true },
      { label: 'Alertas personalizados e Minha Pasta', explorar: false, profissional: true, institucional: true },
      { label: 'Confiabilidade de fontes e narrativas', explorar: false, profissional: true, institucional: true },
    ],
  },
  {
    group: 'Equipe e governança',
    rows: [
      { label: 'Usuários', explorar: '1', profissional: '1', institucional: '5–∞' },
      { label: 'Gestão de papéis e usuários', explorar: false, profissional: false, institucional: true },
      { label: 'Suporte prioritário e onboarding', explorar: false, profissional: false, institucional: true },
      { label: 'Integrações / SSO', explorar: false, profissional: false, institucional: 'Roadmap' },
    ],
  },
]

export const PLAN_FAQ = [
  { q: 'Posso trocar de plano quando quiser?', a: 'Sim. Upgrade e downgrade são imediatos. Nesta demonstração, a troca apenas simula o acesso na interface.' },
  { q: 'Existe fidelidade ou multa?', a: 'Não. Cancele quando quiser, sem fidelidade. (Demonstração: nenhuma cobrança é realizada.)' },
  { q: 'Qual a diferença entre papel e plano?', a: 'Papel é o que você pode FAZER (Usuário ou Administrador). Plano é o quanto você pode VER e produzir (Explorar, Profissional, Institucional).' },
  { q: 'O plano anual compensa?', a: 'Sim: no anual o mês sai por ~R$ 74 — cerca de 17% de economia frente ao mensal.' },
  { q: 'Os números exibidos são reais?', a: 'Não. Todos os dados, indicadores e cenários são ilustrativos/demonstrativos.' },
]

// Áreas temáticas (perspectivas de análise) — todas liberadas no plano pago.
export const SUBSCRIPTION_AREAS = [
  { id: 'academico', label: 'Acadêmica', icon: 'GraduationCap', color: '#0d9488', desc: 'Pesquisa, estudos estratégicos e produção científica.' },
  { id: 'investimento', label: 'Investimentos', icon: 'TrendingUp', color: '#2e7d46', desc: 'Risco-país, impacto de conflitos e oportunidades.' },
  { id: 'comercial', label: 'Comercial/Industrial', icon: 'Factory', color: '#caa733', desc: 'Cadeias produtivas, comércio exterior e indústria.' },
  { id: 'empresarial', label: 'Empresarial', icon: 'Briefcase', color: '#475569', desc: 'Inteligência competitiva e riscos corporativos.' },
  { id: 'diplomatico', label: 'Diplomática', icon: 'Globe', color: '#8b5cf6', desc: 'Relações internacionais e posicionamento do Brasil.' },
]

// "Por que usar este site?" — diferenciais exibidos na landing.
export const LANDING_FEATURES = [
  { icon: 'Newspaper', title: 'Clipping diário com IA', text: 'Notícias de defesa reunidas, resumidas e classificadas por urgência automaticamente.' },
  { icon: 'Globe2', title: 'Panorama global de risco', text: 'Mapa de calor com a intensidade de eventos por país e a relação de cada um com o Brasil.' },
  { icon: 'BarChart3', title: 'Cenários estratégicos', text: 'Análises semanais com cenários base, otimista e adverso — e recomendações por perfil.' },
  { icon: 'LineChart', title: 'Dados militares e econômicos', text: 'Gastos de defesa, câmbio e indicadores setoriais em gráficos atualizados.' },
  { icon: 'GraduationCap', title: 'Centro educacional', text: 'Glossário e quiz para quem está começando em defesa, geopolítica e cibersegurança.' },
  { icon: 'ShieldCheck', title: 'Fontes confiáveis', text: 'Agregação de fontes públicas e institucionais de Segurança e Defesa do Brasil.' },
]
