// =============================================================================
// DADOS DE DEMONSTRAÇÃO REALISTAS — DefesaBR Intelligence
// Tudo aqui serve de fallback quando as APIs externas / Claude falham ou
// quando não há chave de API configurada. Valores aproximam dados reais
// (SIPRI, World Bank, Banco Central), mas são ILUSTRATIVOS.
//
// IMPORTANTE: os enums (urgency, alert_level, status, type, impact, level)
// são CHAVES de lógica e permanecem sem acento. Os rótulos exibidos recebem
// acento em textUtils.js. As categorias abaixo são exibidas diretamente e
// devem casar com as chaves de `categoryColors` em textUtils.js.
// =============================================================================

export const CATEGORIES = [
  'Forças Armadas',
  'Cibersegurança',
  'Fronteiras',
  'Indústria',
  'Diplomacia',
  'Orçamento',
  'Inteligência',
]

export const URGENCY_LEVELS = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']

export const ALERT_LEVELS = ['NORMAL', 'ATENCAO', 'ALERTA', 'CRITICO']

// Fontes RSS monitoradas (status simulado)
export const RSS_SOURCES = [
  { id: 'defesagov', name: 'Defesa.gov.br', url: 'https://www.defesa.gov.br/noticias.rss', enabled: true, status: 'online' },
  { id: 'poder360', name: 'Poder360 — Defesa', url: 'https://www.poder360.com.br/defesa/feed/', enabled: true, status: 'online' },
  { id: 'aerospacial', name: 'Revista Aerospacial', url: 'https://revistaaerospacial.com.br/feed/', enabled: true, status: 'online' },
  { id: 'brasildefesa', name: 'Brasil Defesa', url: 'https://www.brasildefesa.com.br/?format=feed&type=rss', enabled: false, status: 'offline' },
  { id: 'ggn', name: 'Jornal GGN — Defesa', url: 'https://jornalggn.com.br/tag/defesa/feed/', enabled: true, status: 'online' },
]

