// -----------------------------------------------------------------------------
// RADAR LEGISLATIVO — proposições e votações de Defesa (DEMONSTRATIVO)
// Reserva local, usada só quando o servidor não responde. As proposições reais
// vêm da API de Dados Abertos da Câmara (server/src/collectors/camara.js).
// stage: 'comissao' | 'plenario' | 'sancao' | 'aprovado' | 'arquivado'
// -----------------------------------------------------------------------------

export const LEG_STAGE = {
  comissao: { label: 'Em comissão', pct: 35, classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300' },
  plenario: { label: 'No plenário', pct: 65, classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  sancao: { label: 'Para sanção', pct: 90, classes: 'bg-brand-500/15 text-brand-300' },
  aprovado: { label: 'Aprovado', pct: 100, classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' },
  arquivado: { label: 'Arquivado', pct: 0, classes: 'bg-gray-500/15 text-gray-300' },
}

// `legislativeItems` saiu: proposicoes escritas a mao. As reais vem dos Dados
// Abertos da Camara (/api/legislative), 174 acompanhadas. Sem consumidor.
