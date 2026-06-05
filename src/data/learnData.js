// -----------------------------------------------------------------------------
// CENTRO EDUCACIONAL — glossário, conceitos e quiz (público acadêmico)
// -----------------------------------------------------------------------------

// Glossário de termos de Segurança & Defesa, geopolítica e cibersegurança.
export const glossary = [
  {
    term: 'Dissuasão',
    category: 'Estratégia',
    definition:
      'Capacidade de desencorajar um adversário de agir, demonstrando que o custo de um ataque superaria qualquer ganho. Base da postura defensiva de muitas nações.',
  },
  {
    term: 'PROSUB',
    category: 'Forças Armadas',
    definition:
      'Programa de Desenvolvimento de Submarinos da Marinha do Brasil, em parceria com a francesa Naval Group, que inclui submarinos convencionais e um de propulsão nuclear.',
  },
  {
    term: 'Base Industrial de Defesa (BID)',
    category: 'Indústria',
    definition:
      'Conjunto de empresas, instituições e tecnologias que produzem bens e serviços de defesa. No Brasil inclui Embraer, Avibras, IMBEL, entre outras.',
  },
  {
    term: 'Guerra Híbrida',
    category: 'Estratégia',
    definition:
      'Combinação de meios militares convencionais com táticas irregulares, ciberataques, desinformação e pressão econômica para atingir objetivos sem confronto aberto.',
  },
  {
    term: 'CERT',
    category: 'Cibersegurança',
    definition:
      'Computer Emergency Response Team — equipe responsável por responder a incidentes de segurança cibernética e coordenar a defesa de infraestruturas críticas.',
  },
  {
    term: 'Infraestrutura Crítica',
    category: 'Cibersegurança',
    definition:
      'Sistemas essenciais ao funcionamento da sociedade (energia, água, telecomunicações, finanças) cuja interrupção causa grave impacto à segurança nacional.',
  },
  {
    term: 'Meta da OTAN (2% do PIB)',
    category: 'Orçamento',
    definition:
      'Compromisso dos países-membros da OTAN de destinar ao menos 2% do PIB a gastos de defesa. Serve como referência internacional de investimento militar.',
  },
  {
    term: 'Soberania',
    category: 'Geopolítica',
    definition:
      'Poder de um Estado de exercer autoridade plena sobre seu território, recursos e decisões, sem interferência externa.',
  },
  {
    term: 'Amazônia Azul',
    category: 'Geopolítica',
    definition:
      'Termo que designa a vasta área marítima sob jurisdição brasileira (~5,7 milhões de km²), rica em recursos como o petróleo do pré-sal, exigindo proteção naval.',
  },
  {
    term: 'C4ISR',
    category: 'Forças Armadas',
    definition:
      'Comando, Controle, Comunicações, Computadores, Inteligência, Vigilância e Reconhecimento — arquitetura que integra sensores e decisão no campo de batalha moderno.',
  },
  {
    term: 'OSINT',
    category: 'Inteligência',
    definition:
      'Open Source Intelligence — coleta e análise de informações a partir de fontes abertas (notícias, redes sociais, dados públicos) para produzir inteligência.',
  },
  {
    term: 'Desinformação',
    category: 'Inteligência',
    definition:
      'Disseminação deliberada de informações falsas ou manipuladas para influenciar a opinião pública, desestabilizar instituições ou confundir adversários.',
  },
]

export const glossaryCategories = [...new Set(glossary.map((g) => g.category))]

// Conceitos-chave explicados em cartões (introdução para iniciantes).
export const learnConcepts = [
  {
    icon: 'Shield',
    title: 'O que é inteligência estratégica?',
    text: 'É o processo de coletar, analisar e interpretar informações para apoiar decisões de alto nível em segurança, defesa e política externa. Transforma dados brutos em conhecimento acionável.',
  },
  {
    icon: 'Globe2',
    title: 'Por que monitorar defesa?',
    text: 'Movimentos militares, contratos e crises afetam economia, comércio e a vida das pessoas. Acompanhar o setor ajuda empresas, pesquisadores e cidadãos a anteciparem riscos e oportunidades.',
  },
  {
    icon: 'LineChart',
    title: 'Como ler os indicadores?',
    text: 'Gastos em % do PIB mostram a prioridade dada à defesa; o índice de alerta resume a tensão do momento; o volume de notícias revela quais temas estão em alta na semana.',
  },
  {
    icon: 'Cpu',
    title: 'O papel da IA aqui',
    text: 'A inteligência artificial resume grandes volumes de notícias, classifica urgência e gera cenários. Ela acelera a análise, mas não substitui o julgamento humano especializado.',
  },
]