// -----------------------------------------------------------------------------
// NOTÍCIAS DE HOJE (brutas, antes da IA)
// -----------------------------------------------------------------------------
export const todayNews = [
  {
    id: 1,
    title: 'Marinha do Brasil recebe segundo submarino da classe Riachuelo',
    source: 'Defesa.gov.br',
    url: 'https://www.defesa.gov.br/noticias',
    category: 'Forças Armadas',
    urgency: 'MEDIO',
    date: '2026-06-04T09:30:00',
    summary:
      'Em cerimônia no Arsenal de Marinha no Rio de Janeiro, a Marinha do Brasil incorporou o segundo submarino convencional da classe Riachuelo, construído no âmbito do Programa de Desenvolvimento de Submarinos (PROSUB), em parceria com a Naval Group francesa.',
    key_points: [
      'Segundo dos quatro submarinos convencionais previstos no PROSUB',
      'Custo estimado de R$ 2,3 bilhões por unidade',
      'Capacidade de operar por até 45 dias sem reabastecer',
    ],
    impact_br:
      'Reforça a capacidade de dissuasão marítima brasileira no Atlântico Sul e aumenta a proteção das reservas do pré-sal.',
    actors: ['Marinha do Brasil', 'Naval Group', 'Ministério da Defesa'],
    region: 'Atlântico Sul',
  },
  {
    id: 2,
    title: 'Governo anuncia nova Estratégia Nacional de Cibersegurança para 2026',
    source: 'Poder360',
    url: 'https://www.poder360.com.br/defesa',
    category: 'Cibersegurança',
    urgency: 'ALTO',
    date: '2026-06-04T08:10:00',
    summary:
      'O Gabinete de Segurança Institucional (GSI) apresentou a nova Estratégia Nacional de Cibersegurança, com foco na proteção de infraestruturas críticas e na criação de um centro nacional de resposta a incidentes.',
    key_points: [
      'Investimento previsto de R$ 1,1 bilhão em quatro anos',
      'Criação de um CERT nacional integrado',
      'Cooperação com o setor privado e universidades',
    ],
    impact_br:
      'Eleva a maturidade cibernética do país frente ao aumento de ataques a órgãos públicos e ao setor financeiro.',
    actors: ['GSI', 'Ministério da Defesa', 'Setor financeiro'],
    region: 'Brasil',
  },
  {
    id: 3,
    title: 'Embraer fecha contrato para venda de seis cargueiros C-390 a país europeu',
    source: 'Revista Aerospacial',
    url: 'https://revistaaerospacial.com.br',
    category: 'Indústria',
    urgency: 'ALTO',
    date: '2026-06-04T07:45:00',
    summary:
      'A Embraer Defesa & Segurança confirmou a assinatura de contrato para o fornecimento de seis aeronaves multimissão C-390 Millennium a uma força aérea europeia, ampliando a carteira internacional do programa.',
    key_points: [
      'Contrato estimado em US$ 1,8 bilhão, incluindo suporte logístico',
      'Sexto cliente internacional do C-390',
      'Geração de empregos qualificados em Gavião Peixoto (SP)',
    ],
    impact_br:
      'Fortalece a base industrial de defesa brasileira e a balança comercial do setor aeroespacial.',
    actors: ['Embraer', 'Força Aérea europeia', 'FAB'],
    region: 'Europa / Brasil',
  },
  {
    id: 4,
    title: 'Operação integrada reforça segurança na faixa de fronteira amazônica',
    source: 'Defesa.gov.br',
    url: 'https://www.defesa.gov.br/noticias',
    category: 'Fronteiras',
    urgency: 'MEDIO',
    date: '2026-06-03T18:20:00',
    summary:
      'As Forças Armadas, em conjunto com a Polícia Federal, deflagraram nova fase da Operação Ágata na região de fronteira com a Colômbia e o Peru, com foco no combate ao narcotráfico e ao garimpo ilegal.',
    key_points: [
      'Mais de 3.500 militares mobilizados',
      'Apreensão de armas, drogas e equipamentos de garimpo',
      'Uso de drones e radares para vigilância',
    ],
    impact_br:
      'Amplia o controle estatal sobre regiões remotas e pressiona cadeias do crime organizado transnacional.',
    actors: ['Exército Brasileiro', 'Polícia Federal', 'FAB'],
    region: 'Amazônia',
  },
  {
    id: 5,
    title: 'Brasil e Argentina retomam cooperação em defesa cibernética regional',
    source: 'Jornal GGN',
    url: 'https://jornalggn.com.br',
    category: 'Diplomacia',
    urgency: 'BAIXO',
    date: '2026-06-03T15:00:00',
    summary:
      'Em reunião bilateral em Brasília, os ministérios da defesa do Brasil e da Argentina assinaram memorando de entendimento para intercâmbio de informações sobre ameaças cibernéticas e treinamento conjunto.',
    key_points: [
      'Memorando prevê exercícios conjuntos anuais',
      'Compartilhamento de inteligência sobre ameaças',
      'Alinhamento no âmbito do Mercosul',
    ],
    impact_br:
      'Aprofunda a integração regional em defesa e cria postura comum frente a ameaças digitais.',
    actors: ['Ministério da Defesa', 'Argentina', 'Mercosul'],
    region: 'América do Sul',
  },
  {
    id: 6,
    title: 'Comissão do Senado aprova reajuste no orçamento de reaparelhamento das Forças',
    source: 'Poder360',
    url: 'https://www.poder360.com.br/defesa',
    category: 'Orçamento',
    urgency: 'MEDIO',
    date: '2026-06-03T11:30:00',
    summary:
      'A Comissão de Relações Exteriores e Defesa Nacional aprovou parecer favorável ao reajuste de recursos destinados a projetos estratégicos das Forças Armadas no orçamento do próximo exercício.',
    key_points: [
      'Acréscimo de R$ 4,2 bilhões para projetos estratégicos',
      'Prioridade para programas já em andamento',
      'Texto segue para votação em plenário',
    ],
    impact_br:
      'Dá previsibilidade orçamentária a programas de longo prazo, como PROSUB, FX-2 e Guarani.',
    actors: ['Senado Federal', 'Ministério da Defesa', 'Forças Armadas'],
    region: 'Brasil',
  },
]

