// -----------------------------------------------------------------------------
// PROGRAMAS ESTRATÉGICOS DE DEFESA — DEMONSTRATIVO
// Valores aproximam dados públicos (Min. Defesa, Forças, imprensa especializada),
// mas são ILUSTRATIVOS para fins de visualização. Não são dados oficiais.
// force: 'Marinha' | 'Exército' | 'FAB' | 'Conjunto'
// status: 'execucao' | 'planejamento' | 'concluido' | 'atrasado'
// -----------------------------------------------------------------------------

export const PROGRAM_FORCES = {
  Marinha: { label: 'Marinha', color: '#13315c' },
  'Exército': { label: 'Exército', color: '#2e7d46' },
  FAB: { label: 'FAB', color: '#2b6cb0' },
  Conjunto: { label: 'Conjunto', color: '#caa733' },
}

export const PROGRAM_STATUS = {
  execucao: { label: 'Em execução', classes: 'bg-emerald-500/15 text-emerald-300' },
  planejamento: { label: 'Planejamento', classes: 'bg-yellow-500/15 text-yellow-300' },
  atrasado: { label: 'Atenção/atraso', classes: 'bg-red-500/15 text-red-300' },
  concluido: { label: 'Concluído', classes: 'bg-brand-500/15 text-brand-300' },
}

