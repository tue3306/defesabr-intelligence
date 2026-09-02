// Reaplica as regras de relevância e classificação ao acervo já coletado.
//
// Necessário sempre que `lib/relevance.js` muda: sem isto, o acervo antigo
// continuaria classificado pela regra velha e a interface mostraria os dois
// critérios misturados sem que ninguém percebesse — o pior tipo de
// inconsistência, porque é invisível.
import { all, run, migrate, transacao } from '../src/db/index.js'
import { avaliarRelevancia, classificar, limparRodape } from '../src/lib/relevance.js'

migrate()

const artigos = all('SELECT id, title, summary, relevant, category, urgency FROM articles')

let resumosLimpos = 0
let reclassificados = 0
let viraramRelevantes = 0
let deixaramDeSer = 0

transacao(() => {
  for (const a of artigos) {
    // Limpa o rodapé "Notícias relacionadas" gravado antes de a coleta passar
    // a removê-lo: ele traz manchetes de OUTRAS matérias, e deixá-lo no resumo
    // faz o cartão descrever a notícia errada.
    const resumo = limparRodape(a.summary) || null
    if (resumo !== a.summary) {
      run('UPDATE articles SET summary = ? WHERE id = ?', [resumo, a.id])
      resumosLimpos += 1
    }

    const palheiro = `${a.title} ${resumo || ''}`
    const r = avaliarRelevancia(palheiro)
    const { categoria, urgencia } = classificar(palheiro)

    if (!!a.relevant !== r.relevante || a.category !== categoria || a.urgency !== urgencia) {
      run(
        `UPDATE articles SET relevant = ?, category = ?, urgency = ?,
           relevance_score = ?, matched_terms = ? WHERE id = ?`,
        [r.relevante ? 1 : 0, categoria, urgencia, r.pontos, r.termos.slice(0, 8).join(', ') || null, a.id]
      )
      reclassificados += 1
      if (r.relevante && !a.relevant) viraramRelevantes += 1
      if (!r.relevante && a.relevant) deixaramDeSer += 1
    }
  }
})

const relevantes = all('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')[0].n

console.log('Reclassificação concluída')
console.log(`  artigos analisados    : ${artigos.length}`)
console.log(`  resumos limpos        : ${resumosLimpos}`)
console.log(`  reclassificados       : ${reclassificados}`)
console.log(`  passaram a relevante  : ${viraramRelevantes}`)
console.log(`  deixaram de ser       : ${deixaramDeSer}`)
console.log(`  relevantes agora      : ${relevantes} de ${artigos.length}`)
process.exit(0)
