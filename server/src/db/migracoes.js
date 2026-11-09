import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// db/migrations/ na raiz do repositório. O mesmo arquivo serve ao banco local,
// ao da CI e ao de produção; o controle do que já rodou é a tabela
// `schema_migrations`, criada aqui.
//
// Quem aplica é `npm run migrate` (esta função) ou a subida do servidor, que a
// chama antes de abrir a porta — então um deploy novo no Railway já sobe com o
// esquema em dia, sem passo manual. Nada de CLI de plataforma no meio: o
// esquema é do repositório.
const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'db', 'migrations')

const instante = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * Aplica, em ordem de nome, as migrações que ainda não constam em
 * `schema_migrations`. Cada arquivo roda numa transação própria: ou entra
 * inteiro, ou nada dele fica.
 *
 * Aceita `pg.Client` ou `pg.Pool`. Num Pool, BEGIN/COMMIT precisam cair na
 * MESMA conexão, então reservamos uma com `connect()`.
 *
 * `puladas` continua na resposta, sempre vazia: era onde entravam as migrações
 * que dependiam de uma extensão de agendamento do banco gerenciado anterior, e
 * que saíram com ele. Mantê-la poupa mexer em todo chamador, e deixa o lugar
 * pronto para o dia em que uma migração voltar a depender de extensão opcional.
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

    const sql = await readFile(join(PASTA, arquivo), 'utf8')
    await conexao.query('BEGIN')
    try {
      await conexao.query(sql)
      await conexao.query('INSERT INTO schema_migrations (nome, aplicada_em) VALUES ($1, $2)', [arquivo, instante()])
      await conexao.query('COMMIT')
    } catch (erro) {
      try {
        await conexao.query('ROLLBACK')
      } catch {
        // Conexão já perdida: o erro que explica a falha é o da migração.
      }
      throw new Error(`Migração ${arquivo} falhou: ${erro.message}`, { cause: erro })
    }
    aplicadas.push(arquivo)
  }

  return { aplicadas, puladas }
}

