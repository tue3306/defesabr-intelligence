// -----------------------------------------------------------------------------
// ESTADO DA IA — declarado num lugar só
//
// Três telas perguntam "existe um modelo de linguagem ligado a esta
// plataforma?". A resposta é não, e vinha de `isApiConfigured()` em
// `src/api/anthropic.js` — um arquivo de 200 linhas que montava prompts,
// chamava a API da Anthropic e, quando não havia chave, devolvia
// `mockDailyClipping` e `mockWeeklyAnalysis`: um clipping inteiro escrito à
// mão apresentado como saída de modelo.
//
// Esse arquivo saiu. O que sobrou dele em uso era exatamente este booleano.
//
// Quando a integração for feita, é aqui que ela se anuncia: a checagem passa a
// ler a configuração real e as telas que já perguntam continuam funcionando
// sem alteração. Até lá a resposta é `false`, e é verdade.
// -----------------------------------------------------------------------------

/** Existe um modelo de linguagem configurado? Hoje, não. */
export function iaConfigurada() {
  return false
}

/** Por que o campo de síntese está vazio — texto exibido ao usuário. */
export const MOTIVO_SEM_IA =
  'Nenhum modelo de linguagem está conectado a esta plataforma. Os campos de '
  + 'síntese ficam vazios em vez de preenchidos com texto plausível.'

export default { iaConfigurada, MOTIVO_SEM_IA }
