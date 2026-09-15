// -----------------------------------------------------------------------------
// ESTÁGIOS DE TRAMITAÇÃO — o vocabulário do Radar Legislativo.
//
// Derivados do texto oficial de situação da Câmara (`estagioDe` na ponte).
// `pendente` é a proposição cuja situação ainda não foi consultada: o servidor
// consulta em lotes a cada coleta. Antes, sem situação, tudo aparecia como
// "Em comissão · 35%" — uma afirmação sobre um dado que ninguém tinha lido.
// -----------------------------------------------------------------------------

export const LEG_STAGE = {
  pendente: { label: 'Situação não consultada', pct: 0, classes: 'bg-gray-500/15 text-gray-600 dark:text-gray-300' },
  apresentada: { label: 'Apresentada', pct: 15, classes: 'bg-sky-500/15 text-sky-800 dark:text-sky-300' },
  comissao: { label: 'Em comissão', pct: 35, classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300' },
  plenario: { label: 'No plenário', pct: 65, classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  sancao: { label: 'Para sanção', pct: 90, classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  aprovado: { label: 'Virou norma', pct: 100, classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' },
  arquivado: { label: 'Arquivada', pct: 0, classes: 'bg-gray-500/15 text-gray-600 dark:text-gray-300' },
}
