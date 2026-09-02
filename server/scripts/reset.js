// Apaga o banco. Na próxima subida o servidor recria o esquema, recadastra as
// fontes e dispara uma coleta.
//
// O caminho é recalculado aqui e NÃO importado de src/db/index.js: aquele
// módulo abre a conexão SQLite ao ser carregado, e no Windows isso travaria
// exatamente o arquivo que este script existe para apagar.
import { existsSync, unlinkSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { dirname, join, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const DB = process.env.DB_PATH
  ? (isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : join(process.cwd(), process.env.DB_PATH))
  : join(aqui, '..', 'data', 'defesabr.db')

const forcar = process.argv.includes('--sim') || process.argv.includes('--yes')

if (!existsSync(DB)) {
  console.log(`Nada a apagar: ${DB} não existe.`)
  process.exit(0)
}

console.log(`Banco: ${DB} (${(statSync(DB).size / 1024).toFixed(0)} kB)`)

if (!forcar) {
  const rl = createInterface({ input: stdin, output: stdout })
  const r = await rl.question('Apagar o banco? O acervo será recoletado na próxima subida. (digite "apagar") ')
  rl.close()
  if (r.trim().toLowerCase() !== 'apagar') {
    console.log('Cancelado. Nada foi alterado.')
    process.exit(0)
  }
}

// O SQLite em modo WAL deixa arquivos ao lado do banco.
for (const sufixo of ['', '-journal', '-wal', '-shm']) {
  if (existsSync(DB + sufixo)) {
    unlinkSync(DB + sufixo)
    console.log(`removido: ${DB}${sufixo}`)
  }
}

console.log('\nPronto. Suba o servidor (npm run dev) para recriar tudo.')
