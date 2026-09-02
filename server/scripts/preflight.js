// -----------------------------------------------------------------------------
// VERIFICAÇÃO PRÉVIA — roda antes do servidor, e existe por causa do log.
//
// O servidor depende de `node:sqlite`. Num Node que não o tenha disponível, o
// processo morre durante a LIGAÇÃO dos módulos — antes de qualquer linha do
// nosso código rodar, o que torna impossível avisar de dentro do servidor. O
// que sobra no log é:
//
//     Error: No such built-in module: node:sqlite
//
// Numa máquina local isso se investiga. Num deploy, o log é tudo o que existe,
// e essa linha não diz qual Node está rodando, qual é o exigido, nem onde
// mudar. Alguém perde uma tarde.
//
// Este arquivo não importa `node:sqlite` estaticamente — usa `import()`
// dinâmico, que é uma expressão e portanto pode ser capturado. Assim a falha
// vira uma explicação.
// -----------------------------------------------------------------------------

const exigido = 24

try {
  await import('node:sqlite')
} catch {
  const versao = process.versions.node
  const linha = '─'.repeat(64)
  console.error(`\n\x1b[31m  Este servidor não pode iniciar neste Node.\x1b[0m`)
  console.error(`  ${linha}`)
  console.error(`  Node em uso     ${versao}`)
  console.error(`  Node necessário ${exigido} ou superior`)
  console.error(`  ${linha}`)
  console.error(`  O banco usa o módulo nativo \x1b[1mnode:sqlite\x1b[0m, que não está`)
  console.error(`  disponível nesta versão. Ele apareceu no Node 22.5, mas por boa`)
  console.error(`  parte da linha 22.x só funcionava com a flag --experimental-sqlite.`)
  console.error(``)
  console.error(`  Onde ajustar:`)
  console.error(`    • local    instale o Node ${exigido}+ (https://nodejs.org)`)
  console.error(`    • Railway  \x1b[1mnixpacks.toml\x1b[0m → nixPkgs = ["nodejs_${exigido}"]`)
  console.error(`    • Docker   imagem base node:${exigido}\n`)
  process.exit(1)
}
