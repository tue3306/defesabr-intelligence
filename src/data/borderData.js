// -----------------------------------------------------------------------------
// FRONTEIRAS & AMAZÔNIA (SISFRON) — DEMONSTRATIVO
// Dados ilustrativos sobre a faixa de fronteira e a segurança amazônica.
// -----------------------------------------------------------------------------

export const borderFacts = [
  { label: 'Fronteira terrestre', value: '~16.886 km', hint: '10 países vizinhos' },
  { label: 'Faixa de fronteira', value: '150 km', hint: 'de largura, lei nº 6.634/79' },
  { label: 'Países vizinhos', value: '10', hint: 'todos exceto Chile e Equador' },
  { label: 'Estados na faixa', value: '11', hint: 'do AP ao RS' },
]

// Segmentos de fronteira com nível de pressão (ilustrativo).
export const borderSegments = [
  { id: 'norte', name: 'Arco Norte (Amazônia)', countries: 'Venezuela, Guiana, Suriname', pressure: 'Alto', threats: ['Garimpo ilegal', 'Fluxo migratório', 'Narcotráfico'] },
  { id: 'noroeste', name: 'Cabeça do Cachorro', countries: 'Colômbia, Venezuela', pressure: 'Alto', threats: ['Narcotráfico', 'Grupos armados'] },
  { id: 'oeste', name: 'Fronteira Oeste (Acre/Amazonas)', countries: 'Peru, Bolívia', pressure: 'Médio', threats: ['Tráfico de drogas', 'Contrabando'] },
  { id: 'triplice', name: 'Tríplice Fronteira', countries: 'Paraguai, Argentina', pressure: 'Alto', threats: ['Contrabando', 'Lavagem de dinheiro', 'Tráfico de armas'] },
  { id: 'sul', name: 'Arco Sul', countries: 'Uruguai, Argentina', pressure: 'Baixo', threats: ['Contrabando', 'Descaminho'] },
]

export const PRESSURE_LEVELS = {
  Alto: 'bg-red-500/15 text-red-300 border-red-500/40',
  Médio: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Baixo: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}

// Ameaças com tendência (para painel de "questão de segurança").
export const borderThreats = [
  { id: 'narco', name: 'Narcotráfico', trend: 'up', desc: 'Rotas da cocaína andina atravessam a Amazônia rumo a portos e à Europa.' },
  { id: 'garimpo', name: 'Garimpo ilegal', trend: 'up', desc: 'Extração ilegal de ouro contamina rios e financia o crime; afeta terras indígenas.' },
  { id: 'desmatamento', name: 'Desmatamento (segurança ambiental)', trend: 'flat', desc: 'Tratado como questão de segurança nacional: soberania, clima e recursos.' },
  { id: 'armas', name: 'Tráfico de armas', trend: 'flat', desc: 'Armamento entra por fronteiras porosas e abastece facções urbanas.' },
  { id: 'migracao', name: 'Fluxos migratórios', trend: 'down', desc: 'Movimentos populacionais pressionam serviços e exigem ação humanitária e de controle.' },
]

// Operações de fronteira (Ágata e congêneres) — ilustrativo.
export const borderOperations = [
  { name: 'Operação Ágata', scope: 'Interagências, toda a faixa de fronteira', frequency: 'Periódica', forces: 'EB, MB, FAB, PF, Funai, Ibama' },
  { name: 'Operação Curare', scope: 'Calha do Solimões/Amazonas', frequency: 'Recorrente', forces: 'Exército (CMA)' },
  { name: 'Operação Catrimani', scope: 'Terra Indígena Yanomami', frequency: 'Contínua', forces: 'EB, FAB, PF, órgãos federais' },
]

// Resultados consolidados (ilustrativo) para cartões de métrica.
export const borderResults = [
  { label: 'Militares empregados', value: '3.500+', accent: 'green' },
  { label: 'Apreensões (drogas)', value: '12 t', accent: 'amber' },
  { label: 'Garimpos desativados', value: '46', accent: 'red' },
  { label: 'Vetores aéreos/drones', value: '28', accent: 'brand' },
]
