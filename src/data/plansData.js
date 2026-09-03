// -----------------------------------------------------------------------------
// PLANOS DE ASSINATURA — Explorar · Profissional · Institucional.
//
// Os PREÇOS são demonstrativos e nenhuma cobrança acontece. Os RECURSOS, não:
// cada linha desta tabela precisa corresponder a algo que a plataforma faz.
//
// Ela vendia "Gerar clipping/análise com IA", "Dossiês completos e Monitor de
// Narrativas" e "Análise semanal + cenários". Nenhum dos três existe — a IA
// nunca foi ligada e as telas de produção editorial foram removidas por
// exibirem texto escrito à mão. Prometer numa página de preço o que não se
// entrega é a única coisa aqui que seria indefensável numa apresentação.
//
// Quem mexer nisto: antes de acrescentar uma linha, abra a tela que a cumpre.
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
      'Clipping diário do acervo coletado',
      'Painel de situação e nível de alerta',
      'Cobertura por país e busca no acervo',
      'Centro Educacional e glossário',
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
      'Radar legislativo (Câmara, dados abertos)',
      'Séries econômicas e industriais completas',
      'Exportar PDF e CSV de qualquer painel',
      'Filtros avançados e alertas por área',
      'Modo apresentação',
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
      'Papéis verificados no servidor (Analista, Admin)',
      'Monitoramento da coleta e auditoria do filtro',
      'Console de governança e diagnóstico',
      'Múltiplos usuários (assentos)',
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
      { label: 'Clipping diário e cobertura por país', explorar: true, profissional: true, institucional: true },
      { label: 'Centro Educacional e glossário', explorar: 'Essencial', profissional: 'Completo', institucional: 'Completo' },
      { label: 'Busca e arquivo do acervo', explorar: true, profissional: true, institucional: true },
      { label: 'Radar legislativo (Câmara)', explorar: false, profissional: true, institucional: true },
      { label: 'Séries econômicas e industriais', explorar: 'Resumo', profissional: 'Completo', institucional: 'Completo' },
    ],
  },
  {
    group: 'Ferramentas',
    rows: [
      { label: 'Exportar PDF / CSV', explorar: false, profissional: true, institucional: true },
      { label: 'Filtros avançados e alertas por área', explorar: false, profissional: true, institucional: true },
      { label: 'Modo apresentação', explorar: false, profissional: true, institucional: true },
      // Dependem do PAPEL, não do plano: são ferramentas de trabalho do
      // Analista. A coluna diz isso em vez de um marcador que faria o assinante
      // esperar acesso que a assinatura não dá.
      { label: 'Confiabilidade das fontes', explorar: false, profissional: 'Papel Analista', institucional: 'Papel Analista' },
      { label: 'Método do filtro e execuções da coleta', explorar: false, profissional: 'Papel Analista', institucional: 'Papel Analista' },
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
  { q: 'Qual a diferença entre papel e plano?', a: 'Papel é o que você pode FAZER: Usuário consulta, Analista monitora a coleta e audita o filtro, Administrador governa a plataforma. Plano é o quanto você pode VER (Explorar, Profissional, Institucional). Os eixos são independentes, e o papel é verificado no servidor — não é o menu escondido que protege as áreas restritas.' },
  { q: 'O plano anual compensa?', a: 'Sim: no anual o mês sai por ~R$ 74 — cerca de 17% de economia frente ao mensal.' },
  { q: 'Os números exibidos são reais?', a: 'Sim. As notícias são coletadas de feeds públicos oficiais pelo servidor; os indicadores econômicos vêm do Banco Central (SGS), do World Bank e do Comex Stat; as proposições, dos Dados Abertos da Câmara. Cada painel declara a origem da sua série e, quando a fonte não responde, mostra a ausência em vez de um valor plausível. Os PREÇOS desta página é que são demonstrativos: não há cobrança.' },
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
  { icon: 'Newspaper', title: 'Clipping diário', text: 'Notícias coletadas de feeds oficiais, filtradas por relevância e classificadas por urgência — sem IA e sem redação humana no meio.' },
  { icon: 'Globe2', title: 'Panorama global de risco', text: 'Mapa de calor com a intensidade de eventos por país e a relação de cada um com o Brasil.' },
  { icon: 'BarChart3', title: 'Método auditável', text: 'A regra que decide o que entra no acervo é publicada e pode ser aplicada a qualquer texto, com os termos que casaram.' },
  { icon: 'LineChart', title: 'Dados militares e econômicos', text: 'Gastos de defesa, câmbio e indicadores setoriais em gráficos atualizados.' },
  { icon: 'GraduationCap', title: 'Centro educacional', text: 'Glossário e quiz para quem está começando em defesa, geopolítica e cibersegurança.' },
  { icon: 'ShieldCheck', title: 'Fontes confiáveis', text: 'Agregação de fontes públicas e institucionais de Segurança e Defesa do Brasil.' },
]