// Banco de questões do quiz (gamificação para estudantes).
export const quizQuestions = [
  {
    q: 'O que significa a sigla PROSUB?',
    options: [
      'Programa de Desenvolvimento de Submarinos',
      'Projeto de Segurança Urbana Brasileira',
      'Protocolo de Subordinação Militar',
      'Programa de Subsídios à Defesa',
    ],
    answer: 0,
    explain: 'O PROSUB é o programa da Marinha do Brasil para construção de submarinos, incluindo um de propulsão nuclear.',
  },
  {
    q: 'A "meta da OTAN" recomenda investir em defesa pelo menos:',
    options: ['0,5% do PIB', '1% do PIB', '2% do PIB', '5% do PIB'],
    answer: 2,
    explain: 'A referência internacional é destinar ao menos 2% do PIB a gastos de defesa.',
  },
  {
    q: 'O termo "Amazônia Azul" se refere a:',
    options: [
      'Uma operação de combate a incêndios',
      'A área marítima sob jurisdição do Brasil',
      'Um satélite de monitoramento',
      'Uma base aérea no Norte',
    ],
    answer: 1,
    explain: 'É a vasta área oceânica brasileira, rica em recursos como o petróleo do pré-sal.',
  },
  {
    q: 'Qual aeronave de transporte é fabricada pela Embraer e exportada para vários países?',
    options: ['F-39 Gripen', 'C-390 Millennium', 'KC-390 Tucano', 'A-29 Hércules'],
    answer: 1,
    explain: 'O C-390 Millennium é o cargueiro multimissão da Embraer, com vários clientes internacionais.',
  },
  {
    q: 'OSINT é a inteligência obtida a partir de:',
    options: [
      'Fontes abertas e públicas',
      'Interceptação de sinais',
      'Espionagem humana',
      'Imagens de satélite secretas',
    ],
    answer: 0,
    explain: 'Open Source Intelligence usa fontes abertas: notícias, dados públicos e redes sociais.',
  },
  {
    q: 'Infraestrutura crítica inclui, por exemplo:',
    options: [
      'Cinemas e shoppings',
      'Redes de energia e telecomunicações',
      'Parques urbanos',
      'Lojas de varejo',
    ],
    answer: 1,
    explain: 'São sistemas essenciais (energia, água, telecom, finanças) cuja falha afeta a segurança nacional.',
  },
  {
    q: 'O que caracteriza a "guerra híbrida"?',
    options: [
      'Apenas combate aéreo',
      'Uso exclusivo de submarinos',
      'Combinação de meios militares, cibernéticos e desinformação',
      'Conflitos resolvidos só na diplomacia',
    ],
    answer: 2,
    explain: 'A guerra híbrida mistura forças convencionais, ciberataques, desinformação e pressão econômica.',
  },
]

// -----------------------------------------------------------------------------
// PERFIS DE PAÍSES — para o modo "comparar países" do mapa (valores ilustrativos)
// Chaves em inglês para casar com o world-atlas (properties.name).
// -----------------------------------------------------------------------------
export const countryProfiles = {
  Brazil: { namePt: 'Brasil', activity: 92, spendingUSD: 22, pctGdp: 1.2, personnelK: 360, region: 'América do Sul' },
  'United States of America': { namePt: 'Estados Unidos', activity: 70, spendingUSD: 877, pctGdp: 3.4, personnelK: 1390, region: 'América do Norte' },
  Russia: { namePt: 'Rússia', activity: 65, spendingUSD: 109, pctGdp: 4.1, personnelK: 1150, region: 'Eurásia' },
  China: { namePt: 'China', activity: 58, spendingUSD: 292, pctGdp: 1.7, personnelK: 2035, region: 'Ásia' },
  Argentina: { namePt: 'Argentina', activity: 40, spendingUSD: 3.0, pctGdp: 0.6, personnelK: 75, region: 'América do Sul' },
  Colombia: { namePt: 'Colômbia', activity: 55, spendingUSD: 9.5, pctGdp: 3.0, personnelK: 293, region: 'América do Sul' },
  Venezuela: { namePt: 'Venezuela', activity: 48, spendingUSD: 0.8, pctGdp: 0.5, personnelK: 123, region: 'América do Sul' },
  France: { namePt: 'França', activity: 35, spendingUSD: 53, pctGdp: 1.9, personnelK: 203, region: 'Europa' },
  'United Kingdom': { namePt: 'Reino Unido', activity: 30, spendingUSD: 68, pctGdp: 2.3, personnelK: 153, region: 'Europa' },
  Germany: { namePt: 'Alemanha', activity: 25, spendingUSD: 56, pctGdp: 1.5, personnelK: 183, region: 'Europa' },
  India: { namePt: 'Índia', activity: 33, spendingUSD: 81, pctGdp: 2.4, personnelK: 1450, region: 'Ásia' },
  Ukraine: { namePt: 'Ucrânia', activity: 80, spendingUSD: 44, pctGdp: 37, personnelK: 500, region: 'Europa' },
  Israel: { namePt: 'Israel', activity: 75, spendingUSD: 23, pctGdp: 4.5, personnelK: 170, region: 'Oriente Médio' },
  Iran: { namePt: 'Irã', activity: 60, spendingUSD: 10, pctGdp: 2.5, personnelK: 610, region: 'Oriente Médio' },
}
