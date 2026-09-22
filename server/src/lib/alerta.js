// -----------------------------------------------------------------------------
// NÍVEL DE ALERTA DO PERÍODO
//
// Média ponderada das urgências das matérias relevantes da janela, de 0 a 100.
//
// ─────────────────────────────────────────────────────────────────────────────
// ELE MARCAVA "CRÍTICO 100/100" SEMPRE, E A CULPA ERA DA AMOSTRA
//
// A função recebia a lista que o clipping já tinha montado — ordenada por
// urgência (`CASE urgency WHEN 'CRITICO' THEN 1 …`) e cortada em `LIMIT 20`.
// Os vinte itens que chegavam aqui eram, por construção, os vinte MAIS
// URGENTES do período. Havendo vinte críticos no acervo — e há —, a média de
// vinte pesos 100 dá exatamente 100.
//
// O painel exibia "nível de alerta CRÍTICO · 100/100" todos os dias,
// independentemente do que estivesse acontecendo no país. Um indicador que
// nunca varia não informa nada; pior, gasta o degrau mais alto da escala em
// rotina, e quem o vê todo dia para de olhar — que é o oposto do que um alerta
// existe para fazer.
//
// Não era erro de fórmula: a média ponderada está certa. Era erro de
// POPULAÇÃO. A correção é medir sobre TODAS as ocorrências relevantes da
// janela, que é o universo sobre o qual a afirmação é feita.
// ─────────────────────────────────────────────────────────────────────────────
//
// O módulo é separado da rota porque a régua é PUBLICADA: `/api/metodo` mostra
// os pesos e as faixas para quem quiser contestar o número, e um valor que
// aparece na tela não pode morar escondido dentro de um handler.
// -----------------------------------------------------------------------------

/** Peso de cada urgência na média. */
export const PESOS = { CRITICO: 100, ALTO: 70, MEDIO: 40, BAIXO: 15 }

/** Em que faixa da média cai cada rótulo. */
export const FAIXAS = [
  { nivel: 'CRITICO', de: 80, ate: 100, rotulo: 'Crítico' },
  { nivel: 'ALERTA', de: 60, ate: 79, rotulo: 'Alerta' },
  { nivel: 'ATENCAO', de: 35, ate: 59, rotulo: 'Atenção' },
  { nivel: 'NORMAL', de: 0, ate: 34, rotulo: 'Normal' },
]

/** Régua publicada em `/api/metodo`. */
export const METODO_ALERTA = {
  escala: '0 a 100',
  pesos: PESOS,
  faixas: FAIXAS,
  regra: 'Média ponderada da urgência de TODAS as matérias aprovadas na janela — não da seleção '
    + 'exibida, que vem ordenada por urgência e cortada.',
  semDado: 'Sem nenhuma ocorrência no período o índice é ausente, não "normal": ausência de dado '
    + 'não é calma.',
}

/**
 * Nível de alerta do período.
 *
 * @param {Array} artigos  TODAS as ocorrências do período, não uma seleção
 *   ordenada por urgência. Passar a lista já cortada reintroduz o viés.
 */
export function nivelDeAlerta(artigos) {
  if (!artigos.length) {
    return { level: null, score: null, basis: 'sem ocorrências no período', distribuicao: null }
  }
  const score = Math.round(artigos.reduce((s, a) => s + (PESOS[a.urgency] ?? PESOS.BAIXO), 0) / artigos.length)
  const level = (FAIXAS.find((f) => score >= f.de) || FAIXAS[FAIXAS.length - 1]).nivel

  // A distribuição viaja com o índice. Um número só não deixa ninguém
  // discordar dele; "100 porque 20 de 20 eram críticos" deixa — e teria
  // denunciado o viés no primeiro olhar, sem precisar ler o SQL.
  const distribuicao = {}
  for (const a of artigos) distribuicao[a.urgency || 'BAIXO'] = (distribuicao[a.urgency || 'BAIXO'] || 0) + 1

  return {
    level,
    score,
    basis: `média ponderada de ${artigos.length} ocorrência(s) relevante(s) do período`,
    distribuicao,
  }
}

export default { nivelDeAlerta, PESOS, FAIXAS, METODO_ALERTA }
