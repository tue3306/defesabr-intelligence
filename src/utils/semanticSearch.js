// -----------------------------------------------------------------------------
// Busca semântica leve (client-side) para o domínio de Segurança & Defesa.
// Não depende de backend: faz normalização, expansão por sinônimos do domínio
// e pontuação por relevância em múltiplos campos. É "semântica" no sentido de
// entender termos relacionados (ex.: "submarino" casa com "PROSUB", "naval").
// -----------------------------------------------------------------------------

// Remove acentos e baixa caixa para casar "tática" com "tatica".
export function normalize(str = '') {
  // O PARÂMETRO PADRÃO NÃO COBRE `null`, SÓ `undefined`.
  //
  // `normalize(null)` chegava em `null.toString()` e lançava. Passou anos sem
  // aparecer porque todo campo que chega aqui era montado por concatenação e
  // portanto sempre string — inclusive quando o valor não existia, caso em que
  // a string era o literal "undefined". Corrigir a origem (a prévia do arquivo,
  // que agora é `null` quando não há resumo) expôs o buraco: a primeira busca
  // no Arquivo quebraria a página.
  //
  // A guarda fica aqui, e não em cada chamador, porque um normalizador que só
  // aceita um dos dois valores vazios da linguagem é uma armadilha para o
  // próximo campo opcional que alguém indexar.
  if (str === null || str === undefined) return ''
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Grupos de sinônimos/termos relacionados do domínio. Buscar por qualquer
// palavra do grupo também valoriza documentos que contenham as demais.
const SYNONYM_GROUPS = [
  ['submarino', 'prosub', 'naval', 'marinha', 'riachuelo'],
  ['ciber', 'cibernetica', 'cibernetico', 'ciberseguranca', 'hacker', 'ataque', 'cert', 'digital'],
  ['aviao', 'aeronave', 'cargueiro', 'c390', 'embraer', 'fab', 'aerea', 'caca', 'gripen'],
  ['fronteira', 'amazonia', 'amazonica', 'narcotrafico', 'agata'],
  ['orcamento', 'verba', 'gasto', 'investimento', 'pib', 'financiamento'],
  ['exercito', 'tropa', 'militar', 'forcas', 'armadas', 'defesa'],
  ['diplomacia', 'acordo', 'cooperacao', 'tratado', 'internacional'],
  ['inteligencia', 'osint', 'espionagem', 'monitoramento', 'desinformacao'],
  ['industria', 'contrato', 'exportacao', 'fabricacao', 'tecnologia'],
]

const STOP = new Set(['de', 'da', 'do', 'a', 'o', 'e', 'em', 'no', 'na', 'para', 'com', 'que', 'os', 'as', 'um', 'uma'])

function expandTokens(tokens) {
  const set = new Set(tokens)
  tokens.forEach((tk) => {
    SYNONYM_GROUPS.forEach((group) => {
      if (group.includes(tk)) group.forEach((g) => set.add(g))
    })
  })
  return [...set]
}

export function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t))
}

// Pontua um documento (conjunto de campos com pesos) contra a query.
// fields: [{ text, weight }]
export function scoreDocument(queryTokens, expandedTokens, fields) {
  let score = 0
  let directHits = 0
  for (const { text, weight } of fields) {
    const norm = normalize(text)
    if (!norm) continue
    for (const tk of queryTokens) {
      if (norm.includes(tk)) {
        score += weight * 3
        directHits += 1
      }
    }
    for (const tk of expandedTokens) {
      if (!queryTokens.includes(tk) && norm.includes(tk)) {
        score += weight // termo relacionado vale menos que o termo direto
      }
    }
  }
  return { score, directHits }
}

// Rankeia uma lista. getFields(item) -> [{ text, weight }]
export function rankItems(query, items, getFields) {
  const q = (query || '').trim()
  if (!q) return items.map((item) => ({ item, score: 0 }))
  const queryTokens = tokenize(q)
  if (!queryTokens.length) return items.map((item) => ({ item, score: 0 }))
  const expanded = expandTokens(queryTokens)

  return items
    .map((item) => {
      const { score } = scoreDocument(queryTokens, expanded, getFields(item))
      return { item, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

// -----------------------------------------------------------------------------
// BUSCA POR PALAVRAS — telas, comandos e conflitos.
//
// A mesma regra da busca do servidor (`/api/search`): cada palavra
// significativa precisa aparecer, em qualquer ordem (as curtas no começo de
// uma palavra do texto); sem acento, sem caixa, sem artigos e preposições, e
// com o plural tolerado ("exportações" acha "exportação", "exporta" acha os
// dois).
// -----------------------------------------------------------------------------
const VAZIAS = new Set([
  ...STOP, 'das', 'dos', 'nos', 'nas', 'pra', 'por', 'pelo', 'pela', 'pelos',
  'pelas', 'uns', 'umas', 'ao', 'aos', 'ou', 'se', 'sobre', 'como',
])

/** Plural e "-ção/-ções" viram a mesma raiz: exportações → exportac. */
export function raizDaPalavra(p) {
  if (p.length <= 3 || /^\d+$/.test(p)) return p
  let r = p
  if (r.endsWith('coes')) r = r.slice(0, -3)
  else if (r.endsWith('cao')) r = r.slice(0, -2)
  else if (r.endsWith('ais')) r = r.slice(0, -2)
  else if (r.endsWith('s') && r.length > 4) r = r.slice(0, -1)
  return r.length >= 3 ? r : p
}

/** Raízes das palavras significativas da consulta, sem repetição (até 8). */
export function palavrasDaConsulta(q) {
  const raizes = normalize(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !VAZIAS.has(t) && (t.length > 1 || /\d/.test(t)))
    .map(raizDaPalavra)
  return [...new Set(raizes)].slice(0, 8)
}

/** Texto pronto para `casaPalavra`: sem acento e com espaço antes de cada palavra. */
export function prepararTexto(...partes) {
  return ` ${normalize(partes.flat().filter(Boolean).join(' ')).replace(/[^a-z0-9]+/g, ' ')}`
}

/**
 * A raiz está no texto preparado? Curta (até 4 letras) só no começo de uma
 * palavra — "lei" não acha "eleição"; longa em qualquer ponto — "ataque" acha
 * "ciberataque". É a mesma regra do servidor.
 */
export const casaPalavra = (textoPreparado, raiz) =>
  textoPreparado.includes(raiz.length >= 5 ? raiz : ` ${raiz}`)

const GENERICAS = new Set(['defesa', 'brasil', 'brasileiro', 'brasileira', 'militar', 'seguranca', 'tela', 'pagina'])

/**
 * Quantas palavras da consulta o item tem, e se tem todas.
 *
 * `genericas` são palavras que quase toda tela poderia ter ("defesa",
 * "brasil"): se faltarem, não eliminam o item — "projeto de lei defesa" ainda
 * leva a Projetos de lei. Se a consulta só tiver genéricas, todas valem.
 */
export function avaliarPalavras(raizes, textoPreparado, genericas = GENERICAS) {
  const presentes = raizes.filter((r) => casaPalavra(textoPreparado, r))
  const obrigatorias = raizes.filter((r) => !genericas.has(r))
  const exigidas = obrigatorias.length ? obrigatorias : raizes
  return {
    acertos: presentes.length,
    todas: raizes.length > 0 && exigidas.every((r) => presentes.includes(r)),
  }
}

