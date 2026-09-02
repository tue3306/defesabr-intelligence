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

// ── DUAS UFs QUE A NORMALIZAÇÃO DESTRÓI ──
//
// Normalizar tira o acento, e aí dois estados viram palavras corriqueiras:
//
//   Pará  → "para"   a preposição mais comum do português
//   Acre  → "acre"   adjetivo ("cheiro acre")
//
// O efeito não era sutil. No acervo real o Pará aparecia com 61 menções contra
// 4 do segundo colocado — o mapa do Brasil ficava com um estado em brasa
// porque as notícias diziam "verba PARA a defesa". Um mapa assim não erra por
// pouco: ele inverte a leitura de quem olha.
//
// O que desambigua é justamente o que a normalização joga fora. "Pará" tem
// acento e a preposição não; "Acre" é próprio e leva maiúscula, o adjetivo
// não. Então estes dois são testados contra o texto CRU.
const UF_AMBIGUA = {
  // O ACENTO é o discriminador: a preposição "para" nunca o tem. A caixa não
  // importa — "PARÁ" em manchete caixa-alta continua sendo o estado.
  PA: /(?<![\p{L}\p{N}])par[áÁ](?![\p{L}\p{N}])/iu,
  // Aqui é a MAIÚSCULA: o adjetivo ("cheiro acre") aparece em minúscula no meio
  // da frase, o estado é nome próprio. Caixa-alta de manchete também vale.
  AC: /(?<![\p{L}\p{N}])(?:Acre|ACRE)(?![\p{L}\p{N}])/u,
}

