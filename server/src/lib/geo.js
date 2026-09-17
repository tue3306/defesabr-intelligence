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
// O CAMPO `pt` E DE EXIBICAO; `termos` E DE DETECCAO. Nao confundir.
//
// `pt` aparece na tela — no mapa, no dossie, na lista de selecao — e estava sem
// acento em catorze paises. "Ira" num produto em portugues nao le como o pais:
// le como o verbo, ou como substantivo de raiva. "Russia", "Japao" e "Franca"
// simplesmente pareciam erro de digitacao, num painel cujo argumento e rigor.
//
// `termos` continua SEM acento de proposito: e comparado contra o texto ja
// normalizado por `normalizar()`, e acentua-lo faria a deteccao parar de casar
// com qualquer coisa. Os dois campos parecem o mesmo tipo de dado e nao sao.
export const PAISES = [
  // ── O BRASIL ──
  //
  // Faltava. A lista cobria 36 paises estrangeiros e omitia justamente aquele
  // de que a plataforma trata: quem clicasse no Brasil no mapa via "0
  // noticia(s)" e nenhuma manchete, porque nada jamais contou mencoes a ele.
  //
  // O sintoma chegou a ser contornado — o mapa passou a abrir no pais mais
  // citado em vez de no Brasil, com um comentario dizendo que o Brasil era "o
  // unico pais sem contagem". Contornar o sintoma deixou a causa de pe.
  //
  // Ele e contado como qualquer outro, mas NAO entra na escala de cor: quase
  // toda materia do acervo o menciona, entao normalizar por ele achataria os
  // 36 restantes em cinza. Ver `foraDaEscala` e o calculo de `maximo` em
  // /news/countries. E o pais-base, nao um correlato estrangeiro.
  {
    nome: 'Brazil', iso: 'BR',
    pt: 'Brasil',
    foraDaEscala: true,
    termos: ['brasil', 'brasileiro', 'brasileira', 'brasileiros', 'brasileiras', 'brasilia'],
  },

  // ── OS TERMOS EM INGLÊS ──
  //
  // A lista foi escrita para a imprensa brasileira, e as fontes internacionais
  // (Defense News, BBC World, The Guardian, Al Jazeera) escrevem em inglês: sem
  // estes termos, uma matéria da Reuters sobre "Ukrainian drones over Moscow"
  // não citava país nenhum, e o mapa mundial ficava cego justamente para quem
  // mais cobre o mundo.
  //
  // Os EUA em inglês NUNCA entram por "us" sozinho: normalizado, é o pronome
  // ("help us") e, em português, o fim de "US Open". Entram por "united states",
  // "u.s." (com os pontos escapados — ver `escapar`) e por expressões em que
  // "us" só pode ser o país ("us military", "us troops").

  // Vizinhanca sul-americana — prioridade do produto
  { nome: 'Argentina', iso: 'AR', pt: 'Argentina', termos: ['argentina', 'argentino', 'argentinos', 'buenos aires', 'argentine', 'argentinian'] },
  { nome: 'Bolivia', iso: 'BO', pt: 'Bolívia', termos: ['bolivia', 'boliviano', 'bolivianos', 'la paz'] },
  { nome: 'Chile', iso: 'CL', pt: 'Chile', termos: ['chile', 'chileno', 'chilenos'] },
  { nome: 'Colombia', iso: 'CO', pt: 'Colômbia', termos: ['colombia', 'colombiano', 'colombianos', 'bogota', 'colombian'] },
  { nome: 'Ecuador', iso: 'EC', pt: 'Equador', termos: ['equador', 'equatoriano', 'equatorianos', 'quito'] },
  { nome: 'Guyana', iso: 'GY', pt: 'Guiana', termos: ['guiana', 'essequibo', 'georgetown'] },
  { nome: 'Paraguay', iso: 'PY', pt: 'Paraguai', termos: ['paraguai', 'paraguaio', 'paraguaios', 'assuncao'] },
  { nome: 'Peru', iso: 'PE', pt: 'Peru', termos: ['peru', 'peruano', 'peruanos'] },
  { nome: 'Suriname', iso: 'SR', pt: 'Suriname', termos: ['suriname', 'paramaribo'] },
  { nome: 'Uruguay', iso: 'UY', pt: 'Uruguai', termos: ['uruguai', 'uruguaio', 'uruguaios', 'montevideu'] },
  { nome: 'Venezuela', iso: 'VE', pt: 'Venezuela', termos: ['venezuela', 'venezuelano', 'venezuelanos', 'venezuelana', 'venezuelanas', 'caracas', 'venezuelan', 'venezuelans'] },

  // Resto das Americas
  {
    nome: 'United States of America', iso: 'US', pt: 'Estados Unidos',
    termos: [
      'estados unidos', 'eua', 'norte-americano', 'norte-americanos', 'norte-americana', 'norte-americanas',
      'estadunidense', 'estadunidenses', 'washington', 'pentagono', 'casa branca',
      'governo americano', 'tropas americanas', 'militares americanos', 'forcas americanas',
      'united states', 'u.s.', 'us military', 'us army', 'us navy', 'us air force', 'us troops',
      'us forces', 'us officials', 'us president', 'american troops', 'american forces',
      'american soldiers', 'pentagon', 'white house', 'space force', 'marine corps', 'us marines',
      'centcom', 'southcom', 'indopacom', 'spacecom',
    ],
  },
  { nome: 'Canada', iso: 'CA', pt: 'Canadá', termos: ['canada', 'canadense', 'canadenses', 'ottawa', 'canadian', 'canadians'] },
  { nome: 'Mexico', iso: 'MX', pt: 'México', termos: ['mexico', 'mexicano', 'mexicanos', 'mexican', 'mexicans'] },
  { nome: 'Cuba', iso: 'CU', pt: 'Cuba', termos: ['cuba', 'cubano', 'cubanos', 'havana', 'cuban'] },
  { nome: 'Haiti', iso: 'HT', pt: 'Haiti', termos: ['haiti', 'haitiano', 'haitianos', 'haitian'] },

  // Potencias e parceiros com peso em defesa
  { nome: 'China', iso: 'CN', pt: 'China', termos: ['china', 'chines', 'chinesa', 'chineses', 'pequim', 'chinese', 'beijing'] },
  { nome: 'Russia', iso: 'RU', pt: 'Rússia', termos: ['russia', 'russo', 'russa', 'russos', 'russas', 'moscou', 'moscovo', 'kremlin', 'russian', 'russians', 'moscow'] },
  { nome: 'Ukraine', iso: 'UA', pt: 'Ucrânia', termos: ['ucrania', 'ucraniano', 'ucranianos', 'ucraniana', 'ucranianas', 'kiev', 'ukraine', 'ukrainian', 'ukrainians', 'kyiv'] },
  // "France" em inglês, mas não a agência: "segundo a France-Presse" é crédito
  // de despacho, não menção ao país. Ver EXPRESSOES_NEUTRAS.
  { nome: 'France', iso: 'FR', pt: 'França', termos: ['franca', 'frances', 'francesa', 'franceses', 'paris', 'france', 'french'] },
  { nome: 'United Kingdom', iso: 'GB', pt: 'Reino Unido', termos: ['reino unido', 'inglaterra', 'britanico', 'britanica', 'britanicos', 'londres', 'united kingdom', 'uk', 'britain', 'british', 'london'] },
  { nome: 'Germany', iso: 'DE', pt: 'Alemanha', termos: ['alemanha', 'alemao', 'alema', 'alemaes', 'berlim', 'germany', 'german', 'berlin'] },
  { nome: 'Italy', iso: 'IT', pt: 'Itália', termos: ['italia', 'italiano', 'italianos', 'italy', 'italian'] },
  { nome: 'Spain', iso: 'ES', pt: 'Espanha', termos: ['espanha', 'espanhol', 'espanhola', 'espanhois', 'madri', 'spain', 'spanish'] },
  { nome: 'Portugal', iso: 'PT', pt: 'Portugal', termos: ['portugal', 'portugues', 'portuguesa', 'portugueses', 'lisboa'] },
  { nome: 'Poland', iso: 'PL', pt: 'Polônia', termos: ['polonia', 'polones', 'polonesa', 'poloneses', 'varsovia', 'poland', 'polish', 'warsaw'] },
  { nome: 'Finland', iso: 'FI', pt: 'Finlândia', termos: ['finlandia', 'finlandes', 'finlandesa', 'finlandeses', 'helsinque', 'finland', 'finnish', 'helsinki'] },
  { nome: 'Sweden', iso: 'SE', pt: 'Suécia', termos: ['suecia', 'sueco', 'sueca', 'suecos', 'estocolmo', 'saab', 'sweden', 'swedish', 'stockholm'] },
  { nome: 'Belarus', iso: 'BY', pt: 'Belarus', termos: ['belarus', 'bielorrussia', 'bielorrusso', 'bielorrussos', 'minsk', 'belarusian'] },
  { nome: 'Turkey', iso: 'TR', pt: 'Turquia', termos: ['turquia', 'turco', 'turcos', 'ancara', 'turkey', 'turkish', 'turkiye', 'ankara'] },
  // Flanco leste e Báltico: onde a Otan abate drone e a imprensa diz o país.
  { nome: 'Denmark', iso: 'DK', pt: 'Dinamarca', termos: ['dinamarca', 'dinamarques', 'dinamarquesa', 'dinamarqueses', 'copenhague', 'denmark', 'danish', 'copenhagen'] },
  { nome: 'Norway', iso: 'NO', pt: 'Noruega', termos: ['noruega', 'noruegues', 'norueguesa', 'noruegueses', 'oslo', 'norway', 'norwegian'] },
  { nome: 'Netherlands', iso: 'NL', pt: 'Países Baixos', termos: ['holanda', 'paises baixos', 'holandes', 'holandesa', 'holandeses', 'amsterda', 'netherlands', 'dutch', 'amsterdam'] },
  { nome: 'Belgium', iso: 'BE', pt: 'Bélgica', termos: ['belgica', 'belga', 'belgas', 'belgium', 'belgian'] },
  { nome: 'Greece', iso: 'GR', pt: 'Grécia', termos: ['grecia', 'grego', 'grega', 'gregos', 'atenas', 'greece', 'greek', 'athens'] },
  { nome: 'Lithuania', iso: 'LT', pt: 'Lituânia', termos: ['lituania', 'lituano', 'lituana', 'lituanos', 'vilnius', 'lithuania', 'lithuanian'] },
  { nome: 'Latvia', iso: 'LV', pt: 'Letônia', termos: ['letonia', 'riga', 'latvia', 'latvian'] },
  { nome: 'Estonia', iso: 'EE', pt: 'Estônia', termos: ['estonia', 'estoniano', 'estonianos', 'tallinn', 'estonian'] },
  { nome: 'Romania', iso: 'RO', pt: 'Romênia', termos: ['romenia', 'romeno', 'romena', 'romenos', 'bucareste', 'romania', 'romanian', 'bucharest'] },
  { nome: 'Serbia', iso: 'RS', pt: 'Sérvia', termos: ['servia', 'servio', 'servios', 'belgrado', 'serbia', 'serbian', 'belgrade'] },
  { nome: 'Kosovo', iso: 'XK', pt: 'Kosovo', termos: ['kosovo', 'kosovar', 'pristina'] },

  // Oriente Medio
  { nome: 'Israel', iso: 'IL', pt: 'Israel', termos: ['israel', 'israelense', 'israelenses', 'israelita', 'israelitas', 'israeli', 'israelis', 'tel aviv', 'telavive'] },
  // Faixa de Gaza e Cisjordania: o world-atlas as desenha como "Palestine".
  { nome: 'Palestine', iso: 'PS', pt: 'Palestina', termos: ['palestina', 'palestino', 'palestinos', 'palestinas', 'gaza', 'cisjordania', 'palestine', 'palestinian', 'palestinians', 'west bank'] },
  // "Ira" sem til nao entra: normalizado, e o verbo "ira". O pais e reconhecido
  // pelo gentilico, pela capital e — no texto CRU — por "Irã" com til e por
  // "Irão" com maiúscula. Ver PAIS_COM_ACENTO.
  { nome: 'Iran', iso: 'IR', pt: 'Irã', termos: ['iraniano', 'iranianos', 'iraniana', 'iranianas', 'teera', 'teerao', 'iran', 'iranian', 'iranians', 'tehran'] },
  { nome: 'Iraq', iso: 'IQ', pt: 'Iraque', termos: ['iraque', 'iraquiano', 'iraquianos', 'bagda', 'iraq', 'iraqi', 'baghdad'] },
  // "Sirio" tambem e o hospital Sirio-Libanes, apagado antes. Ver EXPRESSOES_NEUTRAS.
  { nome: 'Syria', iso: 'SY', pt: 'Síria', termos: ['siria', 'sirio', 'sirios', 'syria', 'syrian', 'damascus'] },
  { nome: 'Lebanon', iso: 'LB', pt: 'Líbano', termos: ['libano', 'libanes', 'libanesa', 'libaneses', 'beirute', 'lebanon', 'lebanese', 'beirut'] },
  { nome: 'Yemen', iso: 'YE', pt: 'Iêmen', termos: ['iemen', 'iemenita', 'iemenitas', 'sanaa', 'yemen', 'yemeni'] },
  { nome: 'Saudi Arabia', iso: 'SA', pt: 'Arábia Saudita', termos: ['arabia saudita', 'saudita', 'sauditas', 'riad', 'saudi arabia', 'saudi', 'riyadh'] },
  { nome: 'Qatar', iso: 'QA', pt: 'Catar', termos: ['catar', 'catari', 'qatar', 'qatari', 'doha'] },
  { nome: 'Egypt', iso: 'EG', pt: 'Egito', termos: ['egito', 'egipcio', 'egipcios', 'cairo', 'egypt', 'egyptian'] },

  // Asia
  { nome: 'India', iso: 'IN', pt: 'Índia', termos: ['india', 'indiano', 'indianos', 'nova delhi', 'nova deli', 'indian', 'new delhi'] },
  { nome: 'Pakistan', iso: 'PK', pt: 'Paquistão', termos: ['paquistao', 'paquistanes', 'paquistaneses', 'islamabad', 'pakistan', 'pakistani'] },
  { nome: 'Afghanistan', iso: 'AF', pt: 'Afeganistão', termos: ['afeganistao', 'afegao', 'afegaos', 'cabul', 'afghanistan', 'afghan', 'kabul'] },
  { nome: 'Japan', iso: 'JP', pt: 'Japão', termos: ['japao', 'japones', 'japonesa', 'japoneses', 'toquio', 'japan', 'japanese', 'tokyo'] },
  { nome: 'South Korea', iso: 'KR', pt: 'Coreia do Sul', termos: ['coreia do sul', 'sul-coreano', 'sul-coreanos', 'sul-coreana', 'seul', 'south korea', 'south korean', 'seoul'] },
  { nome: 'North Korea', iso: 'KP', pt: 'Coreia do Norte', termos: ['coreia do norte', 'norte-coreano', 'norte-coreanos', 'norte-coreana', 'pyongyang', 'north korea', 'north korean', 'north koreans'] },
  { nome: 'Taiwan', iso: 'TW', pt: 'Taiwan', termos: ['taiwan', 'taiwanes', 'taiwanesa', 'taiwaneses', 'taipei', 'taipe', 'taiwanese'] },
  { nome: 'Myanmar', iso: 'MM', pt: 'Mianmar', termos: ['mianmar', 'myanmar', 'birmania', 'burma'] },
  { nome: 'Philippines', iso: 'PH', pt: 'Filipinas', termos: ['filipinas', 'filipino', 'filipinos', 'manila', 'philippines', 'philippine'] },
  { nome: 'Vietnam', iso: 'VN', pt: 'Vietnã', termos: ['vietna', 'vietnamita', 'vietnamitas', 'hanoi', 'vietnam', 'vietnamese'] },
  { nome: 'Australia', iso: 'AU', pt: 'Austrália', termos: ['australia', 'australiano', 'australiana', 'australianos', 'canberra', 'australian'] },

  // Africa
  { nome: 'South Africa', iso: 'ZA', pt: 'África do Sul', termos: ['africa do sul', 'sul-africano', 'sul-africanos', 'south africa', 'south african'] },
  { nome: 'Angola', iso: 'AO', pt: 'Angola', termos: ['angola', 'angolano', 'angolanos', 'luanda'] },
  { nome: 'Nigeria', iso: 'NG', pt: 'Nigéria', termos: ['nigeria', 'nigeriano', 'nigerianos', 'nigerian'] },
  { nome: 'Sudan', iso: 'SD', pt: 'Sudão', termos: ['sudao', 'sudanes', 'sudanesa', 'sudaneses', 'cartum', 'sudan', 'sudanese', 'khartoum'] },
  { nome: 'Dem. Rep. Congo', iso: 'CD', pt: 'RD Congo', termos: ['republica democratica do congo', 'rd congo', 'kinshasa', 'democratic republic of congo', 'democratic republic of the congo', 'drc'] },
  { nome: 'Rwanda', iso: 'RW', pt: 'Ruanda', termos: ['ruanda', 'ruandes', 'kigali', 'rwanda', 'rwandan'] },
  { nome: 'Mali', iso: 'ML', pt: 'Mali', termos: ['mali', 'bamako', 'malian'] },
  { nome: 'Burkina Faso', iso: 'BF', pt: 'Burkina Faso', termos: ['burkina faso', 'uagadugu', 'ouagadougou'] },
  // "Rio Niger" e "delta do Niger" (que fica na Nigeria) sao apagados antes.
  { nome: 'Niger', iso: 'NE', pt: 'Níger', termos: ['niger', 'niamey', 'nigerien'] },
  { nome: 'Libya', iso: 'LY', pt: 'Líbia', termos: ['libia', 'libio', 'libios', 'tripoli', 'libya', 'libyan'] },
  { nome: 'Somalia', iso: 'SO', pt: 'Somália', termos: ['somalia', 'somali', 'somalis', 'mogadiscio', 'mogadishu'] },
  { nome: 'Ethiopia', iso: 'ET', pt: 'Etiópia', termos: ['etiopia', 'etiope', 'etiopes', 'adis abeba', 'ethiopia', 'ethiopian', 'addis ababa'] },
  { nome: 'Kenya', iso: 'KE', pt: 'Quênia', termos: ['quenia', 'queniano', 'quenianos', 'nairobi', 'kenya', 'kenyan'] },
]

