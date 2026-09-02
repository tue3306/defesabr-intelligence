// =============================================================================
// MESA DE TRABALHO DO ANALISTA — fila de produção, requisitos e plano de coleta
//
// Vocabulário do ciclo de inteligência, adaptado ao contexto brasileiro:
//   • RFI (Request for Information) — pedido formal de resposta a uma pergunta.
//   • PIR (Priority Intelligence Requirement) — prioridade permanente de coleta.
//   • EEI (Essential Element of Information) — o dado concreto que responde ao PIR.
//   • Lacuna de coleta — o que ainda não se sabe e nenhuma fonte cobre.
//
// Todos os itens são ILUSTRATIVOS.
// =============================================================================

export const PRODUCTION_STAGES = {
  rascunho: {
    id: 'rascunho',
    label: 'Rascunho',
    order: 1,
    classes: 'bg-white/10 text-gray-600 dark:text-gray-300 border-gray-400/30',
    dot: 'bg-gray-400',
    description: 'Em redação pelo analista responsável.',
  },
  revisao: {
    id: 'revisao',
    label: 'Em revisão',
    order: 2,
    classes: 'bg-military-amber/20 text-amber-700 dark:text-amber-300 border-military-amber/40',
    dot: 'bg-amber-400',
    description: 'Aguardando revisão de par ou do editor responsável.',
  },
  aprovado: {
    id: 'aprovado',
    label: 'Aprovado',
    order: 3,
    classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300 border-brand-400/30',
    dot: 'bg-brand-400',
    description: 'Revisado e liberado para publicação.',
  },
  publicado: {
    id: 'publicado',
    label: 'Publicado',
    order: 4,
    classes: 'bg-military-green/20 text-emerald-700 dark:text-emerald-300 border-military-green/40',
    dot: 'bg-emerald-400',
    description: 'Disponível para os perfis de leitura da plataforma.',
  },
}

