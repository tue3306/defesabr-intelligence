import { AsyncLocalStorage } from 'node:async_hooks'
import pg from 'pg'
import config from '../config.js'

// -----------------------------------------------------------------------------
// BANCO — Postgres (Supabase) pelo driver `pg`.
//
// Em produção a conexão passa pelo pooler do Supabase em MODO TRANSAÇÃO
// (porta 6543): cada função serverless da Vercel abre poucas conexões e o
// pooler as multiplexa. Nesse modo uma conexão física só pertence ao cliente
// durante uma transação, então nada pode depender de estado de sessão — por
// isso não usamos prepared statements nomeados (`pg` só os cria quando a
// consulta recebe `name`), SET de sessão nem LISTEN/NOTIFY.
//
// A interface espelha a do adaptador SQLite (`db/index.js`), agora assíncrona,
// para que os chamadores mudem só o `await`. O SQL continua escrito com `?`.
// -----------------------------------------------------------------------------

// `pg` devolve int8 (COUNT, ids BIGINT) e numeric como string, para não perder
// precisão. Aqui os valores cabem em Number com folga, e o resto do código
// (e o JSON enviado ao front) espera número, como o SQLite entregava.
pg.types.setTypeParser(20, Number)
pg.types.setTypeParser(1700, Number)

export const pool = new pg.Pool({
  connectionString: config.banco.url,
  max: config.banco.poolMax,
})

// Um erro em conexão ociosa (o servidor derrubou o socket) emitido sem ouvinte
// derrubaria o processo inteiro. Registrar evita o crash sem esconder a queda,
// que no Supabase/serverless é justamente o sinal que se quer ver.
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
