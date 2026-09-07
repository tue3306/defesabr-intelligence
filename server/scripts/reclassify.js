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
import { urlSegura, dominioSeguro } from '../src/lib/saneamento.js'

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

// ─────────────────────────────────────────────────────────────────────────────
// SANEAMENTO RETROATIVO DOS ENDEREÇOS
//
// A coleta passou a validar o esquema de toda URL de terceiro na gravação
// (ver `lib/saneamento.js`), mas isso só vale para o que entra DEPOIS. As
// linhas já gravadas continuam como vieram, e a interface as renderiza como
// `href` do mesmo jeito.
//
// No Railway o disco é efêmero e o acervo renasce a cada deploy, então lá o
// problema se resolve sozinho. Num volume montado — que é a configuração que o
// README recomenda para o acervo persistir — ele NÃO se resolve, e é
// exatamente onde ninguém iria procurar.
//
// O caso encontrado no acervo real não era exótico: o ransomware.live devolve
// a string literal `"null"` quando não tem o endereço do vazamento, e
// `"null" || null` é `"null"`. O resultado era `<a href="null">` — um link que
// parece funcionar e navega para dentro da própria plataforma.
let urlsLimpas = 0

transacao(() => {
  for (const a of all('SELECT id, url FROM articles WHERE url IS NOT NULL')) {
    const limpa = urlSegura(a.url)
    if (limpa === a.url) continue
    urlsLimpas += 1
    if (!simular) run('UPDATE articles SET url = ? WHERE id = ?', [limpa, a.id])
  }

  // `post_url` é endereço e `website` é domínio: formatos diferentes, funções
  // diferentes. Tratar os dois como URL apagaria o domínio de 624 vítimas.
  for (const v of all('SELECT id, post_url, website FROM ransomware_victims')) {
    const post = urlSegura(v.post_url)
    const site = dominioSeguro(v.website)
    if (post === v.post_url && site === v.website) continue
    urlsLimpas += 1
    if (!simular) {
      run('UPDATE ransomware_victims SET post_url = ?, website = ? WHERE id = ?', [post, site, v.id])
    }
  }
})

const relevantes = all('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')[0].n

console.log(simular ? 'Simulação (nada foi gravado)' : 'Reclassificação concluída')
console.log(`  artigos analisados    : ${artigos.length}`)
console.log(`  descartados (não são notícia) : ${descartados.length}`)
console.log(`  resumos limpos        : ${resumosLimpos}`)
console.log(`  endereços saneados    : ${urlsLimpas}`)
console.log(`  reclassificados       : ${reclassificados}`)
console.log(`  passaram a relevante  : ${viraramRelevantes}`)
console.log(`  deixaram de ser       : ${deixaramDeSer}`)
console.log(`  relevantes agora      : ${relevantes} de ${artigos.length - descartados.length}`)

for (const t of entraram.slice(0, 10)) console.log(`    + ${t.slice(0, 92)}`)
for (const t of descartados.slice(0, 10)) console.log(`    − ${String(t).slice(0, 92)}`)
if (simular) console.log('\n  Rode sem --simular para efetivar.')
process.exit(0)