const RX_REGIAO = REGIOES_ESTRATEGICAS.map((r) => ({
  ...r,
  rxs: r.termos.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${normalizar(t)}(?![\\p{L}\\p{N}])`, 'iu')),
}))

/** @returns {{ufs: string[], regioes: string[]}} */
export function detectarLugares(texto) {
  const cru = String(texto || '')
  const palheiro = normalizar(cru)
  if (!palheiro.trim()) return { ufs: [], regioes: [] }
  return {
    // As UFs ambíguas são decididas no texto cru, onde acento e maiúscula
    // ainda existem; as demais seguem pelo caminho normalizado.
    ufs: RX_UF.filter(({ uf, rx }) => (
      UF_AMBIGUA[uf] ? UF_AMBIGUA[uf].test(cru) : rx.test(palheiro)
    )).map((u) => u.uf),
    regioes: RX_REGIAO.filter(({ rxs }) => rxs.some((rx) => rx.test(palheiro))).map((r) => r.id),
  }
}


// -----------------------------------------------------------------------------
// PAISES
//
// O mapa-mundi da interface pintava paises por um numero de "risco" escrito a
// mao — 15 paises com valores inventados, sem relacao nenhuma com o que foi
// coletado. Mapa de calor sem dado por tras e decoracao com aparencia de
// analise, que e a pior combinacao: convida a tirar conclusao de nada.
//
// Aqui a correlacao passa a ser MEDIDA: quantas noticias do acervo mencionam
// cada pais. Nao e indice de risco nem juizo geopolitico — e contagem de
// mencao, e a API declara isso no proprio corpo da resposta.
//
// As chaves sao os nomes EM INGLES do world-atlas que o mapa usa
// (`properties.name`); sem isso o pais detectado nao acha o poligono para
// pintar. Os `termos` sao como a imprensa brasileira escreve, com as variantes
// que de fato aparecem (gentilico e capital incluidos, porque "forcas
// venezuelanas" e "acordo em Caracas" sao mencoes ao pais).
// -----------------------------------------------------------------------------
export const PAISES = [
  // Vizinhanca sul-americana — prioridade do produto
  { nome: 'Argentina', pt: 'Argentina', termos: ['argentina', 'argentino', 'argentinos', 'buenos aires'] },
  { nome: 'Bolivia', pt: 'Bolivia', termos: ['bolivia', 'boliviano', 'bolivianos', 'la paz'] },
  { nome: 'Chile', pt: 'Chile', termos: ['chile', 'chileno', 'chilenos'] },
  { nome: 'Colombia', pt: 'Colombia', termos: ['colombia', 'colombiano', 'colombianos', 'bogota'] },
  { nome: 'Ecuador', pt: 'Equador', termos: ['equador', 'equatoriano', 'equatorianos', 'quito'] },
  { nome: 'Guyana', pt: 'Guiana', termos: ['guiana', 'essequibo', 'georgetown'] },
  { nome: 'Paraguay', pt: 'Paraguai', termos: ['paraguai', 'paraguaio', 'paraguaios', 'assuncao'] },
  { nome: 'Peru', pt: 'Peru', termos: ['peru', 'peruano', 'peruanos'] },
  { nome: 'Suriname', pt: 'Suriname', termos: ['suriname', 'paramaribo'] },
  { nome: 'Uruguay', pt: 'Uruguai', termos: ['uruguai', 'uruguaio', 'uruguaios', 'montevideu'] },
  { nome: 'Venezuela', pt: 'Venezuela', termos: ['venezuela', 'venezuelano', 'venezuelanos', 'caracas'] },

  // Resto das Americas
  { nome: 'United States of America', pt: 'Estados Unidos', termos: ['estados unidos', 'eua', 'norte-americano', 'norte-americanos', 'washington', 'pentagono', 'casa branca'] },
  { nome: 'Canada', pt: 'Canada', termos: ['canada', 'canadense', 'canadenses', 'ottawa'] },
  { nome: 'Mexico', pt: 'Mexico', termos: ['mexico', 'mexicano', 'mexicanos'] },
  { nome: 'Cuba', pt: 'Cuba', termos: ['cuba', 'cubano', 'cubanos', 'havana'] },
  { nome: 'Haiti', pt: 'Haiti', termos: ['haiti', 'haitiano', 'haitianos'] },

  // Potencias e parceiros com peso em defesa
  { nome: 'China', pt: 'China', termos: ['china', 'chines', 'chinesa', 'chineses', 'pequim'] },
  { nome: 'Russia', pt: 'Russia', termos: ['russia', 'russo', 'russa', 'russos', 'moscou', 'kremlin'] },
  { nome: 'Ukraine', pt: 'Ucrania', termos: ['ucrania', 'ucraniano', 'ucranianos', 'kiev'] },
  { nome: 'France', pt: 'Franca', termos: ['franca', 'frances', 'francesa', 'franceses', 'paris'] },
  { nome: 'United Kingdom', pt: 'Reino Unido', termos: ['reino unido', 'inglaterra', 'britanico', 'britanica', 'britanicos', 'londres'] },
  { nome: 'Germany', pt: 'Alemanha', termos: ['alemanha', 'alemao', 'alema', 'alemaes', 'berlim'] },
  { nome: 'Italy', pt: 'Italia', termos: ['italia', 'italiano', 'italianos'] },
  { nome: 'Spain', pt: 'Espanha', termos: ['espanha', 'espanhol', 'espanhola', 'espanhois', 'madri'] },
  { nome: 'Portugal', pt: 'Portugal', termos: ['portugal', 'portugues', 'portuguesa', 'portugueses', 'lisboa'] },
  { nome: 'Israel', pt: 'Israel', termos: ['israel', 'israelense', 'israelenses'] },
  { nome: 'Iran', pt: 'Ira', termos: ['iraniano', 'iranianos', 'teera'] },
  { nome: 'India', pt: 'India', termos: ['india', 'indiano', 'indianos', 'nova delhi'] },
  { nome: 'Japan', pt: 'Japao', termos: ['japao', 'japones', 'japonesa', 'japoneses', 'toquio'] },
  { nome: 'South Korea', pt: 'Coreia do Sul', termos: ['coreia do sul', 'sul-coreano', 'sul-coreanos', 'seul'] },
  { nome: 'North Korea', pt: 'Coreia do Norte', termos: ['coreia do norte', 'norte-coreano', 'norte-coreanos', 'pyongyang'] },
  { nome: 'Turkey', pt: 'Turquia', termos: ['turquia', 'turco', 'turcos', 'ancara'] },
  { nome: 'South Africa', pt: 'Africa do Sul', termos: ['africa do sul', 'sul-africano', 'sul-africanos'] },
  { nome: 'Angola', pt: 'Angola', termos: ['angola', 'angolano', 'angolanos', 'luanda'] },
  { nome: 'Nigeria', pt: 'Nigeria', termos: ['nigeria', 'nigeriano', 'nigerianos'] },
  { nome: 'Sweden', pt: 'Suecia', termos: ['suecia', 'sueco', 'sueca', 'suecos', 'estocolmo', 'saab'] },
]

// A mesma armadilha do filtro de relevancia, agora com nome de pais: sem
// fronteira de palavra, "cuba" casa dentro de "incubadora" e "ira" (Ira) casa
// com a forma verbal "ira" depois que a normalizacao tira o acento. Tudo passa
// por lookaround, e o Ira entra so por gentilico e capital.
const RX_PAIS = PAISES.map((p) => ({
  ...p,
  rxs: p.termos.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${normalizar(t)}(?![\\p{L}\\p{N}])`, 'iu')),
}))

/**
 * Paises mencionados num texto.
 *
 * Devolve os nomes em ingles (a chave do mapa), para quem consome nao precisar
 * saber que ha traducao no meio do caminho.
 *
 * @returns {string[]}
 */
export function detectarPaises(texto) {
  const palheiro = normalizar(texto || '')
  if (!palheiro.trim()) return []
  return RX_PAIS.filter(({ rxs }) => rxs.some((rx) => rx.test(palheiro))).map((p) => p.nome)
}

/** Nome em portugues de um pais, a partir da chave em ingles. */
export const nomePtDoPais = (nome) => PAISES.find((p) => p.nome === nome)?.pt || nome

export default { UFS, REGIOES_ESTRATEGICAS, PAISES, detectarLugares, detectarPaises, nomePtDoPais }

