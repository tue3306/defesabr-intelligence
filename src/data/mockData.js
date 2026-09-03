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

// Precisa espelhar `REGRAS_CATEGORIA` do servidor
// (server/src/lib/relevance.js). Faltavam três, e o efeito era silencioso: a
// tela de Configurações e o filtro do Arquivo simplesmente não ofereciam
// 'Programas & Meios', 'Segurança Pública' e 'Proteção Civil' — 26% do acervo
// era inalcançável por filtro sem que nada indicasse a ausência.
export const CATEGORIES = [
  'Forças Armadas',
  'Programas & Meios',
  'Cibersegurança',
  'Fronteiras',
  'Indústria',
  'Diplomacia',
  'Orçamento',
  'Inteligência',
  'Segurança Pública',
  'Proteção Civil',
]

export const URGENCY_LEVELS = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']

export const ALERT_LEVELS = ['NORMAL', 'ATENCAO', 'ALERTA', 'CRITICO']

// `RSS_SOURCES` vivia aqui: 15 fontes com `status: 'online'` escrito a mao —
// o proprio comentario original dizia "status simulado". Entre as "online"
// estavam Marinha, FAB e Exercito, que respondem 403 e 404 e por isso nem
// estao cadastradas no servidor. A lista alimentava tres telas e quatro
// botoes que nao faziam nada.
//
// As fontes reais, com estado medido, vem de /api/sources/summary.

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
