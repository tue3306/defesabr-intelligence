// -----------------------------------------------------------------------------
// LEITURA DE PARÂMETROS DE CONSULTA
//
// O padrão espalhado pelas rotas era `Math.min(parseInt(x, 10) || 20, 60)`, e
// ele tem dois furos que só aparecem quando alguém digita um valor estranho na
// barra de endereço:
//
//  1. TETO CONTORNÁVEL. `Math.min(-1, 60)` é -1, e `LIMIT -1` no SQLite
//     significa SEM LIMITE. Conferido no acervo: `?limit=-1` devolvia as 656
//     linhas em vez das 60 do teto. O parâmetro que existia para proteger o
//     servidor era o que o desprotegia.
//
//  2. VAZIO SILENCIOSO. `?days=-5` virava `'-−5 days'` no strftime, que o
//     SQLite não entende: a comparação de data dá NULL, nenhuma linha casa, e
//     a resposta sai com `coletados: 0`. Quem lê a tela conclui que a coleta
//     não trouxe nada, quando na verdade a pergunta é que estava malformada.
//
// `inteiro()` resolve os dois: sempre devolve um número dentro da faixa. Um
// valor fora dela é PRESO ao limite mais próximo, não descartado nem propagado
// — a resposta continua sendo um dado verdadeiro sobre uma janela válida.
// -----------------------------------------------------------------------------

/**
 * Lê um inteiro de query string, sempre dentro da faixa.
 *
 * @param {*} valor    o que veio de `req.query`
 * @param {object} o   { padrao, min, max }
 */
export function inteiro(valor, { padrao, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number.parseInt(valor, 10)
  // `Number.isFinite` cobre NaN (texto), e também Infinity.
  if (!Number.isFinite(n)) return padrao
  return Math.min(Math.max(n, min), max)
}

/** Janela em dias. O teto de 3650 evita `strftime` com número absurdo. */
export const dias = (valor, padrao = 30) =>
  inteiro(valor, { padrao, min: 1, max: 3650 })

/** Quantidade de itens. O teto protege memória e tempo de resposta. */
export const limite = (valor, padrao = 20, max = 60) =>
  inteiro(valor, { padrao, min: 1, max })

export default { inteiro, dias, limite }
