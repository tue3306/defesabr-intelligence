// =============================================================================
// MATRIZ DE RISCOS ESTRATÉGICOS — foco Brasil
//
// Metodologia inspirada em ISO 31000 (probabilidade × impacto) com horizonte
// temporal e confiança da avaliação declarados, como em produtos maduros de
// inteligência estratégica. Todos os valores são ILUSTRATIVOS.
//
// probability / impact: 1 (muito baixo) a 5 (muito alto)
// severity derivada: probability × impact  →  faixa
// confidence: 'alta' | 'media' | 'baixa'  (força da base de evidências)
// trend: 'up' | 'flat' | 'down'           (direção nos últimos 90 dias)
// =============================================================================

export const riskCategories = [
  { id: 'soberania', label: 'Soberania & Território', color: '#2e7d46' },
  { id: 'cibernetico', label: 'Cibernético', color: '#8b5cf6' },
  { id: 'economico', label: 'Econômico & Industrial', color: '#c0392b' },
  { id: 'informacional', label: 'Informacional', color: '#d4841a' },
  { id: 'regional', label: 'Regional & Diplomático', color: '#caa733' },
  { id: 'infraestrutura', label: 'Infraestrutura Crítica', color: '#475569' },
]

export const RISK_SEVERITY = {
  critico: { label: 'Crítico', min: 20, classes: 'bg-military-red/20 text-red-800 dark:text-red-300 border-military-red/40', color: '#c0392b' },
  alto: { label: 'Alto', min: 12, classes: 'bg-military-amber/20 text-amber-800 dark:text-amber-300 border-military-amber/40', color: '#d4841a' },
  moderado: { label: 'Moderado', min: 6, classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40', color: '#caa733' },
  baixo: { label: 'Baixo', min: 0, classes: 'bg-military-green/20 text-emerald-800 dark:text-emerald-300 border-military-green/40', color: '#2e7d46' },
}

/** Faixa de severidade a partir do produto probabilidade × impacto. */
export function severityFor(probability, impact) {
  const score = probability * impact
  if (score >= RISK_SEVERITY.critico.min) return 'critico'
  if (score >= RISK_SEVERITY.alto.min) return 'alto'
  if (score >= RISK_SEVERITY.moderado.min) return 'moderado'
  return 'baixo'
}

const build = (r) => ({
  ...r,
  score: r.probability * r.impact,
  severity: severityFor(r.probability, r.impact),
})

export const riskMatrix = [
  build({
    id: 'risk-cyber-gov',
    title: 'Ataque cibernético a serviços públicos essenciais',
    category: 'cibernetico',
    probability: 4,
    impact: 4,
    horizon: '0–6 meses',
    confidence: 'alta',
    trend: 'up',
    owner: 'Cibersegurança',
    description:
      'Campanhas de ransomware e intrusão contra órgãos federais, estaduais e operadores de serviços essenciais, com sequestro de dados e interrupção de atendimento ao cidadão.',
    drivers: [
      'Superfície de ataque ampliada pela digitalização de serviços',
      'Heterogeneidade de maturidade entre os entes federativos',
      'Mercado de acesso inicial (initial access brokers) ativo na região',
    ],
    indicators: [
      'Aumento de credenciais governamentais expostas em fóruns',
      'Varreduras em massa contra portais .gov.br',
      'Incidentes reportados a CSIRTs setoriais',
    ],
    mitigations: [
      'Segmentação de rede e autenticação multifator obrigatória',
      'Exercícios periódicos de resposta a incidentes com as forças-tarefa',
      'Compartilhamento de indicadores entre CTIR Gov e setores regulados',
    ],
    impactBR:
      'Interrupção de serviços ao cidadão, custo fiscal de recuperação e erosão da confiança institucional. Efeito indireto sobre a cadeia de suprimentos de defesa.',
  }),
  build({
    id: 'risk-fronteira-norte',
    title: 'Expansão do crime organizado transnacional na fronteira norte',
    category: 'soberania',
    probability: 5,
    impact: 4,
    horizon: '0–12 meses',
    confidence: 'alta',
    trend: 'up',
    owner: 'Fronteiras & Amazônia',
    description:
      'Consolidação de rotas de narcotráfico, garimpo ilegal e contrabando na faixa de fronteira amazônica, com disputa territorial entre facções e pressão sobre terras indígenas.',
    drivers: [
      'Extensão da faixa de fronteira e baixa densidade de presença estatal',
      'Rentabilidade do ouro ilegal e da cocaína andina',
      'Cooperação limitada com países vizinhos em áreas remotas',
    ],
    indicators: [
      'Variação no número de pistas clandestinas detectadas',
      'Apreensões por operação integrada acima da média histórica',
      'Deslocamento de populações ribeirinhas',
    ],
    mitigations: [
      'Ampliação do SISFRON e integração com sensoriamento remoto',
      'Operações interagências permanentes (Ágata/Catrimani)',
      'Acordos operacionais bilaterais com Colômbia, Peru e Venezuela',
    ],
    impactBR:
      'Custo humano e ambiental elevado, pressão sobre saúde e segurança pública regionais e desafio direto ao monopólio estatal da força em áreas remotas.',
  }),
  build({
    id: 'risk-orcamento',
    title: 'Descontinuidade orçamentária dos programas estratégicos',
    category: 'economico',
    probability: 4,
    impact: 5,
    horizon: '12–36 meses',
    confidence: 'media',
    trend: 'flat',
    owner: 'Economia & Defesa',
    description:
      'Contingenciamentos sucessivos e reprogramação de cronogramas em programas de longo ciclo (PROSUB, FX-2, Tamandaré), elevando custo total e adiando entregas.',
    drivers: [
      'Rigidez do orçamento federal e peso das despesas obrigatórias',
      'Câmbio pressionando contratos com componente importado',
      'Ciclos políticos mais curtos que os ciclos de aquisição',
    ],
    indicators: [
      'Execução do investimento (GND 4) abaixo do empenhado',
      'Aditivos contratuais por reprogramação',
      'Variação do dólar acima da premissa dos contratos',
    ],
    mitigations: [
      'Orçamento plurianual protegido para programas de Estado',
      'Nacionalização progressiva para reduzir exposição cambial',
      'Contratos com marcos de entrega e cláusulas de reajuste previsíveis',
    ],
    impactBR:
      'Encarecimento real dos programas, perda de janela tecnológica e desmobilização de engenharia especializada na base industrial.',
  }),
  build({
    id: 'risk-fimi',
    title: 'Campanhas coordenadas de manipulação informacional (FIMI)',
    category: 'informacional',
    probability: 4,
    impact: 3,
    horizon: '0–6 meses',
    confidence: 'media',
    trend: 'up',
    owner: 'Monitor de Narrativas',
    description:
      'Operações de influência estrangeira e doméstica que exploram temas sensíveis — Amazônia, soberania e Forças Armadas — para corroer a confiança institucional.',
    drivers: [
      'Baixo custo de produção e distribuição de conteúdo sintético',
      'Polarização do debate público sobre temas de defesa',
      'Automação de contas e redes de amplificação',
    ],
    indicators: [
      'Picos de publicação sincronizados fora do fuso local',
      'Reuso de imagens fora de contexto por clusters de contas',
      'Convergência súbita de hashtags entre plataformas distintas',
    ],
    mitigations: [
      'Monitoramento contínuo com classificação de origem',
      'Comunicação institucional proativa e verificável',
      'Educação midiática e transparência de dados oficiais',
    ],
    impactBR:
      'Deterioração do debate público sobre defesa, pressão sobre decisões de política externa e desgaste da imagem das instituições.',
  }),
  build({
    id: 'risk-amazonia-azul',
    title: 'Atividade ilegal e vulnerabilidade na Amazônia Azul',
    category: 'soberania',
    probability: 3,
    impact: 4,
    horizon: '6–24 meses',
    confidence: 'media',
    trend: 'up',
    owner: 'Amazônia Azul',
    description:
      'Pesca ilegal não declarada e não regulamentada (IUU), tráfego suspeito e exposição de cabos submarinos e plataformas do pré-sal na Zona Econômica Exclusiva.',
    drivers: [
      'Extensão de 5,7 milhões de km² de ZEE e plataforma continental estendida',
      'Frotas pesqueiras distantes operando no limite da ZEE',
      'Concentração de infraestrutura energética e de dados no litoral',
    ],
    indicators: [
      'Embarcações com AIS desligado próximo à ZEE',
      'Ocorrências registradas por patrulha naval e aérea',
      'Incidentes com cabos submarinos e dutos',
    ],
    mitigations: [
      'Ampliação do SisGAAz e da vigilância por satélite',
      'Patrulha oceânica com navios-patrulha e aeronaves de asa fixa',
      'Cooperação com estados costeiros do Atlântico Sul (ZOPACAS)',
    ],
    impactBR:
      'Perda econômica direta em recursos pesqueiros e energéticos, além do risco de interrupção de tráfego de dados internacionais.',
  }),
  build({
    id: 'risk-dependencia',
    title: 'Dependência tecnológica em componentes críticos',
    category: 'economico',
    probability: 4,
    impact: 4,
    horizon: '12–36 meses',
    confidence: 'alta',
    trend: 'flat',
    owner: 'Base Industrial de Defesa',
    description:
      'Sensores, semicondutores, materiais compostos e software embarcado dependentes de fornecedores estrangeiros sujeitos a controle de exportação.',
    drivers: [
      'Concentração global da cadeia de semicondutores',
      'Regimes de controle de exportação (ITAR e equivalentes)',
      'Escala reduzida do mercado nacional para itens especializados',
    ],
    indicators: [
      'Prazos de entrega de componentes críticos',
      'Índice de nacionalização por programa',
      'Pedidos de licença de exportação negados ou atrasados',
    ],
    mitigations: [
      'Programas de nacionalização com metas contratuais',
      'Parcerias de transferência de tecnologia com offset',
      'Estoque estratégico de itens de longo prazo de fornecimento',
    ],
    impactBR:
      'Risco de paralisação de linhas de produção e perda de autonomia decisória em cenários de crise internacional.',
  }),
  build({
    id: 'risk-infra-energia',
    title: 'Vulnerabilidade de infraestrutura crítica de energia',
    category: 'infraestrutura',
    probability: 3,
    impact: 5,
    horizon: '6–18 meses',
    confidence: 'media',
    trend: 'flat',
    owner: 'Infraestrutura Crítica',
    description:
      'Exposição de sistemas de controle industrial (SCADA/ICS) do setor elétrico e de óleo e gás a intrusões e a eventos físicos extremos.',
    drivers: [
      'Convergência entre redes corporativas e de automação',
      'Ativos legados com ciclo de vida longo e difícil atualização',
      'Eventos climáticos extremos mais frequentes',
    ],
    indicators: [
      'Tentativas de acesso a protocolos industriais expostos',
      'Interrupções não programadas acima da média',
      'Tempo médio de recuperação de subestações',
    ],
    mitigations: [
      'Segregação entre TI e TA com monitoramento dedicado',
      'Planos de continuidade testados com o setor regulado',
      'Redundância física em pontos de concentração',
    ],
    impactBR:
      'Interrupção em cascata sobre serviços essenciais, com efeito imediato sobre economia, saúde e mobilidade.',
  }),
  build({
    id: 'risk-regional',
    title: 'Instabilidade política em vizinhos sul-americanos',
    category: 'regional',
    probability: 3,
    impact: 3,
    horizon: '6–24 meses',
    confidence: 'media',
    trend: 'flat',
    owner: 'Balança Militar',
    description:
      'Crises institucionais e disputas territoriais na vizinhança, com potencial de fluxo migratório desordenado e militarização de contenciosos.',
    drivers: [
      'Contenciosos territoriais não resolvidos na região',
      'Fragilidade fiscal e social em países vizinhos',
      'Presença de atores extrarregionais em projetos estratégicos',
    ],
    indicators: [
      'Movimentação de meios militares próximo a fronteiras',
      'Fluxo migratório nas principais entradas terrestres',
      'Retórica oficial sobre contenciosos históricos',
    ],
    mitigations: [
      'Diplomacia de defesa e medidas de confiança mútua',
      'Exercícios combinados e canais militares diretos',
      'Preparo de resposta humanitária integrada',
    ],
    impactBR:
      'Pressão sobre fronteiras e sobre serviços públicos em estados limítrofes, além de custo diplomático de mediação.',
  }),
]

/** Distribuição de riscos por faixa de severidade. */
export const riskSummary = (() => {
  const bySeverity = riskMatrix.reduce((acc, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1
    return acc
  }, {})
  const rising = riskMatrix.filter((r) => r.trend === 'up').length
  const avgScore = Math.round((riskMatrix.reduce((a, r) => a + r.score, 0) / riskMatrix.length) * 10) / 10
  return { total: riskMatrix.length, bySeverity, rising, avgScore }
})()

export const RISK_METHODOLOGY = [
  'Probabilidade (1–5): chance de materialização no horizonte declarado.',
  'Impacto (1–5): consequência sobre interesses estratégicos brasileiros.',
  'Severidade = probabilidade × impacto, classificada em quatro faixas.',
  'Confiança: força da base de evidências que sustenta a avaliação.',
  'Tendência: direção observada nos últimos 90 dias de monitoramento.',
]
