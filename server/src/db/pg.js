import { AsyncLocalStorage } from 'node:async_hooks'
import pg from 'pg'
import config from '../config.js'
import { opcoesDoPool, opcoesSsl } from './conexao.js'

// -----------------------------------------------------------------------------
// BANCO — Postgres pelo driver `pg`.
//
// Em produção o banco é o serviço Postgres do Railway, alcançado pela rede
// privada do projeto (`postgres.railway.internal`). Um processo só mantém o
// pool, então aqui não há pooler de terceiro no caminho e nada impede estado de
// sessão — mas o código segue sem prepared statements nomeados (`pg` só os cria
// quando a consulta recebe `name`), sem SET de sessão e sem LISTEN/NOTIFY, para
// não ficar preso a este arranjo: é o que permite pôr um pooler na frente
// (PgBouncer em modo transação) sem reescrever consulta nenhuma.
//
// A interface espelha a do adaptador SQLite (`db/index.js`), agora assíncrona,
// para que os chamadores mudem só o `await`. O SQL continua escrito com `?`.
// -----------------------------------------------------------------------------

// `pg` devolve int8 (COUNT, ids BIGINT) e numeric como string, para não perder
// precisão. Aqui os valores cabem em Number com folga, e o resto do código
// (e o JSON enviado ao front) espera número, como o SQLite entregava.
pg.types.setTypeParser(20, Number)
pg.types.setTypeParser(1700, Number)

// TLS, timeouts e a limpeza de `sslmode` da URL: ver db/conexao.js.
export const pool = new pg.Pool(opcoesDoPool({
  url: config.banco.url,
  poolMax: config.banco.poolMax,
  env: process.env,
}))

/**
 * Como a conexão está protegida: 'local' | 'privado' | 'desligado' |
 * 'verificado' | 'sem-verificacao'. Ver db/conexao.js.
 */
export const modoTls = opcoesSsl(config.banco.url, process.env).modo

// Cifrado sem verificar o servidor é melhor que texto puro, mas não é o fim da
// linha: avisa uma vez por instância, para o log de produção mostrar a lacuna.
// Não vale para 'privado' (rede interna do projeto, sem TLS por desenho) nem
// para 'local'.
if (modoTls === 'sem-verificacao') {
  console.warn('[banco] TLS sem verificação do servidor: defina DATABASE_CA_CERT com a CA do seu '
    + 'Postgres para verificar o certificado. Ver docs/DEPLOY.md.')
}

// Um erro em conexão ociosa (o servidor derrubou o socket) emitido sem ouvinte
// derrubaria o processo inteiro. Registrar evita o crash sem esconder a queda —
// e num processo longo é justamente o sinal que se quer ver no log.
pool.on('error', (err) => {
  console.error('[banco] erro em conexão ociosa:', err.message)
})

// Guarda o cliente da transação em curso, por cadeia assíncrona: chamadas feitas
// dentro de `transacao` o usam sem que o chamador precise passá-lo adiante.
// O valor é `{ cliente, ativo }`: o contexto sobrevive a toda continuação
// assíncrona iniciada dentro de `fn`, inclusive trabalho sem await que termina
// depois do COMMIT. `ativo` vira false ao fim da transação para que esse
// trabalho não use um cliente já devolvido ao pool.
const contexto = new AsyncLocalStorage()

/**
 * Converte os `?` do SQL em `$1…$n`, que é o que o Postgres entende.
 * `?` dentro de literal '…' fica intacto (o `''` escapado não encerra o
 * literal), então `LIKE '%?%'` continua sendo texto.
 */
export function traduzir(sql) {
  let saida = ''
  let n = 0
  let emLiteral = false
  for (const c of sql) {
    // Alternar a cada aspa trata `''` sem tratamento especial: fecha e reabre.
    if (c === "'") emLiteral = !emLiteral
    if (c === '?' && !emLiteral) saida += `$${++n}`
    else saida += c
  }
  return saida
}

/**
 * Cliente da transação corrente, ou o pool quando não há uma — ou quando ela já
 * terminou. Cair no pool (em vez de lançar) deixa uma gravação de auditoria
 * disparada sem await dentro da transação ainda chegar ao banco, fora dela.
 */
function executor() {
  const atual = contexto.getStore()
  return atual?.ativo ? atual.cliente : pool
}

const consultar = (sql, params) => executor().query(traduzir(sql), params)

export const all = async (sql, params = []) => (await consultar(sql, params)).rows
export const get = async (sql, params = []) => (await consultar(sql, params)).rows[0]
export const run = async (sql, params = []) => ({
  changes: (await consultar(sql, params)).rowCount ?? 0,
})

/**
 * INSERT que devolve a linha criada, via `RETURNING *`. Se o SQL já termina em
 * RETURNING, o do chamador vale e nada é acrescentado (dois RETURNING seriam
 * erro de sintaxe). `tabela` fica na assinatura por compatibilidade com o
 * adaptador antigo, que a usava para reler a linha; aqui não é necessária.
 */
// eslint-disable-next-line no-unused-vars
export async function insert(sql, params, tabela) {
  const completo = /\bRETURNING\b[^']*$/i.test(sql) ? sql : `${sql} RETURNING *`
  return (await consultar(completo, params)).rows[0]
}

/**
 * Executa em transação: ou tudo é gravado, ou nada. Chamada aninhada reaproveita
 * a transação externa (sem savepoints) — quem falha por dentro desfaz tudo.
 */
export async function transacao(fn) {
  if (contexto.getStore()?.ativo) return fn()
  const cliente = await pool.connect()
  const atual = { cliente, ativo: true }
  try {
    await cliente.query('BEGIN')
    const resultado = await contexto.run(atual, fn)
    await cliente.query('COMMIT')
    return resultado
  } catch (err) {
    try {
      await cliente.query('ROLLBACK')
    } catch {
      // Conexão já perdida: o erro que importa é o original.
    }
    throw err
  } finally {
    atual.ativo = false
    cliente.release()
  }
}

/** Instante atual no mesmo formato que o esquema grava. */
export const agora = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Encerra o pool (fim de teste, fim de script). */
export const fecharBanco = () => pool.end()

export { config }