/**
 * Expressões que CONTÊM nome de país sem ser menção a ele. São apagadas do
 * texto normalizado antes da detecção — e da lente mundial, que usa a mesma
 * função.
 *
 *   "Hospital Sírio-Libanês"  hospital de São Paulo, e não Síria nem Líbano. O
 *                             hífen é fronteira de palavra, então "sirio" e
 *                             "libanes" casariam separados e o boletim médico
 *                             de um político entraria como teatro de guerra.
 *   "France-Presse"           crédito de agência no fim do despacho.
 *   "rio Níger"               rio que atravessa cinco países.
 *   "Márcio França"           ministro brasileiro.
 */
const EXPRESSOES_NEUTRAS = [
  'sirio-libanes', 'sirio libanes', 'france-presse', 'france presse', 'agence france',
  'rio niger', 'delta do niger', 'niger river', 'niger delta',
  // Sobrenome, não país: Márcio França é ministro, e "França" assina foto no G1.
  'marcio franca',
]

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RX_NEUTRAS = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${EXPRESSOES_NEUTRAS.map((t) => escapar(normalizar(t))).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
)

/** Apaga as expressões neutras de um texto JÁ normalizado. */
export const neutralizar = (palheiro) => String(palheiro || '').replace(RX_NEUTRAS, ' ')