export const strategicPrograms = [
  {
    id: 'prosub',
    name: 'PROSUB',
    full: 'Programa de Desenvolvimento de Submarinos',
    force: 'Marinha',
    status: 'execucao',
    progress: 62,
    budgetBRL: 40.0, // R$ bi (estimativa de ciclo)
    startYear: 2008,
    deliveryYear: 2034,
    partner: 'Naval Group (FRA)',
    objective:
      'Construir 4 submarinos convencionais (classe Riachuelo) e o 1º submarino de propulsão nuclear brasileiro, além do estaleiro e da base naval em Itaguaí (RJ).',
    milestones: [
      { label: 'S-40 Riachuelo incorporado', done: true },
      { label: 'S-41 Humaitá incorporado', done: true },
      { label: 'S-42 Tonelero — testes de mar', done: false },
      { label: 'Submarino nuclear (Álvaro Alberto)', done: false },
    ],
    impact: 'Dissuasão no Atlântico Sul e proteção do pré-sal e da Amazônia Azul.',
  },
  {
    id: 'fx2',
    name: 'FX-2 (Gripen F-39)',
    full: 'Caça multifunção da FAB',
    force: 'FAB',
    status: 'execucao',
    progress: 55,
    budgetBRL: 25.0,
    startYear: 2014,
    deliveryYear: 2027,
    partner: 'Saab (SWE)',
    objective:
      'Adquirir e nacionalizar 36 caças F-39 Gripen E/F, com transferência de tecnologia e montagem na linha da Embraer em Gavião Peixoto (SP).',
    milestones: [
      { label: 'Primeiros F-39E entregues', done: true },
      { label: 'Montagem nacional iniciada', done: true },
      { label: 'Versão biposto F-39F', done: false },
      { label: 'Frota de 36 aeronaves completa', done: false },
    ],
    impact: 'Renova o poder aéreo e capacita a indústria aeronáutica nacional.',
  },
  {
    id: 'tamandare',
    name: 'Classe Tamandaré',
    full: 'Programa de Fragatas Classe Tamandaré (PFCT)',
    force: 'Marinha',
    status: 'execucao',
    progress: 48,
    budgetBRL: 9.0,
    startYear: 2019,
    deliveryYear: 2029,
    partner: 'thyssenkrupp Marine Systems (ALE)',
    objective:
      'Construir 4 fragatas de última geração no Brasil (Itajaí/SC), modernizando a esquadra de superfície com construção nacional.',
    milestones: [
      { label: 'Corte de chapas da 1ª fragata', done: true },
      { label: 'Lançamento da F-200 Tamandaré', done: true },
      { label: 'Entrega da 1ª fragata à Marinha', done: false },
      { label: '4 fragatas operacionais', done: false },
    ],
    impact: 'Capacidade de escolta e defesa de área; emprego e tecnologia naval no Sul.',
  },
  {
    id: 'guarani',
    name: 'VBTP Guarani',
    full: 'Viatura Blindada de Transporte de Pessoal',
    force: 'Exército',
    status: 'execucao',
    progress: 58,
    budgetBRL: 6.5,
    startYear: 2012,
    deliveryYear: 2035,
    partner: 'Iveco (ITA) / nacional',
    objective:
      'Produzir cerca de 2.000 blindados 6x6 Guarani, modernizando a mobilidade da Força Terrestre com alto índice de nacionalização.',
    milestones: [
      { label: '+700 viaturas entregues', done: true },
      { label: 'Versão com torre remota', done: true },
      { label: 'Variante anfíbia para fuzileiros', done: false },
      { label: 'Meta total de viaturas', done: false },
    ],
    impact: 'Mobilidade e proteção da tropa; cadeia industrial terrestre nacional.',
  },
  {
    id: 'astros',
    name: 'ASTROS 2020',
    full: 'Sistema de Mísseis e Foguetes de Saturação',
    force: 'Exército',
    status: 'execucao',
    progress: 70,
    budgetBRL: 5.0,
    startYear: 2012,
    deliveryYear: 2028,
    partner: 'Avibras (BRA)',
    objective:
      'Modernizar a artilharia de longo alcance, incluindo o míssil tático de cruzeiro AV-TM 300 (alcance ~300 km), com tecnologia nacional.',
    milestones: [
      { label: 'Baterias ASTROS modernizadas', done: true },
      { label: 'Míssil AV-TM 300 em testes', done: true },
      { label: 'Operação plena do míssil tático', done: false },
      { label: 'Forte de Formosa equipado', done: false },
    ],
    impact: 'Dissuasão terrestre de longo alcance com autonomia tecnológica.',
  },
  {
    id: 'sgdc',
    name: 'SGDC',
    full: 'Satélite Geoestacionário de Defesa e Comunicações',
    force: 'Conjunto',
    status: 'execucao',
    progress: 80,
    budgetBRL: 2.8,
    startYear: 2013,
    deliveryYear: 2030,
    partner: 'Telebras / Visiona',
    objective:
      'Garantir comunicações estratégicas seguras e soberanas do governo e das Forças, além de banda larga em áreas remotas.',
    milestones: [
      { label: 'SGDC-1 em órbita', done: true },
      { label: 'Banda militar (banda X) ativa', done: true },
      { label: 'Contratação do SGDC-2', done: false },
      { label: 'Constelação de defesa ampliada', done: false },
    ],
    impact: 'Soberania nas comunicações e conectividade da Amazônia e fronteiras.',
  },
  {
    id: 'sisgaaz',
    name: 'SisGAAz',
    full: 'Sistema de Gerenciamento da Amazônia Azul',
    force: 'Marinha',
    status: 'planejamento',
    progress: 30,
    budgetBRL: 12.0,
    startYear: 2016,
    deliveryYear: 2040,
    partner: 'Nacional (em estruturação)',
    objective:
      'Monitorar e controlar toda a área marítima sob jurisdição brasileira (~5,7 mi km²) com radares, satélites, sensores e centros de operação.',
    milestones: [
      { label: 'Projeto-piloto e requisitos', done: true },
      { label: 'Integração de radares costeiros', done: false },
      { label: 'Centro de operações nacional', done: false },
      { label: 'Cobertura plena da Amazônia Azul', done: false },
    ],
    impact: 'Consciência situacional marítima: protege rotas, pré-sal e recursos.',
  },
  {
    id: 'sisfron',
    name: 'SISFRON',
    full: 'Sistema Integrado de Monitoramento de Fronteiras',
    force: 'Exército',
    status: 'execucao',
    progress: 40,
    budgetBRL: 12.0,
    startYear: 2012,
    deliveryYear: 2035,
    partner: 'Consórcio nacional',
    objective:
      'Vigiar os ~16,8 mil km de fronteira terrestre com sensores, radares, comunicações e plataformas, apoiando o combate a ilícitos transnacionais.',
    milestones: [
      { label: 'Projeto-piloto (MS) concluído', done: true },
      { label: 'Expansão para a faixa amazônica', done: false },
      { label: 'Integração com órgãos de segurança', done: false },
      { label: 'Cobertura total da faixa de fronteira', done: false },
    ],
    impact: 'Presença estatal e pressão sobre o crime organizado na fronteira.',
  },
]

// Resumo agregado para os cartões de métrica do topo da página.
export const programsSummary = {
  total: strategicPrograms.length,
  emExecucao: strategicPrograms.filter((p) => p.status === 'execucao').length,
  investimentoBRL: strategicPrograms.reduce((s, p) => s + p.budgetBRL, 0),
  progressoMedio: Math.round(
    strategicPrograms.reduce((s, p) => s + p.progress, 0) / strategicPrograms.length
  ),
}