// -----------------------------------------------------------------------------
// CLIPPING DIÁRIO COMPLETO (fallback do formato gerado pela IA)
// -----------------------------------------------------------------------------
export const mockDailyClipping = {
  date: '04/06/2026',
  generatedAt: '2026-06-04T10:05:00',
  source: 'demo',
  summary_executive:
    'O dia foi marcado pela consolidação de programas estratégicos da Marinha e da indústria aeroespacial, com a incorporação do segundo submarino da classe Riachuelo e novo contrato internacional do C-390. No campo cibernético, o governo lançou a nova Estratégia Nacional de Cibersegurança, sinalizando prioridade à proteção de infraestruturas críticas. Na dimensão regional, Brasil e Argentina retomaram a cooperação em defesa cibernética, enquanto operações de fronteira reforçaram o combate a ilícitos transnacionais na Amazônia.\n\nO conjunto de eventos aponta para uma agenda de fortalecimento da base industrial de defesa e de maturidade cibernética, com impacto positivo na dissuasão e na integração regional. O nível de alerta permanece em ATENÇÃO, sem eventos de ruptura.',
  news: [
    {
      id: 1,
      title: 'Marinha incorpora segundo submarino da classe Riachuelo (PROSUB)',
      source: 'Defesa.gov.br',
      url: 'https://www.defesa.gov.br/noticias',
      category: 'Forças Armadas',
      urgency: 'MEDIO',
      summary:
        'A Marinha do Brasil incorporou o segundo submarino convencional da classe Riachuelo, no Rio de Janeiro. A unidade integra o PROSUB, parceria com a Naval Group. O programa avança na meta de quatro submarinos convencionais e um de propulsão nuclear.',
      key_points: [
        'Segundo de quatro submarinos convencionais do PROSUB',
        'Custo de aproximadamente R$ 2,3 bilhões por unidade',
        'Autonomia de até 45 dias submerso',
      ],
      impact_br:
        'Reforça a dissuasão no Atlântico Sul e a proteção das reservas do pré-sal e da Amazônia Azul.',
      actors: ['Marinha do Brasil', 'Naval Group', 'Ministério da Defesa'],
      region: 'Atlântico Sul',
    },
    {
      id: 2,
      title: 'Governo lança Estratégia Nacional de Cibersegurança 2026',
      source: 'Poder360',
      url: 'https://www.poder360.com.br/defesa',
      category: 'Cibersegurança',
      urgency: 'ALTO',
      summary:
        'O GSI apresentou a nova estratégia cibernética nacional, com foco na proteção de infraestruturas críticas e na criação de um CERT nacional. O plano prevê R$ 1,1 bilhão em quatro anos e cooperação público-privada.',
      key_points: [
        'Investimento de R$ 1,1 bilhão até 2030',
        'CERT nacional integrado',
        'Parceria com o setor privado e a academia',
      ],
      impact_br:
        'Eleva a resiliência do país frente ao crescimento de ataques a órgãos públicos e ao sistema financeiro.',
      actors: ['GSI', 'Ministério da Defesa', 'Setor financeiro'],
      region: 'Brasil',
    },
    {
      id: 3,
      title: 'Embraer vende seis C-390 Millennium a força aérea europeia',
      source: 'Revista Aerospacial',
      url: 'https://revistaaerospacial.com.br',
      category: 'Indústria',
      urgency: 'ALTO',
      summary:
        'A Embraer confirmou contrato de seis cargueiros multimissão C-390 para um país europeu, com pacote de suporte logístico estimado em US$ 1,8 bilhão. É o sexto cliente internacional do programa.',
      key_points: [
        'Contrato de aproximadamente US$ 1,8 bilhão',
        'Sexto cliente internacional do C-390',
        'Empregos qualificados em Gavião Peixoto (SP)',
      ],
      impact_br:
        'Fortalece a base industrial de defesa e a balança comercial do setor aeroespacial.',
      actors: ['Embraer', 'FAB', 'Força Aérea europeia'],
      region: 'Europa / Brasil',
    },
    {
      id: 4,
      title: 'Operação Ágata reforça segurança na fronteira amazônica',
      source: 'Defesa.gov.br',
      url: 'https://www.defesa.gov.br/noticias',
      category: 'Fronteiras',
      urgency: 'MEDIO',
      summary:
        'Forças Armadas e Polícia Federal deflagraram nova fase da Operação Ágata na tríplice fronteira, mobilizando mais de 3.500 militares contra narcotráfico e garimpo ilegal, com uso de drones e radares.',
      key_points: [
        'Mais de 3.500 militares mobilizados',
        'Apreensões de armas, drogas e equipamentos',
        'Vigilância com drones e radares',
      ],
      impact_br:
        'Amplia a presença estatal em regiões remotas e pressiona o crime organizado transnacional.',
      actors: ['Exército Brasileiro', 'Polícia Federal', 'FAB'],
      region: 'Amazônia',
    },
    {
      id: 5,
      title: 'Brasil e Argentina retomam cooperação em defesa cibernética',
      source: 'Jornal GGN',
      url: 'https://jornalggn.com.br',
      category: 'Diplomacia',
      urgency: 'BAIXO',
      summary:
        'Os ministérios da defesa de Brasil e Argentina assinaram memorando para intercâmbio de inteligência cibernética e exercícios conjuntos anuais, no âmbito da integração do Mercosul.',
      key_points: [
        'Exercícios conjuntos anuais',
        'Compartilhamento de inteligência',
        'Alinhamento no Mercosul',
      ],
      impact_br:
        'Aprofunda a integração regional em defesa e cria postura comum frente a ameaças digitais.',
      actors: ['Ministério da Defesa', 'Argentina', 'Mercosul'],
      region: 'América do Sul',
    },
  ],
  trends: [
    'Aceleração de programas navais estratégicos',
    'Prioridade crescente à cibersegurança de infraestrutura crítica',
    'Internacionalização da indústria aeroespacial brasileira',
    'Integração regional em defesa cibernética',
  ],
  alert_level: 'ATENCAO',
  editor_note:
    'A agenda do dia reforça a tendência de médio prazo de fortalecimento da base industrial de defesa e da postura cibernética nacional. Recomenda-se monitorar a tramitação orçamentária, que sustenta a continuidade dos programas estratégicos.',
}

