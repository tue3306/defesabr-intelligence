// -----------------------------------------------------------------------------
// CATÁLOGO DE FONTES MONITORADAS — arquitetura preparada para integração real.
//
// Pipeline conceitual de cada fonte (nenhum atalho no front-end):
//   SOURCE → CONNECTOR → FETCH → NORMALIZAÇÃO → CLASSIFICAÇÃO → STORAGE → ANÁLISE → UI
//
// Nesta fase (demonstração 100% front-end, sem backend), as fontes ficam
// CONFIGURADAS/PREPARADAS: há metadados e conector previsto, mas não há coleta
// ao vivo — um site estático não pode consumir estes veículos diretamente
// (CORS/robots). O `status` reflete isso com honestidade: nada é apresentado
// como "coletando ao vivo" quando não está. Quando existir backend/proxy,
// basta implementar o conector por trás destes mesmos metadados.
//
// Metadados por fonte (id · nome · domínio · categoria · país · tipo ·
// status · confiabilidade · cadência · relevância para o Brasil).
// -----------------------------------------------------------------------------

// Estados possíveis de uma fonte (usados para badges e para os textos de frescor).
export const SOURCE_STATUS = {
  ativa: { label: 'Coletando', classes: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400', desc: 'Conector ativo (requer backend).' },
  configurada: { label: 'Configurada', classes: 'bg-brand-500/15 text-brand-300', dot: 'bg-brand-400', desc: 'Cadastrada e pronta para integração via conector.' },
  pendente: { label: 'Integração pendente', classes: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400', desc: 'Conector previsto; aguardando backend/proxy.' },
  indisponivel: { label: 'Indisponível', classes: 'bg-red-500/15 text-red-300', dot: 'bg-red-400', desc: 'Fonte temporariamente inacessível.' },
}

// Agrupamento por categoria (mantém a leitura organizada e densa, não "cheia").
export const SOURCE_CATEGORIES = [
  { id: 'tech-br', label: 'Tecnologia & Cibersegurança — Brasil' },
  { id: 'inst-br', label: 'Institucional — Brasil' },
  { id: 'intl-sec', label: 'Tecnologia & Segurança — Internacional' },
]

// Fontes solicitadas para o monitoramento, com foco brasileiro preservado:
// mesmo as internacionais entram pela ótica "qual a relevância para o Brasil?".
export const monitoredSources = [
  // ── Tecnologia e cibersegurança — Brasil ───────────────────────────────────
  {
    id: 'olhardigital', name: 'Olhar Digital', domain: 'olhardigital.com.br',
    category: 'tech-br', country: 'Brasil', type: 'Especializada',
    status: 'configurada', reliability: 78, cadence: 'Diária',
    brRelevance: 'Tecnologia, inovação e incidentes cibernéticos no ecossistema brasileiro.',
  },
  {
    id: 'convergencia', name: 'Convergência Digital', domain: 'convergenciadigital.com.br',
    category: 'tech-br', country: 'Brasil', type: 'Especializada',
    status: 'configurada', reliability: 80, cadence: 'Diária',
    brRelevance: 'Telecom, política de TIC e segurança da informação no setor público.',
  },
  {
    id: 'techtudo', name: 'TechTudo', domain: 'techtudo.com.br',
    category: 'tech-br', country: 'Brasil', type: 'Imprensa',
    status: 'configurada', reliability: 72, cadence: 'Diária',
    brRelevance: 'Tecnologia de consumo e alertas de segurança de amplo alcance no Brasil.',
  },
  {
    id: 'cisoadvisor', name: 'CISO Advisor', domain: 'cisoadvisor.com.br',
    category: 'tech-br', country: 'Brasil', type: 'Especializada',
    status: 'configurada', reliability: 83, cadence: 'Diária',
    brRelevance: 'Cibersegurança corporativa, vazamentos e ataques a organizações brasileiras.',
  },
  {
    id: 'tecmundo', name: 'TecMundo', domain: 'tecmundo.com.br',
    category: 'tech-br', country: 'Brasil', type: 'Imprensa',
    status: 'configurada', reliability: 74, cadence: 'Diária',
    brRelevance: 'Tecnologia e segurança digital com grande difusão no público brasileiro.',
  },

  // ── Fontes institucionais brasileiras ──────────────────────────────────────
  {
    id: 'stf', name: 'Supremo Tribunal Federal', domain: 'portal.stf.jus.br',
    category: 'inst-br', country: 'Brasil', type: 'Oficial',
    status: 'configurada', reliability: 97, cadence: 'Por publicação',
    brRelevance: 'Decisões com impacto em soberania de dados, segurança e marco regulatório.',
  },
  {
    id: 'camara', name: 'Câmara dos Deputados', domain: 'camara.leg.br',
    category: 'inst-br', country: 'Brasil', type: 'Oficial',
    status: 'configurada', reliability: 95, cadence: 'Por sessão',
    brRelevance: 'Tramitação de projetos de defesa, cibersegurança e infraestrutura crítica.',
  },
  {
    id: 'senado', name: 'Senado Federal', domain: 'senado.leg.br',
    category: 'inst-br', country: 'Brasil', type: 'Oficial',
    status: 'configurada', reliability: 95, cadence: 'Por sessão',
    brRelevance: 'Comissões de Relações Exteriores e Defesa Nacional; agenda legislativa estratégica.',
  },
  {
    id: 'planalto', name: 'Planalto — Legislação', domain: 'planalto.gov.br',
    category: 'inst-br', country: 'Brasil', type: 'Oficial',
    status: 'configurada', reliability: 96, cadence: 'Por publicação',
    brRelevance: 'Decretos, leis e atos do Executivo com efeito direto sobre política de defesa.',
  },

  // ── Fontes internacionais de tecnologia e segurança ────────────────────────
  {
    id: 'infosecurity', name: 'InfoSecurity Magazine', domain: 'infosecurity-magazine.com',
    category: 'intl-sec', country: 'Reino Unido', type: 'Internacional',
    status: 'configurada', reliability: 85, cadence: 'Diária',
    brRelevance: 'Contexto global de ameaças cibernéticas — leitura pela ótica do risco ao Brasil.',
  },
  {
    id: 'bleepingcomputer', name: 'BleepingComputer', domain: 'bleepingcomputer.com',
    category: 'intl-sec', country: 'EUA', type: 'Internacional',
    status: 'configurada', reliability: 86, cadence: 'Diária',
    brRelevance: 'Ransomware e vulnerabilidades que atingem cadeias globais e fornecedores no Brasil.',
  },
  {
    id: 'thehackernews', name: 'The Hacker News', domain: 'thehackernews.com',
    category: 'intl-sec', country: 'Internacional', type: 'Internacional',
    status: 'configurada', reliability: 82, cadence: 'Diária',
    brRelevance: 'Campanhas e APTs de alcance internacional com potencial reflexo no país.',
  },
  {
    id: 'threatpost', name: 'Threatpost', domain: 'threatpost.com',
    category: 'intl-sec', country: 'EUA', type: 'Internacional',
    status: 'pendente', reliability: 79, cadence: 'Arquivo',
    brRelevance: 'Acervo de referência sobre ameaças; usado para contexto histórico e correlação.',
  },
]

// Agrega as fontes por categoria, na ordem de SOURCE_CATEGORIES.
export function sourcesByCategory() {
  return SOURCE_CATEGORIES.map((cat) => ({
    ...cat,
    items: monitoredSources.filter((s) => s.category === cat.id),
  }))
}

// Contagem por status (para um resumo honesto no topo do catálogo).
export function sourceStatusSummary() {
  return monitoredSources.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})
}
