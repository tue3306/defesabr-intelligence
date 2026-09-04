import { normalizar } from './relevance.js'

// -----------------------------------------------------------------------------
// EVENTOS CONSOLIDADOS
//
// O clipping listava matérias. Com 50 fontes, a mesma coisa chega três vezes:
// "Alemanha testa míssil balístico israelense", "Alemanha testa míssil
// balístico em meio a tensão com a Rússia" e "VÍDEO: Alemanha testa míssil
// balístico" são o MESMO FATO, e ocupavam três linhas.
//
// A deduplicação por título normalizado (`chaveDeTitulo`) resolve o caso
// idêntico e só ele. Estes três títulos são diferentes — cada redação escreve
// o seu —, então passam por ela e chegam à tela como três notícias.
//
// Aqui eles viram UM evento com TRÊS fontes. A diferença para o leitor é
// grande: "três veículos cobriram isto" é informação, e "três linhas parecidas
// na lista" é ruído.
//
// COMO O AGRUPAMENTO DECIDE
//
// Similaridade de Jaccard sobre os termos significativos do título — palavras
// com mais de três letras, fora a lista de vazias. Dois títulos entram no
// mesmo evento quando compartilham 40% dos termos E estão a menos de 48h um do
// outro.
//
// Os dois limites saíram de medição contra o acervo, não de intuição:
//
//   0,40 e 48h   agrupa os casos reais acima e não junta nada que não deva
//   abaixo de 0,3 começa a juntar assuntos vizinhos ("Marinha" com "Marinha")
//   janela maior junta a notícia com a retrospectiva dela, semanas depois
//
// O QUE ISTO NÃO FAZ, DE PROPÓSITO
//
// Não escolhe uma versão "canônica" por juízo editorial: o representante é o
// título da fonte mais antiga do grupo, porque foi quem publicou primeiro, e
// TODAS as fontes ficam visíveis. Consolidar não pode significar esconder.
// -----------------------------------------------------------------------------

/** Palavras sem carga semântica: entram em qualquer título e inflam a semelhança. */
const VAZIAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por',
  'com', 'sem', 'que', 'uma', 'uns', 'umas', 'ao', 'aos', 'as', 'os', 'se',
  'sobre', 'apos', 'entre', 'mais', 'menos', 'sua', 'seu', 'suas', 'seus',
  'pela', 'pelo', 'pelas', 'pelos', 'como', 'ate', 'ser', 'sao', 'foi', 'tem',
  'video', 'audio', 'foto', 'fotos', 'imagens', 'veja', 'confira', 'saiba',
])

export const LIMIAR_SIMILARIDADE = 0.4
export const JANELA_HORAS = 48

/** Termos significativos de um título. */
export function termosDe(titulo) {
  return new Set(
    normalizar(titulo)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !VAZIAS.has(w))
  )
}

/** Jaccard: interseção sobre união. 1 = idênticos, 0 = nada em comum. */
export function similaridade(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  return inter / (a.size + b.size - inter)
}

/**
 * Agrupa artigos em eventos.
 *
 * @param {Array} artigos  já ordenados por data DECRESCENTE
 * @returns {Array} eventos, cada um com `principal` e `fontes`
 */
export function consolidar(artigos, { limiar = LIMIAR_SIMILARIDADE, janelaHoras = JANELA_HORAS } = {}) {
  const comTermos = artigos.map((a) => ({ ...a, _termos: termosDe(a.title) }))
  const grupos = []

  for (const art of comTermos) {
    const t = new Date(art.published_at).getTime()

    // Procura um grupo já formado que case. Compara com o REPRESENTANTE e não
    // com todos os membros: comparar com todos faria o grupo crescer por
    // encadeamento — A parecido com B, B com C, e C sem nada a ver com A.
    const alvo = grupos.find((g) => {
      const dt = Math.abs(t - g._quando) / 3600000
      if (!Number.isFinite(dt) || dt > janelaHoras) return false
      return similaridade(art._termos, g._termos) >= limiar
    })

    if (alvo) {
      alvo.fontes.push(art)
      // O representante é o mais ANTIGO: quem publicou primeiro. Trocar pelo
      // mais recente faria o evento mudar de título sozinho a cada coleta.
      if (t < alvo._quando) {
        alvo._quando = t
        alvo._termos = art._termos
        alvo.principal = art
      }
    } else {
      grupos.push({ principal: art, fontes: [art], _termos: art._termos, _quando: t })
    }
  }

  return grupos.map((g) => {
    // Ordena as fontes da mais antiga para a mais nova: é a ordem em que o
    // fato foi sendo coberto, e ela conta uma história.
    const fontes = [...g.fontes].sort(
      (a, b) => new Date(a.published_at) - new Date(b.published_at)
    )
    const urgencias = fontes.map((f) => f.urgency)
    return {
      id: `ev-${g.principal.id}`,
      titulo: g.principal.title,
      resumo: g.principal.summary,
      url: g.principal.url,
      categoria: g.principal.category,
      // A urgência do evento é a MAIOR entre as fontes: se um veículo tratou
      // como crítico, o evento merece o olhar de quem procura crítico.
      urgencia: ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].find((n) => urgencias.includes(n)) || 'BAIXO',
      primeiraPublicacao: fontes[0]?.published_at || null,
      ultimaPublicacao: fontes[fontes.length - 1]?.published_at || null,
      // Quantos VEÍCULOS distintos cobriram — não quantas matérias. Duas
      // matérias do mesmo veículo não são duas confirmações.
      veiculos: new Set(fontes.map((f) => f.fonte)).size,
      totalMaterias: fontes.length,
      fontes: fontes.map((f) => ({
        id: f.id,
        titulo: f.title,
        fonte: f.fonte,
        url: f.url,
        publicadoEm: f.published_at,
        urgencia: f.urgency,
      })),
    }
  })
}

export default { consolidar, termosDe, similaridade, LIMIAR_SIMILARIDADE, JANELA_HORAS }