// -----------------------------------------------------------------------------
// ANÁLISE SEMANAL (fallback por perspectiva)
// -----------------------------------------------------------------------------
const baseWeekly = (focus) => ({
  focus,
  week: 'Semana de 01 a 07 de Junho de 2026',
  source: 'demo',
  context: {
    events_monitored: 38,
    active_regions: ['Atlântico Sul', 'Amazônia', 'América do Sul', 'Europa'],
    tension_level: 42, // 0-100
  },
  scenarios: [
    {
      type: 'BASE',
      probability: 60,
      title: 'Continuidade dos programas estratégicos',
      description:
        'Manutenção do ritmo atual de execução de programas (PROSUB, C-390, Guarani), com estabilidade orçamentária e ambiente regional cooperativo.',
      factors: [
        'Aprovação orçamentária favorável',
        'Demanda internacional pelo C-390',
        'Cooperação regional estável',
      ],
      monitor: ['Execução orçamentária trimestral', 'Câmbio USD/BRL', 'Tramitação no Congresso'],
    },
    {
      type: 'OTIMISTA',
      probability: 25,
      title: 'Aceleração e novos contratos de exportação',
      description:
        'Fechamento de novos contratos internacionais e ampliação de investimentos em cibersegurança elevam a base industrial de defesa acima do esperado.',
      factors: [
        'Novos clientes para o C-390',
        'Câmbio favorável à exportação',
        'Parcerias público-privadas em cyber',
      ],
      monitor: ['Anúncios de contratos', 'Índice de confiança industrial', 'Investimento estrangeiro'],
    },
    {
      type: 'ADVERSO',
      probability: 15,
      title: 'Contingenciamento e tensão regional',
      description:
        'Cortes orçamentários e/ou escalada de tensões na região atrasam programas e reduzem a capacidade de resposta.',
      factors: [
        'Contingenciamento fiscal',
        'Escalada de ilícitos na fronteira',
        'Volatilidade cambial elevada',
      ],
      monitor: ['Decretos de contingenciamento', 'Incidentes de fronteira', 'Volatilidade do câmbio'],
    },
  ],
  opportunities: [
    { title: 'Exportação de C-390 e aeronaves de treinamento', probability: 'Alta', impact: 'Alto' },
    { title: 'Parcerias em cibersegurança com o setor privado', probability: 'Média', impact: 'Alto' },
    { title: 'Cooperação tecnológica regional (Mercosul)', probability: 'Média', impact: 'Médio' },
  ],
  risks: [
    { title: 'Contingenciamento orçamentário', probability: 'Média', impact: 'Alto' },
    { title: 'Volatilidade cambial em aquisições', probability: 'Alta', impact: 'Médio' },
    { title: 'Ameaças cibernéticas à infraestrutura', probability: 'Média', impact: 'Alto' },
  ],
  recommendations: {
    'Gestores públicos':
      'Priorizar a previsibilidade orçamentária dos programas estratégicos e acelerar a estratégia cibernética.',
    'Empresas do setor':
      'Posicionar-se para oportunidades de exportação e parcerias em cibersegurança; monitorar editais.',
    Pesquisadores:
      'Aprofundar estudos sobre dissuasão no Atlântico Sul e políticas de ciberdefesa comparadas.',
    Investidores:
      'Acompanhar contratos de exportação e câmbio; setor aeroespacial com momentum positivo.',
  },
  indicators: [
    { name: 'Gastos militares BR', value: 'R$ 121 bi', target: '< R$ 130 bi', status: 'NORMAL' },
    { name: 'Câmbio USD/BRL', value: 'R$ 5,42', target: '< R$ 5,80', status: 'NORMAL' },
    { name: 'Incidentes cibernéticos (gov)', value: '+12% m/m', target: 'estável', status: 'ATENCAO' },
    { name: 'Contratos de exportação', value: '2 no mês', target: '>= 1', status: 'NORMAL' },
    { name: 'Tensão regional', value: '42/100', target: '< 50', status: 'NORMAL' },
  ],
  timeline: [
    { date: '01/06', title: 'Reunião bilateral Brasil-Argentina (cyber)', category: 'Diplomacia', impact: 'BAIXO' },
    { date: '02/06', title: 'Audiência no Senado sobre orçamento de defesa', category: 'Orçamento', impact: 'MEDIO' },
    { date: '03/06', title: 'Nova fase da Operação Ágata na fronteira', category: 'Fronteiras', impact: 'MEDIO' },
    { date: '03/06', title: 'Contrato Embraer C-390 com cliente europeu', category: 'Indústria', impact: 'ALTO' },
    { date: '04/06', title: 'Incorporação do 2º submarino Riachuelo', category: 'Forças Armadas', impact: 'MEDIO' },
    { date: '04/06', title: 'Lançamento da Estratégia de Cibersegurança', category: 'Cibersegurança', impact: 'ALTO' },
  ],
  topics: [
    { text: 'PROSUB', weight: 9 },
    { text: 'C-390', weight: 8 },
    { text: 'Cibersegurança', weight: 8 },
    { text: 'Embraer', weight: 7 },
    { text: 'Fronteira', weight: 6 },
    { text: 'Orçamento', weight: 6 },
    { text: 'Atlântico Sul', weight: 5 },
    { text: 'Mercosul', weight: 5 },
    { text: 'Submarino', weight: 5 },
    { text: 'Amazônia', weight: 4 },
    { text: 'Exportação', weight: 4 },
    { text: 'Naval Group', weight: 3 },
    { text: 'GSI', weight: 3 },
    { text: 'Dissuasão', weight: 3 },
    { text: 'Drones', weight: 2 },
  ],
})

