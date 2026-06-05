// -----------------------------------------------------------------------------
// Busca semântica leve (client-side) para o domínio de Segurança & Defesa.
// Não depende de backend: faz normalização, expansão por sinônimos do domínio
// e pontuação por relevância em múltiplos campos. É "semântica" no sentido de
// entender termos relacionados (ex.: "submarino" casa com "PROSUB", "naval").
// -----------------------------------------------------------------------------

// Remove acentos e baixa caixa para casar "tática" com "tatica".
export function normalize(str = '') {
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
