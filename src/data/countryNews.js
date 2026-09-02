// -----------------------------------------------------------------------------
// INTELIGÊNCIA POR PAÍS — notícias de segurança/defesa, risco e relação com o
// Brasil. Chaves em inglês para casar com o world-atlas (properties.name).
// Foco nas Américas (prioridade do produto).
// -----------------------------------------------------------------------------

// Conjunto de países das Américas (para priorização do mapa de calor).
export const AMERICAS = new Set([
  'Brazil', 'United States of America', 'Canada', 'Mexico', 'Argentina', 'Colombia',
  'Venezuela', 'Chile', 'Peru', 'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname',
])

export const countryIntel = {
  Brazil: {
    namePt: 'Brasil',
    risk: 38,
    brazil: 'País-foco da plataforma.',
    news: [
      { title: '2º submarino da classe Riachuelo é incorporado pela Marinha', category: 'Forças Armadas', date: '2026-06-04' },
      { title: 'Nova Estratégia Nacional de Cibersegurança é lançada', category: 'Cibersegurança', date: '2026-06-04' },
      { title: 'Operação integrada reforça a faixa de fronteira amazônica', category: 'Fronteiras', date: '2026-06-03' },
    ],
  },
  'United States of America': {
    namePt: 'Estados Unidos',
    risk: 55,
    brazil: 'Principal parceiro tecnológico-militar fora da região.',
    news: [
      { title: 'EUA ampliam cooperação em defesa cibernética nas Américas', category: 'Diplomacia', date: '2026-06-03' },
      { title: 'Novo pacote de exercícios conjuntos no Atlântico', category: 'Forças Armadas', date: '2026-06-02' },
    ],
  },
  Argentina: {
    namePt: 'Argentina',
    risk: 41,
    brazil: 'Vizinho estratégico e parceiro no Mercosul/Cone Sul.',
    news: [
      { title: 'Argentina e Brasil retomam exercício naval conjunto', category: 'Forças Armadas', date: '2026-06-02' },
      { title: 'Discussão sobre modernização da defesa avança em Buenos Aires', category: 'Orçamento', date: '2026-05-30' },
    ],
  },
  Colombia: {
    namePt: 'Colômbia',
    risk: 63,
    brazil: 'Fronteira amazônica sensível ao narcotráfico.',
    news: [
      { title: 'Operações antidrogas se intensificam na fronteira com o Brasil', category: 'Fronteiras', date: '2026-06-03' },
      { title: 'Colômbia reforça vigilância de grupos armados na selva', category: 'Inteligência', date: '2026-06-01' },
    ],
  },
  Venezuela: {
    namePt: 'Venezuela',
    risk: 68,
    brazil: 'Instabilidade e fluxo migratório pressionam a fronteira norte.',
    news: [
      { title: 'Tensão na fronteira eleva monitoramento brasileiro em Roraima', category: 'Fronteiras', date: '2026-06-04' },
      { title: 'Movimentações militares são observadas próximo à divisa', category: 'Inteligência', date: '2026-06-02' },
    ],
  },
  Mexico: {
    namePt: 'México',
    risk: 64,
    brazil: 'Parceiro comercial; referência em combate ao crime organizado.',
    news: [
      { title: 'México intensifica operações contra cartéis no norte', category: 'Fronteiras', date: '2026-06-01' },
    ],
  },
  Chile: {
    namePt: 'Chile',
    risk: 33,
    brazil: 'Cooperação em defesa e indústria aeroespacial.',
    news: [
      { title: 'Chile e Brasil avançam em acordo de cooperação aeroespacial', category: 'Indústria', date: '2026-05-29' },
    ],
  },
  Peru: {
    namePt: 'Peru',
    risk: 47,
    brazil: 'Fronteira amazônica e rotas de narcotráfico compartilhadas.',
    news: [
      { title: 'Peru e Brasil coordenam patrulhas fluviais na Amazônia', category: 'Fronteiras', date: '2026-05-31' },
    ],
  },
  // Fora das Américas (exibidos quando a priorização está desativada)
  Russia: {
    namePt: 'Rússia', risk: 72, brazil: 'Parceiro no BRICS; fornecedor histórico de defesa.',
    news: [{ title: 'Rússia anuncia novos sistemas em exercícios de larga escala', category: 'Forças Armadas', date: '2026-06-02' }],
  },
  China: {
    namePt: 'China', risk: 58, brazil: 'Maior parceiro comercial; cooperação espacial (CBERS).',
    news: [{ title: 'China e Brasil planejam novo satélite do programa CBERS', category: 'Indústria', date: '2026-05-28' }],
  },
  Ukraine: {
    namePt: 'Ucrânia', risk: 88, brazil: 'Conflito afeta cadeias de defesa e grãos.',
    news: [{ title: 'Conflito segue impactando o mercado global de defesa', category: 'Diplomacia', date: '2026-06-03' }],
  },
  Israel: {
    namePt: 'Israel', risk: 80, brazil: 'Fornecedor de tecnologia de defesa e cibersegurança.',
    news: [{ title: 'Israel apresenta novas soluções de defesa cibernética', category: 'Cibersegurança', date: '2026-06-01' }],
  },
  Iran: {
    namePt: 'Irã', risk: 70, brazil: 'Relação diplomática sensível no Oriente Médio.',
    news: [{ title: 'Tensões no Oriente Médio elevam alerta de navegação', category: 'Diplomacia', date: '2026-06-02' }],
  },
  France: {
    namePt: 'França', risk: 30, brazil: 'Parceiro no PROSUB (Naval Group) e indústria de defesa.',
    news: [{ title: 'França reafirma parceria no programa de submarinos brasileiro', category: 'Indústria', date: '2026-05-30' }],
  },
  'United Kingdom': {
    namePt: 'Reino Unido', risk: 32, brazil: 'Cooperação naval e de inteligência.',
    news: [{ title: 'Reino Unido propõe cooperação em segurança marítima', category: 'Diplomacia', date: '2026-05-29' }],
  },
}

// Risco por nome (fallback para países sem ficha detalhada).
export function riskForCountry(name) {
  return countryIntel[name]?.risk ?? null
}
