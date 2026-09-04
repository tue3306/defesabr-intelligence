// Reaplica as regras de relevância e classificação ao acervo já coletado.
//
// Necessário sempre que `lib/relevance.js` muda: sem isto, o acervo antigo
// continuaria classificado pela regra velha e a interface mostraria os dois
// critérios misturados sem que ninguém percebesse — o pior tipo de
// inconsistência, porque é invisível.
//
// Aceita `--simular`: relata o que mudaria sem gravar. Reclassificar o acervo
// inteiro é irreversível, e conferir a lista antes custa um segundo.
import { all, run, migrate, transacao } from '../src/db/index.js'
import { avaliarRelevancia, classificar, limparRodape } from '../src/lib/relevance.js'
import { ehNaoNoticia } from '../src/collectors/rss.js'

migrate()

const simular = process.argv.includes('--simular')

const artigos = all('SELECT id, title, url, summary, relevant, category, urgency FROM articles')

let resumosLimpos = 0
let reclassificados = 0
let viraramRelevantes = 0
let deixaramDeSer = 0
const descartados = []
const entraram = []

transacao(() => {
  for (const a of artigos) {
    // Item que o coletor de hoje nem guardaria não deve seguir no acervo:
    // anexo, agenda de autoridade, título que é só código. Entraram quando os
    // portais gov.br foram cadastrados e o coletor ainda não os reconhecia.
    if (ehNaoNoticia({ titulo: a.title, url: a.url, resumo: a.summary })) {
      descartados.push(a.title)
      if (!simular) run('DELETE FROM articles WHERE id = ?', [a.id])
      continue
    }

    // Limpa o rodapé "Notícias relacionadas" gravado antes de a coleta passar
    // a removê-lo: ele traz manchetes de OUTRAS matérias, e deixá-lo no resumo
    // faz o cartão descrever a notícia errada.
    const resumo = limparRodape(a.summary) || null
    if (resumo !== a.summary) {
      if (!simular) run('UPDATE articles SET summary = ? WHERE id = ?', [resumo, a.id])
      resumosLimpos += 1
    }

    const palheiro = `${a.title} ${resumo || ''}`
    const r = avaliarRelevancia(palheiro)
    const { categoria, urgencia } = classificar(palheiro, a.title)

    if (!!a.relevant !== r.relevante || a.category !== categoria || a.urgency !== urgencia) {
      if (!simular) {
        run(
          `UPDATE articles SET relevant = ?, category = ?, urgency = ?,
             relevance_score = ?, matched_terms = ? WHERE id = ?`,
          [r.relevante ? 1 : 0, categoria, urgencia, r.pontos, r.termos.slice(0, 8).join(', ') || null, a.id]
        )
      }
      reclassificados += 1
      if (r.relevante && !a.relevant) { viraramRelevantes += 1; entraram.push(`${a.title}  [${r.fortes.join(', ')}]`) }
      if (!r.relevante && a.relevant) deixaramDeSer += 1
    }
  }
})

const relevantes = all('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')[0].n

console.log(simular ? 'Simulação (nada foi gravado)' : 'Reclassificação concluída')
console.log(`  artigos analisados    : ${artigos.length}`)
console.log(`  descartados (não são notícia) : ${descartados.length}`)
console.log(`  resumos limpos        : ${resumosLimpos}`)
console.log(`  reclassificados       : ${reclassificados}`)
console.log(`  passaram a relevante  : ${viraramRelevantes}`)
console.log(`  deixaram de ser       : ${deixaramDeSer}`)
console.log(`  relevantes agora      : ${relevantes} de ${artigos.length - descartados.length}`)

for (const t of entraram.slice(0, 10)) console.log(`    + ${t.slice(0, 92)}`)
for (const t of descartados.slice(0, 10)) console.log(`    − ${String(t).slice(0, 92)}`)
if (simular) console.log('\n  Rode sem --simular para efetivar.')
process.exit(0)