export const FOCUS_AREAS = [
  { id: 'academico', label: 'Acadêmica', icon: 'GraduationCap' },
  { id: 'investimento', label: 'Investimentos', icon: 'TrendingUp' },
  { id: 'comercial', label: 'Comercial/Ind.', icon: 'Factory' },
  { id: 'empresarial', label: 'Empresarial', icon: 'Briefcase' },
  { id: 'diplomatico', label: 'Diplomática', icon: 'Globe' },
]

export const mockWeeklyAnalysis = FOCUS_AREAS.reduce((acc, f) => {
  acc[f.id] = baseWeekly(f.id)
  return acc
}, {})

// -----------------------------------------------------------------------------
// VOLUME DE NOTÍCIAS — ÚLTIMOS 14 DIAS (por categoria)
// -----------------------------------------------------------------------------
export const newsVolume14d = (() => {
  const days = []
  const base = new Date('2026-06-04T00:00:00')
  const cats = ['Forças Armadas', 'Cibersegurança', 'Fronteiras', 'Indústria', 'Diplomacia', 'Orçamento']
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const row = { date: label }
    let total = 0
    cats.forEach((c, idx) => {
      const v = Math.round(2 + Math.abs(Math.sin(i * 1.3 + idx)) * 9)
      row[c] = v
      total += v
    })
    row.total = total
    days.push(row)
  }
  return days
})()

