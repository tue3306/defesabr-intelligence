import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../config.js'

// -----------------------------------------------------------------------------
// BANCO — SQLite pelo módulo nativo do Node.
//
// `node:sqlite` (Node 22.5+) evita `better-sqlite3`, que precisa compilar
// binário nativo. Numa demonstração acadêmica isso importa: `npm install`
// funciona na primeira tentativa em qualquer máquina, sem toolchain de C++.
// No Railway, evita builds longos e falhas de compilação por imagem base.
// -----------------------------------------------------------------------------

const aqui = dirname(fileURLToPath(import.meta.url))

mkdirSync(dirname(config.dbPath), { recursive: true })

export const db = new DatabaseSync(config.dbPath)

/** Aplica o esquema. Idempotente — roda em toda subida. */
export function migrate() {
  db.exec(readFileSync(join(aqui, 'schema.sql'), 'utf8'))
}

// `DatabaseSync` devolve objetos com protótipo nulo. Isso quebra
// `JSON.stringify` em alguns caminhos e confunde o espalhamento; normalizar
// aqui evita um bug que só apareceria na serialização da resposta.
const plano = (linha) => (linha ? { ...linha } : linha)

export const all = (sql, params = []) => db.prepare(sql).all(...params).map(plano)
export const get = (sql, params = []) => plano(db.prepare(sql).get(...params))
export const run = (sql, params = []) => db.prepare(sql).run(...params)

/** INSERT que devolve a linha criada. */
export function insert(sql, params, tabela) {
  const r = db.prepare(sql).run(...params)
  return get(`SELECT * FROM ${tabela} WHERE rowid = ?`, [r.lastInsertRowid])
}

/**
 * Executa em transação. Numa coleta que insere dezenas de linhas, isso é a
 * diferença entre uma escrita em disco e dezenas — e garante que uma falha no
 * meio não deixe metade do lote gravado.
 */
export function transacao(fn) {
  db.exec('BEGIN')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/** Instante atual no mesmo formato que o esquema grava. */
export const agora = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

export { config }
