import { request } from './client'

// -----------------------------------------------------------------------------
// O ASSISTENTE, DO LADO DO NAVEGADOR
//
// Este arquivo já existiu como um booleano: `iaConfigurada()` devolvia `false`
// e três telas o consultavam para dizer, com honestidade, que não havia modelo
// nenhum ligado à plataforma.
//
// Ele ganhou o outro lado. O que NÃO mudou é o princípio: a chave nunca passa
// por aqui. Houve um campo de chave nas Configurações que a guardava em texto
// puro no `localStorage` — de onde qualquer extensão a lê — e a mandava do
// navegador direto ao provedor. Agora quem guarda e quem chama é o servidor;
// este módulo só conversa com `/api/ia/*`, autenticado pela sessão.
//
// TODO TEXTO QUE VOLTA DAQUI VEM MARCADO. As respostas trazem `origem:
// 'modelo'` e o nome do modelo, e as telas exibem essa marca. A diferença entre
// "a mesa de análise avaliou" e "um modelo resumiu" é a diferença entre um
// produto de inteligência e um gerador de texto.
// -----------------------------------------------------------------------------

/** Estado do recurso nesta instalação. Nunca devolve a chave. */
export async function estadoIa() {
  const { data } = await request('GET /ia/estado')
  return data
}

/** Gera (ou devolve do cache do dia) o resumo executivo do período. */
export async function gerarSintese({ days = 7, forcar = false } = {}) {
  const { data } = await request('POST /ia/sintese', { body: { days, forcar } })
  return data
}

/** Pergunta livre sobre o acervo. O contexto é montado pelo servidor. */
export async function perguntarAoAcervo({ pergunta, days = 30 }) {
  const { data } = await request('POST /ia/perguntar', { body: { pergunta, days } })
  return data
}

/** Guarda a chave DA PRÓPRIA CONTA, cifrada no servidor. Qualquer sessão. */
export async function salvarMinhaChave(chave) {
  const { data } = await request('PUT /ia/minha-chave', { body: { chave } })
  return data
}

/** Remove a chave da conta. A da instalação, se houver, volta a valer. */
export async function removerMinhaChave() {
  const { data } = await request('DELETE /ia/minha-chave')
  return data
}

/** Modelo escolhido pela conta. Vazio volta a herdar o da instalação. */
export async function salvarMeuModelo(modelo) {
  const { data } = await request('PUT /ia/meu-modelo', { body: { modelo } })
  return data
}

/** Guarda a chave DA INSTALAÇÃO. Só administrador. */
export async function salvarChaveIa(chave) {
  const { data } = await request('PUT /ia/chave', { body: { chave } })
  return data
}

/** Remove a chave guardada. */
export async function removerChaveIa() {
  const { data } = await request('DELETE /ia/chave')
  return data
}

/** Troca o modelo usado. Vazio volta ao padrão. */
export async function salvarModeloIa(modelo) {
  const { data } = await request('PUT /ia/modelo', { body: { modelo } })
  return data
}

/**
 * Por que o campo de síntese pode estar vazio.
 *
 * Continua exportado porque continua verdade quando não há chave — e é o texto
 * que as telas mostram no lugar de um parágrafo inventado.
 */
export const MOTIVO_SEM_IA =
  'Nenhum modelo de linguagem está conectado a esta instalação. Os campos de '
  + 'síntese ficam vazios em vez de preenchidos com texto plausível.'

export default {
  estadoIa, gerarSintese, perguntarAoAcervo,
  salvarMinhaChave, removerMinhaChave, salvarMeuModelo,
  salvarChaveIa, removerChaveIa, salvarModeloIa, MOTIVO_SEM_IA,
}