// A mesma armadilha do filtro de relevancia, agora com nome de pais: sem
// fronteira de palavra, "cuba" casa dentro de "incubadora" e "ira" (Ira) casa
// com a forma verbal "ira" depois que a normalizacao tira o acento. Tudo passa
// por lookaround, e o Ira entra so por gentilico e capital.
//
// O termo e ESCAPADO antes de virar regex. Nao era, e nao fazia diferenca
// enquanto nenhum termo tinha metacaractere; "u.s." tem dois pontos, e sem o
// escape cada ponto casaria com qualquer caractere — "uas" e "u s" inclusive.
const RX_PAIS = PAISES.map((p) => ({
  ...p,
  rxs: p.termos.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${escapar(normalizar(t))}(?![\\p{L}\\p{N}])`, 'iu')),
}))

// ── O IRÃ, NO TEXTO CRU ──
//
// "Irã" com til não tem homógrafo: o verbo é "irá", com agudo. Já "Irão", a
// grafia de Portugal (RTP, Euronews), É o verbo "irão" — "os termômetros irão
// variar" —, e a primeira versão que o aceitou normalizado pôs uma previsão do
// tempo de Minas Gerais e uma feira agropecuária de Rondônia no teatro do Golfo
// Pérsico. O que desambigua é a maiúscula, como no "Acre" de UF_AMBIGUA: o país
// é nome próprio, o verbo no meio da frase não.
const PAIS_COM_ACENTO = {
  Iran: [/(?<![\p{L}\p{N}])ir[ãÃ](?![\p{L}\p{N}])/iu, /(?<![\p{L}\p{N}])(?:Irão|IRÃO)(?![\p{L}\p{N}])/u],
}

/**
 * Paises mencionados num texto.
 *
 * Devolve os nomes em ingles (a chave do mapa), para quem consome nao precisar
 * saber que ha traducao no meio do caminho.
 *
 * @returns {string[]}
 */
export function detectarPaises(texto) {
  const cru = String(texto || '').normalize('NFC')
  const palheiro = neutralizar(normalizar(cru))
  if (!palheiro.trim()) return []
  return RX_PAIS.filter(({ nome, rxs }) => (
    rxs.some((rx) => rx.test(palheiro)) || !!PAIS_COM_ACENTO[nome]?.some((rx) => rx.test(cru))
  )).map((p) => p.nome)
}

/** Nome em portugues de um pais, a partir da chave em ingles. */
export const nomePtDoPais = (nome) => PAISES.find((p) => p.nome === nome)?.pt || nome

/**
 * O pais define a escala de cor do mapa?
 *
 * O Brasil nao: e mencionado em quase toda materia do acervo, e normalizar por
 * ele achataria os 36 restantes. Aparece com contagem e manchetes, mas fica
 * fora do calculo do maximo. Ver /news/countries.
 */
export const foraDaEscala = (nome) => !!PAISES.find((p) => p.nome === nome)?.foraDaEscala

/**
 * Codigo ISO-3166 alfa-2 do pais, pelo nome do world-atlas.
 *
 * Existe porque a plataforma fala DOIS vocabularios de pais e precisava
 * cruza-los: o mapa usa o nome em ingles do world-atlas ("United States of
 * America"), e o ransomware.live usa ISO2 ("US"). Sem esta ponte, clicar num
 * pais no mapa nunca poderia mostrar as vitimas de ransomware dele.
 */
export const isoDoPais = (nome) => PAISES.find((p) => p.nome === nome)?.iso || null

/** O caminho inverso: do ISO para o nome do mapa. */
export const paisDoIso = (iso) => {
  const alvo = String(iso || '').toUpperCase()
  return PAISES.find((p) => p.iso === alvo) || null
}

export default { UFS, REGIOES_ESTRATEGICAS, PAISES, detectarLugares, detectarPaises, nomePtDoPais }

