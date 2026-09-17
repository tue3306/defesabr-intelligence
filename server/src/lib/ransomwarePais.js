import { all, get } from '../db/index.js'
import { nomeDaVitima } from './vitima.js'

// -----------------------------------------------------------------------------
// VÍTIMAS DE RANSOMWARE DE UM PAÍS
//
// Duas telas mostram o mesmo bloco: o dossiê do mapa (/news/pais/:nome) e a
// página do país em Mundo & Conflitos (/mundo/pais/:nome). A consulta morava
// inteira dentro da primeira rota; copiá-la para a segunda daria duas versões
// que divergem na primeira correção — e a limpeza do nome da vítima já é o
// tipo de detalhe que se corrige num lugar e se esquece no outro.
//
// A junção passa pelo ISO: o mapa fala o nome do world-atlas, o ransomware.live
// fala ISO2. Sem ISO não há como cruzar, e a resposta diz isso em `disponivel`
// — a interface precisa distinguir "nenhuma vítima" de "não dá para saber".
// -----------------------------------------------------------------------------

/** @returns {{ total: number, itens: object[], disponivel: boolean }} */
export function ransomwareDoPais(iso, limite = 15) {
  if (!iso) return { total: 0, itens: [], disponivel: false }
  const itens = all(
    `SELECT victim, website, "group", sector, discovered_at, criticality, nature
       FROM ransomware_victims WHERE country = ? ORDER BY discovered_at DESC LIMIT ?`,
    [iso, limite]
  ).map((v) => {
    // Ver `lib/vitima.js`: o campo da fonte é o título do post do criminoso.
    const { nome, bruto, limpo } = nomeDaVitima(v.victim, v.website)
    return { ...v, victim: nome, victimBruto: limpo ? bruto : null }
  })
  return {
    total: get('SELECT COUNT(*) AS n FROM ransomware_victims WHERE country = ?', [iso])?.n ?? 0,
    itens,
    disponivel: true,
  }
}

export default { ransomwareDoPais }
