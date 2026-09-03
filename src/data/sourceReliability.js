// -----------------------------------------------------------------------------
// ÍNDICE DE CONFIABILIDADE DA FONTE — ferramenta do Analista (DEMONSTRATIVO)
// Avalia veículos por confiabilidade (0-100), tipo e viés editorial percebido.
// Critérios ilustrativos. Em produção, calibrar com metodologia documentada.
// -----------------------------------------------------------------------------

export const RELIABILITY_TIERS = [
  { min: 85, label: 'Muito alta', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', ring: '#2e7d46' },
  { min: 70, label: 'Alta', classes: 'bg-brand-500/15 text-brand-300', ring: '#1f8a4c' },
  { min: 50, label: 'Média', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', ring: '#caa733' },
  { min: 0, label: 'Requer cautela', classes: 'bg-red-500/15 text-red-800 dark:text-red-300', ring: '#c0392b' },
]

export function reliabilityTier(score) {
  return RELIABILITY_TIERS.find((t) => score >= t.min) || RELIABILITY_TIERS[RELIABILITY_TIERS.length - 1]
}

// Aqui viviam `sourceReliability` — dez veiculos com nota de 0 a 100 e vies
// editorial atribuidos a mao, o proprio cabecalho dizia "criterios
// ilustrativos" — e `reliabilityCriteria`, a metodologia que os justificaria.
//
// Nenhum dos dois era importado por ninguem: a tela de Confiabilidade das
// Fontes ja calcula a partir das execucoes reais do coletor
// (total_runs / total_failures, em /api/sources). Ficaram para tras.
//
// Atribuir "82 de confiabilidade" e "vies centro-esquerda" a um veiculo por
// escrito, sem metodo aplicado, e a especie de juizo que este projeto nao
// emite. Sobrou a taxonomia de faixas, que e escala de exibicao.
