import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// supabase/migrations/ na raiz do repositório: é onde a CLI do Supabase também
// as procura, então o mesmo arquivo serve ao banco local e ao de produção.
const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'supabase', 'migrations')

// Migrações cujo nome começa com 01 dependem de pg_cron (agendamento), que só
// existe no Supabase. Fora dele são puladas, e não tratadas como erro.
const PREFIXO_CRON = '01'

const instante = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * Aplica, em ordem de nome, as migrações que ainda não constam em
 * `schema_migrations`. Cada arquivo roda numa transação própria: ou entra
 * inteiro, ou nada dele fica.
 *
 * Aceita `pg.Client` ou `pg.Pool`. Num Pool, BEGIN/COMMIT precisam cair na
 * MESMA conexão, então reservamos uma com `connect()`.
 *
 * @param {import('pg').Client | import('pg').Pool} cliente
 * @returns {Promise<{ aplicadas: string[], puladas: string[] }>}
 */
export async function aplicarMigracoes(cliente) {
  const ehPool = typeof cliente.totalCount === 'number'
  const conexao = ehPool ? await cliente.connect() : cliente
  try {
    return await aplicar(conexao)
  } finally {
    if (ehPool) conexao.release()
  }
}

async function aplicar(conexao) {
  // RLS ligado já na criação, sem política: ver 0002_rls.sql para o porquê.
  await conexao.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome        TEXT PRIMARY KEY,
      aplicada_em TEXT NOT NULL
    );
    ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
  `)

  const { rows } = await conexao.query('SELECT nome FROM schema_migrations')
  const jaAplicadas = new Set(rows.map((r) => r.nome))

  const arquivos = (await readdir(PASTA)).filter((f) => f.endsWith('.sql')).sort()
  const aplicadas = []
  const puladas = []

  for (const arquivo of arquivos) {
    if (jaAplicadas.has(arquivo)) continue

    if (arquivo.startsWith(PREFIXO_CRON) && !(await temPgCron(conexao))) {
      puladas.push(arquivo)
      continue
    }

    const sql = await readFile(join(PASTA, arquivo), 'utf8')
    await conexao.query('BEGIN')
    try {
      await conexao.query(sql)
      await conexao.query('INSERT INTO schema_migrations (nome, aplicada_em) VALUES ($1, $2)', [arquivo, instante()])
      await conexao.query('COMMIT')
    } catch (erro) {
      await conexao.query('ROLLBACK')
      throw new Error(`Migração ${arquivo} falhou: ${erro.message}`, { cause: erro })
    }
    aplicadas.push(arquivo)
  }

  return { aplicadas, puladas }
}

async function temPgCron(conexao) {
  const { rows } = await conexao.query("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'")
  return rows.length > 0
}
