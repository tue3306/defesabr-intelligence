// -----------------------------------------------------------------------------
// DOSSIÊS TEMÁTICOS ("Em Foco") — DEMONSTRATIVO
// Cada dossiê agrega contexto, pontos-chave, indicadores e impacto p/ o Brasil.
// -----------------------------------------------------------------------------

export const dossiers = [
  {
    id: 'venezuela-essequibo',
    title: 'Venezuela & Essequibo',
    kicker: 'Tensão regional',
    region: 'América do Sul',
    risk: 'Alto',
    updated: '2026-06-05',
    cover: 'from-red-900/50 via-military-card to-military-darker',
    summary:
      'A disputa entre Venezuela e Guiana pela região do Essequibo, rica em petróleo, eleva a tensão na fronteira norte do Brasil e exige postura de dissuasão e mediação.',
    context:
      'O referendo venezuelano sobre o Essequibo e a movimentação de tropas reacenderam um litígio histórico. O Brasil, fazendo fronteira com ambos os países pela Roraima, reforçou o efetivo militar em Pacaraima e atua diplomaticamente pela solução pacífica.',
    keyPoints: [
      'Reforço do Exército na fronteira de Roraima',
      'Brasil defende solução negociada e integridade territorial da Guiana',
      'Reservas de petróleo offshore são o motor econômico da disputa',
      'Risco de fluxo migratório adicional para o Brasil',
    ],
    indicators: [
      { name: 'Tensão na fronteira norte', value: 'Elevada', status: 'ALERTA' },
      { name: 'Efetivo brasileiro mobilizado', value: '+ reforço', status: 'ATENCAO' },
      { name: 'Mediação diplomática', value: 'Ativa', status: 'NORMAL' },
    ],
    impactBR:
      'Segurança da fronteira norte, estabilidade regional e papel do Brasil como mediador no Cone Norte da América do Sul.',
    related: ['Fronteiras', 'Diplomacia', 'Forças Armadas'],
  },
  {
    id: 'amazonia-azul',
    title: 'Amazônia Azul',
    kicker: 'Domínio marítimo',
    region: 'Atlântico Sul',
    risk: 'Médio',
    updated: '2026-06-04',
    cover: 'from-blue-900/50 via-military-card to-military-darker',
    summary:
      'A proteção dos 5,7 milhões de km² de mar brasileiro — pré-sal, rotas e recursos — é prioridade estratégica sustentada por PROSUB, SisGAAz e a esquadra.',
    context:
      'Cerca de 95% do petróleo e do comércio exterior do país dependem do mar. O aumento do tráfego de potências extrarregionais e da pesca ilegal reforça a necessidade de consciência situacional marítima e poder naval crível.',
    keyPoints: [
      'PROSUB avança com submarinos convencionais e o de propulsão nuclear',
      'SisGAAz integra satélites, radares e sensores',
      'Pesca ilegal (IUU) pressiona a ZEE',
      'Fragatas Tamandaré modernizam a esquadra de superfície',
    ],
    indicators: [
      { name: 'Cobertura de vigilância (SisGAAz)', value: 'Parcial', status: 'ATENCAO' },
      { name: 'Programas navais', value: 'Em execução', status: 'NORMAL' },
      { name: 'Incidentes de pesca ilegal', value: 'Estável', status: 'NORMAL' },
    ],
    impactBR:
      'Soberania sobre recursos energéticos, segurança das rotas comerciais e dissuasão no Atlântico Sul.',
    related: ['Forças Armadas', 'Indústria', 'Diplomacia'],
  },
  {
    id: 'ciberseguranca',
    title: 'Cibersegurança Nacional',
    kicker: 'Ameaça digital',
    region: 'Brasil',
    risk: 'Alto',
    updated: '2026-06-04',
    cover: 'from-purple-900/50 via-military-card to-military-darker',
    summary:
      'O crescimento de ataques a órgãos públicos e infraestruturas críticas torna a ciberdefesa um pilar da segurança nacional, com nova Estratégia e CERT integrado.',
    context:
      'Ataques de ransomware e invasões a sistemas de energia, saúde e finanças aumentaram. A nova Estratégia Nacional de Cibersegurança prevê R$ 1,1 bilhão, um CERT nacional e cooperação público-privada, sob coordenação do GSI e do ComDCiber.',
    keyPoints: [
      'Estratégia Nacional de Cibersegurança 2026 lançada',
      'CERT nacional integrado em criação',
      'Infraestruturas críticas como alvo prioritário',
      'Cooperação com setor privado e universidades',
    ],
    indicators: [
      { name: 'Incidentes em órgãos (m/m)', value: '+12%', status: 'ATENCAO' },
      { name: 'Maturidade cibernética', value: 'Em alta', status: 'NORMAL' },
      { name: 'Investimento previsto', value: 'R$ 1,1 bi', status: 'NORMAL' },
    ],
    impactBR:
      'Resiliência de serviços essenciais, proteção de dados do cidadão e do Estado e soberania digital.',
    related: ['Cibersegurança', 'Inteligência', 'Orçamento'],
  },
]

export const DOSSIER_RISK = {
  Alto: 'bg-red-500/15 text-red-300 border-red-500/40',
  Médio: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Baixo: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}
