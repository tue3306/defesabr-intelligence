// Dispara uma coleta completa pela linha de comando, sem subir o servidor.
// Útil para popular o banco logo depois de clonar, e para ver o que cada
// fonte respondeu sem precisar abrir o painel.
import { migrate } from '../src/db/index.js'
import { semearFontes, coletarTudo } from '../src/collectors/index.js'

migrate()
const criadas = semearFontes()
if (criadas) console.log(`${criadas} fonte(s) cadastradas.\n`)

console.log('Coletando…\n')
const r = await coletarTudo('cli')

const marca = (ok) => (ok === false ? '\x1b[31m falha \x1b[0m' : '\x1b[32m  ok   \x1b[0m')

console.log('NOTÍCIAS')
for (const d of r.noticias.detalhes || []) {
  console.log(`  [${marca(d.ok)}] ${String(d.novos ?? 0).padStart(3)} novo(s)  ${String(d.internacionais ?? 0).padStart(3)} internac.  ${d.fonte}`)
  if (!d.ok) console.log(`            \x1b[2m${d.erro}\x1b[0m`)
}
console.log(`  → ${r.noticias.novos} novo(s), ${r.noticias.relevantes} relevante(s), ${r.noticias.internacionais ?? 0} só da lente mundial, ${r.noticias.falhas} falha(s)\n`)

console.log('OUTRAS FONTES')
console.log(`  [${marca(r.legislativo.ok)}] legislativo  ${r.legislativo.novos ?? 0} proposição(ões) nova(s)`)
console.log(`  [${marca(r.indicadores.ok)}] world bank   ${r.indicadores.gravados ?? 0} ponto(s)`)
console.log(`  [${marca(r.cambio.ok)}] câmbio       ${r.cambio.gravados ?? 0} cotação(ões)`)
console.log(`  [${marca(r.geografia?.ok)}] geografia    ${r.geografia?.encontrados ?? 0} artigo(s) derivados, ${r.geografia?.removidos ?? 0} removido(s) pela retenção`)

console.log(`\nConcluído em ${(r.duracaoMs / 1000).toFixed(1)}s.`)
process.exit(0)