export const newsCategoriesKeys = [
  'Forças Armadas',
  'Cibersegurança',
  'Fronteiras',
  'Indústria',
  'Diplomacia',
  'Orçamento',
]

// -----------------------------------------------------------------------------
// GASTOS MILITARES — BRASIL (2010-2024) — valores ilustrativos
// brl = bilhões de reais; usd = bilhões de USD; pctGdp = % do PIB
// -----------------------------------------------------------------------------
export const militarySpendingBR = [
  { year: 2010, brl: 60.2, usd: 34.1, pctGdp: 1.6 },
  { year: 2011, brl: 63.5, usd: 37.9, pctGdp: 1.5 },
  { year: 2012, brl: 66.1, usd: 35.0, pctGdp: 1.4 },
  { year: 2013, brl: 70.8, usd: 32.9, pctGdp: 1.4 },
  { year: 2014, brl: 74.2, usd: 31.7, pctGdp: 1.4 },
  { year: 2015, brl: 78.0, usd: 24.6, pctGdp: 1.4 },
  { year: 2016, brl: 84.1, usd: 24.2, pctGdp: 1.3 },
  { year: 2017, brl: 88.7, usd: 27.8, pctGdp: 1.4 },
  { year: 2018, brl: 92.3, usd: 25.4, pctGdp: 1.5 },
  { year: 2019, brl: 96.0, usd: 24.4, pctGdp: 1.5 },
  { year: 2020, brl: 99.5, usd: 19.7, pctGdp: 1.4 },
  { year: 2021, brl: 104.2, usd: 19.2, pctGdp: 1.2 },
  { year: 2022, brl: 109.8, usd: 20.2, pctGdp: 1.1 },
  { year: 2023, brl: 115.4, usd: 22.9, pctGdp: 1.1 },
  { year: 2024, brl: 121.0, usd: 23.7, pctGdp: 1.2 },
]

// Períodos de governo para zonas coloridas no gráfico
export const govPeriods = [
  { label: 'Lula II', from: 2010, to: 2010, color: 'rgba(74,124,89,0.10)' },
  { label: 'Dilma', from: 2011, to: 2016, color: 'rgba(26,138,184,0.10)' },
  { label: 'Temer', from: 2016, to: 2018, color: 'rgba(212,132,26,0.10)' },
  { label: 'Bolsonaro', from: 2019, to: 2022, color: 'rgba(192,57,43,0.10)' },
  { label: 'Lula III', from: 2023, to: 2024, color: 'rgba(74,124,89,0.10)' },
]

