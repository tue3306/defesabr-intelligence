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

/**
 * Colunas acrescentadas depois que o esquema ja existia.
 *
 * `schema.sql` usa `CREATE TABLE IF NOT EXISTS`, o que significa que ele NAO
 * altera tabela ja criada: num banco existente, uma coluna nova simplesmente
 * nao aparece, e a primeira consulta que a usa morre com "no such column".
 *
 * No Railway o disco e efemero e o banco nasce a cada deploy, entao o defeito
 * fica invisivel — ate o dia em que alguem montar um volume para o acervo
 * persistir, que e justamente a configuracao recomendada no README. Ai o
 * deploy seguinte quebra, e o motivo nao estara em lugar nenhum.
 *
 * Cada entrada e `[tabela, coluna, definicao]` e so e aplicada se faltar.
 * SQLite nao tem `ADD COLUMN IF NOT EXISTS`, entao a checagem e explicita.
 */
const COLUNAS_ADICIONADAS = [
  ['sources', 'somente_relevantes', 'INTEGER NOT NULL DEFAULT 0'],
  ['articles', 'title_key', 'TEXT'],
  // Texto sem acento, para a busca encontrar "orcamento" em "orçamento".
  // O LIKE do SQLite dobra a caixa de ASCII e nada mais: nao existe unaccent,
  // entao a alternativa a guardar a forma normalizada seria carregar o acervo
  // inteiro para memoria a cada busca.
  ['articles', 'search_key', 'TEXT'],
  ['bills', 'search_key', 'TEXT'],
]

/**
 * Indices que dependem de coluna acrescentada depois.
 *
 * Ficam AQUI e nao no schema.sql por uma questao de ordem: o schema roda
 * inteiro antes da migracao de colunas, entao um `CREATE INDEX` sobre coluna
 * nova falharia com "no such column" num banco existente — que e exatamente o
 * caso que a migracao veio resolver.
 */
const INDICES_ADICIONADOS = [
  'CREATE INDEX IF NOT EXISTS idx_articles_title_key ON articles(title_key)',
]

/** Aplica o esquema e as colunas incrementais. Idempotente — roda em toda subida. */
export function migrate() {
  // 1. tabelas e indices que so dependem do esquema original
  db.exec(readFileSync(join(aqui, 'schema.sql'), 'utf8'))

  // 2. colunas acrescentadas depois
  for (const [tabela, coluna, definicao] of COLUNAS_ADICIONADAS) {
    const existe = db.prepare(`PRAGMA table_info(${tabela})`).all()
      .some((c) => c.name === coluna)
    if (!existe) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`)
  }

  // 3. indices sobre essas colunas — so agora elas existem
  for (const sql of INDICES_ADICIONADOS) db.exec(sql)
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
