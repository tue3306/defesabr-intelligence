import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../config.js'

// -----------------------------------------------------------------------------
// BANCO — SQLite pelo módulo nativo do Node.
//
// `node:sqlite` (Node 22.5+) evita `better-sqlite3`, que precisa compilar
// binário nativo. Num projeto aberto isso importa: `npm install`
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
  // Criticidade do incidente e a natureza da vitima (estado / infraestrutura
  // / privado). Derivadas na coleta, ver server/src/lib/criticidade.js.
  ['ransomware_victims', 'criticality', 'TEXT'],
  ['ransomware_victims', 'criticality_reason', 'TEXT'],
  ['ransomware_victims', 'nature', 'TEXT'],
  // Nome do ator em minusculas. A fonte grafa o mesmo grupo de formas
  // diferentes conforme o endpoint — 'emperador' na vitima, 'Emperador' no
  // perfil — e o join sensivel a caixa nunca casava, entao esses atores eram
  // rebuscados a cada ciclo, para sempre.
  ['threat_actors', 'name_key', 'TEXT'],

  // IDENTIFICADOR DE LOGIN, separado do e-mail.
  //
  // O projeto e aberto e nasce com duas contas cujo identificador e um nome de
  // usuario simples (`admin123`, `usuario123`), nao um endereco de e-mail.
  // Forcar isso na coluna `email` funcionaria, mas apagaria a distincao que a
  // proxima etapa vai precisar: quando entrar autenticacao por Google, o
  // e-mail passa a vir do provedor e precisa ser um endereco de verdade,
  // enquanto o identificador local continua sendo o que a pessoa digita.
  //
  // Coluna nova em vez de trocar o significado da existente: `email` e NOT
  // NULL UNIQUE, e mudar isso no SQLite exige reconstruir a tabela — risco
  // desnecessario num banco que pode estar em volume montado.
  ['users', 'username', 'TEXT'],

  // De onde veio a conta: 'local' (senha) ou, no futuro, 'google'. Existe
  // desde ja para que a migracao para OAuth nao precise adivinhar quais
  // contas tem senha propria e quais delegam ao provedor.
  ['users', 'auth_provider', "TEXT NOT NULL DEFAULT 'local'"],

  // INDICE DE RELEVANCIA PARA O BRASIL, de 0 a 100, e a explicacao dele.
  //
  // Mede densidade de vinculo do texto com o pais — orgaos, empresas,
  // infraestrutura, UFs e setores brasileiros reconhecidos, mais as
  // correlacoes diretas com o acervo. Nao e importancia editorial nem risco.
  //
  // `br_motivo` viaja junto por decisao, nao por conveniencia: um indice sem
  // a explicacao ao lado e um numero que ninguem pode contestar, e portanto
  // nao vale nada. Ver server/src/lib/correlacao.js.
  ['articles', 'br_score', 'INTEGER'],
  ['articles', 'br_motivo', 'TEXT'],
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
  'CREATE INDEX IF NOT EXISTS idx_rw_crit ON ransomware_victims(criticality)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_actor_key ON threat_actors(name_key)',
  // Identificador de login unico. Parcial: contas antigas sem `username` nao
  // colidem entre si por serem todas NULL.
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_articles_br ON articles(br_score DESC)',
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