// -----------------------------------------------------------------------------
// COMPARAÇÃO INTERNACIONAL — % do PIB (ano mais recente)
// -----------------------------------------------------------------------------
export const militaryPctGdpComparison = [
  { country: 'EUA', code: 'US', pctGdp: 3.4 },
  { country: 'Rússia', code: 'RU', pctGdp: 5.9 },
  { country: 'China', code: 'CN', pctGdp: 1.7 },
  { country: 'França', code: 'FR', pctGdp: 2.1 },
  { country: 'Reino Unido', code: 'GB', pctGdp: 2.3 },
  { country: 'Alemanha', code: 'DE', pctGdp: 1.5 },
  { country: 'Brasil', code: 'BR', pctGdp: 1.2 },
]

// Gastos absolutos globais (USD bilhões) — para Treemap
export const globalSpendingTreemap = [
  { name: 'EUA', value: 916 },
  { name: 'China', value: 296 },
  { name: 'Rússia', value: 109 },
  { name: 'Índia', value: 83 },
  { name: 'Arábia Saudita', value: 75 },
  { name: 'Reino Unido', value: 74 },
  { name: 'Alemanha', value: 67 },
  { name: 'França', value: 61 },
  { name: 'Brasil', value: 24 },
  { name: 'Outros', value: 420 },
]

// -----------------------------------------------------------------------------
// AMÉRICA DO SUL — % do PIB em defesa
// -----------------------------------------------------------------------------
export const southAmericaSpending = [
  { country: 'Colômbia', code: 'CO', pctGdp: 3.0 },
  { country: 'Equador', code: 'EC', pctGdp: 2.3 },
  { country: 'Chile', code: 'CL', pctGdp: 1.9 },
  { country: 'Bolívia', code: 'BO', pctGdp: 1.5 },
  { country: 'Uruguai', code: 'UY', pctGdp: 1.9 },
  { country: 'Brasil', code: 'BR', pctGdp: 1.2 },
  { country: 'Peru', code: 'PE', pctGdp: 1.2 },
  { country: 'Argentina', code: 'AR', pctGdp: 0.8 },
  { country: 'Paraguai', code: 'PY', pctGdp: 1.0 },
  { country: 'Venezuela', code: 'VE', pctGdp: 0.5 },
]

// -----------------------------------------------------------------------------
// CÂMBIO USD/BRL — ÚLTIMOS 30 DIAS (ilustrativo)
// -----------------------------------------------------------------------------
export const usdBrl30d = (() => {
  const out = []
  let v = 5.38
  const base = new Date('2026-06-04T00:00:00')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    v += (Math.sin(i / 3) + (Math.random() - 0.5)) * 0.03
    v = Math.max(5.1, Math.min(5.7, v))
    out.push({
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      value: Number(v.toFixed(3)),
    })
  }
  return out
})()

export const mockExchangeLast = {
  USDBRL: { code: 'USD', codein: 'BRL', name: 'Dólar/Real', bid: '5.4210', pctChange: '-0.34' },
  EURBRL: { code: 'EUR', codein: 'BRL', name: 'Euro/Real', bid: '5.8930', pctChange: '0.12' },
}

// -----------------------------------------------------------------------------
// AÇÕES DO SETOR DE DEFESA
// -----------------------------------------------------------------------------
export const defenseStocks = [
  { ticker: 'EMBR3.SA', name: 'Embraer', price: 38.42, change: 1.8, spark: [36.1, 36.8, 37.0, 37.5, 38.0, 38.1, 38.42] },
  { ticker: 'BA', name: 'Boeing', price: 182.15, change: -0.6, spark: [185, 184.2, 183.5, 184, 183.1, 182.6, 182.15] },
  { ticker: 'RTX', name: 'RTX (Raytheon)', price: 121.7, change: 0.9, spark: [119, 119.8, 120.5, 120.2, 121, 121.3, 121.7] },
  { ticker: 'LMT', name: 'Lockheed Martin', price: 462.3, change: 0.4, spark: [458, 459, 460.5, 461, 460.2, 461.8, 462.3] },
  { ticker: 'NOC', name: 'Northrop Grumman', price: 478.9, change: -0.3, spark: [481, 480.2, 479.5, 480, 479.1, 479.4, 478.9] },
]

