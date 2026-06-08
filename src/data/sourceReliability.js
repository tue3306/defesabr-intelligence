// -----------------------------------------------------------------------------
// ÍNDICE DE CONFIABILIDADE DA FONTE — ferramenta do Analista (DEMONSTRATIVO)
// Avalia veículos por confiabilidade (0-100), tipo e viés editorial percebido.
// Critérios ilustrativos. Em produção, calibrar com metodologia documentada.
// -----------------------------------------------------------------------------

export const RELIABILITY_TIERS = [
  { min: 85, label: 'Muito alta', classes: 'bg-emerald-500/15 text-emerald-300', ring: '#2e7d46' },
  { min: 70, label: 'Alta', classes: 'bg-brand-500/15 text-brand-300', ring: '#2b6cb0' },
  { min: 50, label: 'Média', classes: 'bg-amber-500/15 text-amber-300', ring: '#caa733' },
  { min: 0, label: 'Requer cautela', classes: 'bg-red-500/15 text-red-300', ring: '#c0392b' },
]

export function reliabilityTier(score) {
  return RELIABILITY_TIERS.find((t) => score >= t.min) || RELIABILITY_TIERS[RELIABILITY_TIERS.length - 1]
}

// type: 'Oficial' | 'Imprensa' | 'Especializada' | 'Internacional' | 'Redes'
export const sourceReliability = [
  { id: 'defesagov', name: 'Ministério da Defesa', type: 'Oficial', score: 96, bias: 'Institucional', note: 'Fonte primária oficial; alta confiabilidade factual.' },
  { id: 'marinha', name: 'Marinha do Brasil', type: 'Oficial', score: 95, bias: 'Institucional', note: 'Comunicação oficial da Força.' },
  { id: 'fab', name: 'Força Aérea Brasileira', type: 'Oficial', score: 95, bias: 'Institucional', note: 'Comunicação oficial da Força.' },
  { id: 'abin', name: 'ABIN — Inteligência', type: 'Oficial', score: 90, bias: 'Institucional', note: 'Releases oficiais; escopo limitado por sigilo.' },
  { id: 'poder360', name: 'Poder360 — Defesa', type: 'Imprensa', score: 82, bias: 'Centro', note: 'Cobertura política e de defesa com boa apuração.' },
  { id: 'aerospacial', name: 'Revista Aerospacial', type: 'Especializada', score: 80, bias: 'Setorial', note: 'Especializada em aeroespacial e defesa.' },
  { id: 'brasildefesa', name: 'Brasil Defesa', type: 'Especializada', score: 76, bias: 'Setorial', note: 'Nichada; útil para detalhes técnicos.' },
  { id: 'ggn', name: 'Jornal GGN — Defesa', type: 'Imprensa', score: 64, bias: 'Centro-esquerda', note: 'Opinativo; cruzar com fontes primárias.' },
  { id: 'intl-reuters', name: 'Agências internacionais', type: 'Internacional', score: 84, bias: 'Centro', note: 'Boa para contexto global; atenção ao enquadramento externo.' },
  { id: 'redes', name: 'Redes sociais (OSINT)', type: 'Redes', score: 40, bias: 'Variável', note: 'Sinal valioso, porém ruidoso; risco de desinformação/FIMI.' },
]

// Critérios da metodologia (exibidos no selo "como calculamos").
export const reliabilityCriteria = [
  'Proximidade da fonte primária (oficial > imprensa > redes)',
  'Histórico de acurácia e correções',
  'Transparência de autoria e método',
  'Separação entre fato e opinião',
  'Corroboração por fontes independentes',
]
