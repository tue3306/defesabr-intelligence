// -----------------------------------------------------------------------------
// TAXONOMIA — os rótulos do domínio, e só isso.
//
// Este arquivo se chamava `mockData.js` e tinha 659 linhas: notícias
// inventadas com veículo e data, um clipping diário completo escrito à mão,
// cotações de ações de fabricantes de defesa, séries de gasto militar em
// reais, um índice de alerta fixo em 42, "intensidade" de risco para catorze
// países e um volume de notícias gerado por `Math.random()`.
//
// Nada disso era rotulado como exemplo na tela. Cada um era o fallback de
// alguma consulta real: bastava a API não responder para a plataforma exibir
// um produto inteiro de dados que ninguém coletou, com selo pequeno dizendo
// "demo" e três casas decimais dizendo o contrário.
//
// O que sobrou são as CONSTANTES DE DOMÍNIO — nomes de categoria, níveis de
// urgência e de alerta, áreas de interesse e a lista de feeds. Não são dados:
// são o vocabulário com que os dados reais são classificados, e precisam
// existir escritos em algum lugar.
//
// O nome do arquivo permanece por enquanto para não espalhar o diff; o
// conteúdo já não é mock nenhum.
// -----------------------------------------------------------------------------

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
  // Governamentais / institucionais
  { id: 'defesagov', name: 'Ministério da Defesa', url: 'https://www.gov.br/defesa/pt-br/assuntos/noticias/RSS', enabled: true, status: 'online' },
  { id: 'marinha', name: 'Marinha do Brasil', url: 'https://www.marinha.mil.br/rss.xml', enabled: true, status: 'online' },
  { id: 'exercito', name: 'Exército Brasileiro', url: 'https://www.eb.mil.br/rss', enabled: true, status: 'online' },
  { id: 'fab', name: 'Força Aérea Brasileira (FAB)', url: 'https://www.fab.mil.br/noticias/rss', enabled: true, status: 'online' },
  { id: 'gsi', name: 'GSI / Presidência', url: 'https://www.gov.br/gsi/pt-br/assuntos/noticias/RSS', enabled: true, status: 'online' },
  { id: 'pf', name: 'Polícia Federal', url: 'https://www.gov.br/pf/pt-br/assuntos/noticias/RSS', enabled: true, status: 'online' },
  { id: 'mre', name: 'Itamaraty (MRE)', url: 'https://www.gov.br/mre/pt-br/canais_atendimento/imprensa/RSS', enabled: false, status: 'offline' },
  // [ALTERADO] Fontes governamentais adicionais
  { id: 'abin', name: 'ABIN — Inteligência', url: 'https://www.gov.br/abin/pt-br/assuntos/noticias/RSS', enabled: true, status: 'online' },
  { id: 'receita', name: 'Receita Federal', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/RSS', enabled: false, status: 'offline' },
  { id: 'bcb', name: 'Banco Central', url: 'https://www.bcb.gov.br/rss/noticias', enabled: true, status: 'online' },
  // [REQUER BACKEND] Boletins Geocorrentes (EGN/Marinha) — exigem scraping no servidor
  { id: 'egn', name: 'Boletim Geocorrente (EGN/Marinha)', url: 'https://www.marinha.mil.br/egn/geocorrente', enabled: false, status: 'offline' },
  // Imprensa especializada
  { id: 'poder360', name: 'Poder360 — Defesa', url: 'https://www.poder360.com.br/defesa/feed/', enabled: true, status: 'online' },
  { id: 'aerospacial', name: 'Revista Aerospacial', url: 'https://revistaaerospacial.com.br/feed/', enabled: true, status: 'online' },
  { id: 'brasildefesa', name: 'Brasil Defesa', url: 'https://www.brasildefesa.com.br/?format=feed&type=rss', enabled: false, status: 'offline' },
  { id: 'ggn', name: 'Jornal GGN — Defesa', url: 'https://jornalggn.com.br/tag/defesa/feed/', enabled: true, status: 'online' },
]

// -----------------------------------------------------------------------------
// NOTÍCIAS DE HOJE (brutas, antes da IA)
// -----------------------------------------------------------------------------

export const FOCUS_AREAS = [
  { id: 'academico', label: 'Acadêmica', icon: 'GraduationCap' },
  { id: 'investimento', label: 'Investimentos', icon: 'TrendingUp' },
  { id: 'comercial', label: 'Comercial/Ind.', icon: 'Factory' },
  { id: 'empresarial', label: 'Empresarial', icon: 'Briefcase' },
  { id: 'diplomatico', label: 'Diplomática', icon: 'Globe' },
]