export const PRIORITY = {
  urgente: { label: 'Urgente', classes: 'bg-military-red/20 text-red-600 dark:text-red-300', order: 1 },
  alta: { label: 'Alta', classes: 'bg-military-amber/20 text-amber-700 dark:text-amber-300', order: 2 },
  media: { label: 'Média', classes: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300', order: 3 },
  baixa: { label: 'Baixa', classes: 'bg-military-green/20 text-emerald-700 dark:text-emerald-300', order: 4 },
}

// -----------------------------------------------------------------------------
// FILA DE PRODUÇÃO — o que o Analista tem em mãos.
// -----------------------------------------------------------------------------
export const productionQueue = [
  {
    id: 'prod-2026-041',
    title: 'Dossiê — Consolidação de rotas ilícitas no Alto Solimões',
    type: 'Dossiê',
    stage: 'revisao',
    priority: 'alta',
    assignee: 'Ana Lima',
    reviewer: 'Carlos Bittencourt',
    due: '2026-08-27',
    updatedAt: '2026-08-23T16:40:00',
    progress: 78,
    module: '/dossies',
    sources: 14,
    summary:
      'Consolida seis meses de ocorrências, apreensões e movimentação fluvial na tríplice fronteira Brasil–Colômbia–Peru.',
  },
  {
    id: 'prod-2026-040',
    title: 'Briefing semanal — Amazônia Azul e tráfego suspeito na ZEE',
    type: 'Briefing',
    stage: 'aprovado',
    priority: 'media',
    assignee: 'Ana Lima',
    reviewer: 'Editoria',
    due: '2026-08-25',
    updatedAt: '2026-08-23T11:05:00',
    progress: 95,
    module: '/amazonia-azul',
    sources: 9,
    summary:
      'Síntese das ocorrências de AIS desligado e das operações de patrulha no trimestre.',
  },
  {
    id: 'prod-2026-039',
    title: 'Nota de avaliação — impacto cambial sobre o PROSUB',
    type: 'Nota',
    stage: 'rascunho',
    priority: 'alta',
    assignee: 'Ana Lima',
    reviewer: null,
    due: '2026-08-29',
    updatedAt: '2026-08-22T09:20:00',
    progress: 35,
    module: '/economia',
    sources: 7,
    summary:
      'Estima o efeito da variação cambial sobre o componente importado do programa e sobre o cronograma físico.',
  },
  {
    id: 'prod-2026-038',
    title: 'Alerta — cluster coordenado sobre soberania amazônica',
    type: 'Alerta',
    stage: 'publicado',
    priority: 'urgente',
    assignee: 'Ana Lima',
    reviewer: 'Carlos Bittencourt',
    due: '2026-08-21',
    updatedAt: '2026-08-21T18:50:00',
    progress: 100,
    module: '/narrativas',
    sources: 22,
    summary:
      'Identifica sincronia de publicação e reuso de imagens fora de contexto em três plataformas.',
  },
  {
    id: 'prod-2026-037',
    title: 'Perfil — Base Industrial de Defesa: fornecedores críticos',
    type: 'Dossiê',
    stage: 'rascunho',
    priority: 'media',
    assignee: 'Ana Lima',
    reviewer: null,
    due: '2026-09-04',
    updatedAt: '2026-08-20T14:15:00',
    progress: 20,
    module: '/industria',
    sources: 11,
    summary:
      'Mapeia dependências de componentes críticos por programa e alternativas de nacionalização.',
  },
  {
    id: 'prod-2026-036',
    title: 'Clipping diário — edição de 24/08',
    type: 'Clipping',
    stage: 'revisao',
    priority: 'urgente',
    assignee: 'Ana Lima',
    reviewer: 'Editoria',
    due: '2026-08-24',
    updatedAt: '2026-08-24T07:30:00',
    progress: 60,
    module: '/clipping',
    sources: 18,
    summary: 'Consolidação das ocorrências das últimas 24 horas com nível de alerta atribuído.',
  },
]

// -----------------------------------------------------------------------------
// REQUISITOS DE INFORMAÇÃO (RFI) — perguntas formais dirigidas à equipe.
// -----------------------------------------------------------------------------
export const informationRequests = [
  {
    id: 'rfi-2026-118',
    question:
      'Qual o efeito estimado da reprogramação orçamentária de 2026 sobre a entrega do quarto submarino do PROSUB?',
    requester: 'Assessoria de Planejamento',
    priority: 'alta',
    status: 'em_analise',
    opened: '2026-08-18',
    due: '2026-08-30',
    assignee: 'Ana Lima',
    pir: 'pir-programas',
    answers: 2,
  },
  {
    id: 'rfi-2026-117',
    question:
      'Há indícios de coordenação entre as narrativas sobre soberania amazônica e atores extrarregionais?',
    requester: 'Núcleo de Comunicação Estratégica',
    priority: 'urgente',
    status: 'em_analise',
    opened: '2026-08-20',
    due: '2026-08-26',
    assignee: 'Ana Lima',
    pir: 'pir-fimi',
    answers: 1,
  },
  {
    id: 'rfi-2026-115',
    question:
      'Qual a evolução trimestral das ocorrências de pesca ilegal (IUU) no limite externo da ZEE?',
    requester: 'Comando de Operações Navais',
    priority: 'media',
    status: 'respondido',
    opened: '2026-08-05',
    due: '2026-08-19',
    assignee: 'Ana Lima',
    pir: 'pir-amazonia-azul',
    answers: 3,
  },
  {
    id: 'rfi-2026-112',
    question:
      'Que fornecedores de sensores embarcados apresentam maior risco de descontinuidade nos próximos 18 meses?',
    requester: 'Diretoria de Aquisições',
    priority: 'alta',
    status: 'aguardando_fonte',
    opened: '2026-07-29',
    due: '2026-09-02',
    assignee: 'Ana Lima',
    pir: 'pir-bid',
    answers: 0,
  },
  {
    id: 'rfi-2026-109',
    question:
      'Qual o padrão sazonal das travessias irregulares no segmento oeste da faixa de fronteira?',
    requester: 'Coordenação de Fronteiras',
    priority: 'media',
    status: 'respondido',
    opened: '2026-07-14',
    due: '2026-08-08',
    assignee: 'Ana Lima',
    pir: 'pir-fronteiras',
    answers: 4,
  },
]

export const RFI_STATUS = {
  em_analise: { label: 'Em análise', classes: 'bg-military-amber/20 text-amber-700 dark:text-amber-300' },
  respondido: { label: 'Respondido', classes: 'bg-military-green/20 text-emerald-700 dark:text-emerald-300' },
  aguardando_fonte: { label: 'Aguardando fonte', classes: 'bg-white/10 text-gray-600 dark:text-gray-300' },
  cancelado: { label: 'Cancelado', classes: 'bg-military-red/15 text-red-600 dark:text-red-300' },
}

// -----------------------------------------------------------------------------
// PLANO DE COLETA — prioridades permanentes (PIR) e suas lacunas.
// -----------------------------------------------------------------------------
export const collectionPlan = [
  {
    id: 'pir-fronteiras',
    pir: 'Presença e capacidade do crime organizado transnacional na faixa de fronteira',
    module: '/fronteiras',
    coverage: 82,
    sources: 12,
    eei: [
      'Rotas fluviais e terrestres em uso ativo',
      'Pistas de pouso clandestinas detectadas por sensoriamento',
      'Volume e composição das apreensões por operação',
    ],
    gaps: ['Dados municipais de apreensão desagregados por rota'],
    lastUpdate: '2026-08-22',
  },
  {
    id: 'pir-amazonia-azul',
    pir: 'Atividade ilegal e vulnerabilidade de infraestrutura na Amazônia Azul',
    module: '/amazonia-azul',
    coverage: 68,
    sources: 9,
    eei: [
      'Embarcações com AIS desligado no limite da ZEE',
      'Incidentes com cabos submarinos e dutos',
      'Cobertura de patrulha naval e aérea por trimestre',
    ],
    gaps: ['Série histórica de AIS anterior a 2024', 'Registro consolidado de incidentes com cabos'],
    lastUpdate: '2026-08-23',
  },
  {
    id: 'pir-programas',
    pir: 'Execução física e financeira dos programas estratégicos de defesa',
    module: '/programas',
    coverage: 91,
    sources: 15,
    eei: [
      'Execução orçamentária por programa (GND 4)',
      'Marcos contratuais entregues e reprogramados',
      'Índice de nacionalização por contrato',
    ],
    gaps: ['Cronograma físico atualizado do Tamandaré'],
    lastUpdate: '2026-08-24',
  },
  {
    id: 'pir-fimi',
    pir: 'Campanhas coordenadas de manipulação informacional sobre temas de defesa',
    module: '/narrativas',
    coverage: 74,
    sources: 18,
    eei: [
      'Sincronia temporal de publicação entre clusters',
      'Reuso de mídia fora de contexto',
      'Origem declarada versus origem inferida das contas',
    ],
    gaps: ['Acesso a APIs de plataformas fechadas'],
    lastUpdate: '2026-08-23',
  },
  {
    id: 'pir-bid',
    pir: 'Resiliência da Base Industrial de Defesa e dependências críticas',
    module: '/industria',
    coverage: 57,
    sources: 8,
    eei: [
      'Prazo de fornecimento de componentes críticos',
      'Licenças de exportação negadas ou atrasadas',
      'Capacidade instalada de fornecedores de segundo nível',
    ],
    gaps: [
      'Mapeamento de fornecedores de segundo e terceiro nível',
      'Estoques estratégicos declarados por programa',
    ],
    lastUpdate: '2026-08-19',
  },
  {
    id: 'pir-cyber',
    pir: 'Ameaças cibernéticas a órgãos públicos e infraestrutura crítica',
    module: '/dados',
    coverage: 79,
    sources: 14,
    eei: [
      'Credenciais governamentais expostas',
      'Famílias de ransomware ativas na região',
      'Tempo médio de contenção reportado',
    ],
    gaps: ['Incidentes não reportados por entes subnacionais'],
    lastUpdate: '2026-08-24',
  },
]

/** Consolidação para os cartões de indicador da mesa de trabalho. */
export const workbenchSummary = (() => {
  const open = productionQueue.filter((p) => p.stage !== 'publicado')
  const review = productionQueue.filter((p) => p.stage === 'revisao')
  const openRfi = informationRequests.filter((r) => r.status !== 'respondido' && r.status !== 'cancelado')
  const avgCoverage = Math.round(
    collectionPlan.reduce((a, c) => a + c.coverage, 0) / collectionPlan.length
  )
  const totalGaps = collectionPlan.reduce((a, c) => a + c.gaps.length, 0)
  return {
    open: open.length,
    inReview: review.length,
    published: productionQueue.filter((p) => p.stage === 'publicado').length,
    openRfi: openRfi.length,
    urgentRfi: openRfi.filter((r) => r.priority === 'urgente').length,
    avgCoverage,
    totalGaps,
  }
})()