// -----------------------------------------------------------------------------
// RADAR — volume por categoria (semana atual x anterior)
// -----------------------------------------------------------------------------
export const categoryRadar = [
  { category: 'Forças Armadas', atual: 28, anterior: 22 },
  { category: 'Cibersegurança', atual: 24, anterior: 15 },
  { category: 'Fronteiras', atual: 18, anterior: 20 },
  { category: 'Indústria', atual: 21, anterior: 17 },
  { category: 'Diplomacia', atual: 14, anterior: 16 },
  { category: 'Orçamento', atual: 19, anterior: 12 },
]

// -----------------------------------------------------------------------------
// ÍNDICE DE ALERTA (0-100)
// -----------------------------------------------------------------------------
export const alertIndex = 42

// -----------------------------------------------------------------------------
// ATIVIDADE POR PAÍS (heatmap) — ISO A3 -> intensidade 0-100
// -----------------------------------------------------------------------------
export const countryActivity = {
  BRA: 92,
  USA: 70,
  RUS: 65,
  CHN: 58,
  ARG: 40,
  COL: 55,
  VEN: 48,
  FRA: 35,
  GBR: 30,
  DEU: 25,
  IND: 33,
  UKR: 80,
  ISR: 75,
  IRN: 60,
}

// -----------------------------------------------------------------------------
// ARQUIVO — CLIPPINGS ANTERIORES (seeds)
// -----------------------------------------------------------------------------
export const archiveSeeds = [
  {
    id: 'clip-2026-06-04',
    date: '2026-06-04',
    title: 'Clipping Diário — 04/06/2026',
    newsCount: 5,
    alert_level: 'ATENCAO',
    preview: 'Incorporação do 2º submarino Riachuelo, nova Estratégia de Cibersegurança e contrato do C-390.',
    categories: ['Forças Armadas', 'Cibersegurança', 'Indústria', 'Fronteiras', 'Diplomacia'],
    data: mockDailyClipping,
  },
  {
    id: 'clip-2026-06-03',
    date: '2026-06-03',
    title: 'Clipping Diário — 03/06/2026',
    newsCount: 5,
    alert_level: 'NORMAL',
    preview: 'Operação de fronteira na Amazônia, audiência orçamentária no Senado e cooperação regional.',
    categories: ['Fronteiras', 'Orçamento', 'Diplomacia'],
    data: { ...mockDailyClipping, date: '03/06/2026', alert_level: 'NORMAL' },
  },
  {
    id: 'clip-2026-06-02',
    date: '2026-06-02',
    title: 'Clipping Diário — 02/06/2026',
    newsCount: 4,
    alert_level: 'NORMAL',
    preview: 'Debate sobre modernização da frota e investimentos em vigilância de fronteiras.',
    categories: ['Forças Armadas', 'Orçamento'],
    data: { ...mockDailyClipping, date: '02/06/2026', alert_level: 'NORMAL' },
  },
  {
    id: 'clip-2026-05-30',
    date: '2026-05-30',
    title: 'Clipping Diário — 30/05/2026',
    newsCount: 6,
    alert_level: 'ALERTA',
    preview: 'Escalada de incidentes cibernéticos contra órgãos públicos eleva o nível de alerta.',
    categories: ['Cibersegurança', 'Inteligência', 'Diplomacia'],
    data: { ...mockDailyClipping, date: '30/05/2026', alert_level: 'ALERTA' },
  },
]

// Notificações iniciais
export const seedNotifications = [
  { id: 'n1', title: 'Nova Estratégia de Cibersegurança', level: 'ALTO', time: '2026-06-04T08:10:00', read: false },
  { id: 'n2', title: 'Contrato Embraer C-390 confirmado', level: 'ALTO', time: '2026-06-04T07:45:00', read: false },
  { id: 'n3', title: '2º submarino Riachuelo incorporado', level: 'MEDIO', time: '2026-06-04T09:30:00', read: false },
  { id: 'n4', title: 'Operação Ágata — nova fase', level: 'MEDIO', time: '2026-06-03T18:20:00', read: true },
  { id: 'n5', title: 'Audiência orçamentária no Senado', level: 'BAIXO', time: '2026-06-03T11:30:00', read: true },
]
