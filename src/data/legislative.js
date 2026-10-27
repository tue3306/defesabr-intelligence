// -----------------------------------------------------------------------------
// ESTÁGIOS DE TRAMITAÇÃO — o vocabulário do Radar Legislativo.
//
// Derivados do texto oficial de situação da Câmara (`estagioDe` na ponte).
// `pendente` é a proposição cuja situação ainda não foi consultada: o servidor
// consulta em lotes a cada coleta. Antes, sem situação, tudo aparecia como
// "Em comissão · 35%" — uma afirmação sobre um dado que ninguém tinha lido.
//
// A barra de progresso não tem percentual fixo por estágio: o número de etapas
// depende do tipo (PEC, PDL e PRC não vão à sanção), e a tela calcula a posição
// no rito do tipo (`ritoDe` em pages/Legislative.jsx).
// -----------------------------------------------------------------------------

export const LEG_STAGE = {
  // Sem destaque: é falta de leitura, não uma etapa. O texto basta.
  pendente: { label: 'Etapa ainda não verificada', classes: 'bg-gray-500/[0.08] font-medium text-gray-600 dark:text-gray-400' },
  apresentada: { label: 'Apresentada', classes: 'bg-sky-500/15 text-sky-800 dark:text-sky-300' },
  comissao: { label: 'Em comissão', classes: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300' },
  plenario: { label: 'No plenário', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  // Saiu da Câmara para a outra Casa. A coleta só lê a Câmara: o que acontece
  // no Senado não é acompanhado aqui.
  senado: { label: 'No Senado', classes: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300' },
  sancao: { label: 'Sanção ou promulgação', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  aprovado: { label: 'Virou norma', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' },
  arquivado: { label: 'Encerrada', classes: 'bg-gray-500/15 text-gray-600 dark:text-gray-300' },
}
