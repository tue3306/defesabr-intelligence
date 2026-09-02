import { normalizar } from './relevance.js'

// -----------------------------------------------------------------------------
// DETECÇÃO GEOGRÁFICA
//
// Descobre a QUE LUGAR uma notícia se refere, procurando menções a unidades da
// federação no texto.
//
// O que este módulo é: uma contagem de menções. O que ele NÃO é: uma medida de
// atividade, risco ou tensão. Uma notícia sobre orçamento que cite "Brasília"
// conta igual a uma sobre operação de fronteira que cite "Roraima" — e o mapa
// precisa dizer isso, senão vira um mapa de calor que sugere perigo onde há só
// cobertura jornalística.
//
// Três cuidados que a implementação ingênua erraria:
//
//  • SIGLA CURTA. Procurar "PA" ou "AC" no texto casa com qualquer palavra que
//    contenha essas letras. Siglas de duas letras são ignoradas de propósito.
//  • AMBIGUIDADE DE NOME. "Amazonas" é estado e rio; "Rio de Janeiro" é estado
//    e cidade; "Acre" também é substantivo comum. Aceitamos o ruído e o
//    declaramos, em vez de fingir precisão.
//  • PLURAL DE REGIÃO. "Amazônia" não é UF, mas é a região que mais importa
//    aqui — entra como agrupamento próprio.
// -----------------------------------------------------------------------------

/**
 * As 27 unidades da federação, com a posição no CARTOGRAMA.
 *
 * `linha`/`coluna` desenham um mapa esquemático em grade: cada estado ocupa um
 * quadrado de tamanho igual, arranjado na posição geográfica aproximada.
 *
 * A escolha é deliberada. Um mapa geográfico real faria São Paulo (menor) somar
 * menos atenção visual que o Amazonas (enorme) para o mesmo número de notícias
 * — a área do estado distorceria a leitura do dado. No cartograma, cada estado
 * pesa igual, que é o que a contagem mede.
 */
export const UFS = [
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte', linha: 0, coluna: 2 },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte', linha: 0, coluna: 4 },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte', linha: 1, coluna: 1 },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte', linha: 1, coluna: 3 },
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste', linha: 1, coluna: 4 },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste', linha: 1, coluna: 5 },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste', linha: 1, coluna: 6 },
  { uf: 'AC', nome: 'Acre', regiao: 'Norte', linha: 2, coluna: 0 },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte', linha: 2, coluna: 1 },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte', linha: 2, coluna: 3 },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste', linha: 2, coluna: 4 },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste', linha: 2, coluna: 6 },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste', linha: 3, coluna: 5 },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste', linha: 3, coluna: 6 },
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste', linha: 3, coluna: 2 },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste', linha: 3, coluna: 3 },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', linha: 3, coluna: 4 },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste', linha: 4, coluna: 6 },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', linha: 4, coluna: 2 },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', linha: 4, coluna: 3 },
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste', linha: 4, coluna: 4 },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste', linha: 4, coluna: 5 },
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste', linha: 5, coluna: 3 },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste', linha: 5, coluna: 4 },
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul', linha: 6, coluna: 3 },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul', linha: 7, coluna: 3 },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul', linha: 8, coluna: 2 },
]

/**
 * Regiões estratégicas — não são UFs, mas são o recorte que este domínio usa.
 * Contadas em separado, com a lista de UFs que cada uma cobre.
 */
export const REGIOES_ESTRATEGICAS = [
  { id: 'amazonia', nome: 'Amazônia', termos: ['amazonia', 'amazonia legal', 'floresta amazonica'], ufs: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'MT', 'MA'] },
  { id: 'amazonia-azul', nome: 'Amazônia Azul', termos: ['amazonia azul', 'zona economica exclusiva', 'plataforma continental', 'atlantico sul'], ufs: [] },
  { id: 'faixa-fronteira', nome: 'Faixa de fronteira', termos: ['faixa de fronteira', 'triplice fronteira', 'operacao agata'], ufs: ['AC', 'AM', 'AP', 'MS', 'MT', 'PA', 'PR', 'RO', 'RR', 'RS', 'SC'] },
]

// Nomes por extensão, normalizados. As siglas de duas letras ficam de fora:
// procurar "PA" ou "AC" casaria com qualquer palavra que contenha as letras.
const RX_UF = UFS.map((u) => ({
  ...u,
  rx: new RegExp(`(?<![\\p{L}\\p{N}])${normalizar(u.nome)}(?![\\p{L}\\p{N}])`, 'iu'),
}))

const RX_REGIAO = REGIOES_ESTRATEGICAS.map((r) => ({
  ...r,
  rxs: r.termos.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${normalizar(t)}(?![\\p{L}\\p{N}])`, 'iu')),
}))

/** @returns {{ufs: string[], regioes: string[]}} */
export function detectarLugares(texto) {
  const palheiro = normalizar(texto || '')
  if (!palheiro.trim()) return { ufs: [], regioes: [] }
  return {
    ufs: RX_UF.filter(({ rx }) => rx.test(palheiro)).map((u) => u.uf),
    regioes: RX_REGIAO.filter(({ rxs }) => rxs.some((rx) => rx.test(palheiro))).map((r) => r.id),
  }
}

export default { UFS, REGIOES_ESTRATEGICAS, detectarLugares }
