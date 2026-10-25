// ajuda.js primeiro e sozinho: ele fixa DATABASE_URL antes de config.js ler.
// O adaptador entra por import() dinâmico, depois, para que a ordem de avaliação
// dos módulos não dependa de como o ESM iça os imports estáticos.
import { bancoLimpo } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

const { traduzir, all, get, run, insert, transacao, agora, fecharBanco, pool } =
  await import('../src/db/pg.js')

before(bancoLimpo)
after(fecharBanco)

test('o adaptador aponta para o banco de testes', async () => {
  const linha = await get('SELECT current_database() AS nome')
  assert.equal(linha.nome, 'defesabr_test')
})

test('traduzir numera em ordem', () => {
  assert.equal(traduzir('a = ? AND b = ?'), 'a = $1 AND b = $2')
})

test('traduzir ignora ? em literal', () => {
  assert.equal(traduzir("x LIKE '%?%' AND y = ?"), "x LIKE '%?%' AND y = $1")
})

test('traduzir respeita aspas escapadas', () => {
  assert.equal(traduzir("'it''s ?' = ?"), "'it''s ?' = $1")
})

test('insert devolve a linha criada com id numérico', async () => {
  await run('DELETE FROM audit_log')
  const linha = await insert(
    'INSERT INTO audit_log (created_at, action, target) VALUES (?, ?, ?)', [agora(), 'teste', 'alvo'], 'audit_log',
  )
  assert.equal(typeof linha.id, 'number')
  assert.equal(linha.action, 'teste')
})

test('insert não duplica um RETURNING que o chamador já escreveu', async () => {
  const linha = await insert(
    'INSERT INTO audit_log (created_at, action, target) VALUES (?, ?, ?) RETURNING id, action', [agora(), 'x', 'alvo'], 'audit_log',
  )
  assert.equal(linha.action, 'x')
})

test('run devolve changes', async () => {
  await run('DELETE FROM app_config')
  await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['a', '1'])
  await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['b', '2'])
  const r = await run('UPDATE app_config SET valor = ?', ['9'])
  assert.deepEqual(r, { changes: 2 })
})

test('COUNT chega como number', async () => {
  const linha = await get('SELECT COUNT(*) AS n FROM app_config')
  assert.equal(linha.n, 2)
  assert.equal(typeof linha.n, 'number')
})

test('all devolve array de objetos comuns', async () => {
  const linhas = await all('SELECT chave FROM app_config ORDER BY chave')
  assert.deepEqual(linhas.map((l) => l.chave), ['a', 'b'])
})

test('transacao faz rollback em erro', async () => {
  await run('DELETE FROM app_config')
  await assert.rejects(
    transacao(async () => {
      await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['r', '1'])
      throw new Error('falha')
    }),
    /falha/,
  )
  const linha = await get('SELECT COUNT(*) AS n FROM app_config')
  assert.equal(linha.n, 0)
})

test('chamadas dentro de transacao enxergam o que a transação gravou', async () => {
  await run('DELETE FROM app_config')
  await transacao(async () => {
    await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['t', '1'])
    const dentro = await get('SELECT valor FROM app_config WHERE chave = ?', ['t'])
    assert.equal(dentro.valor, '1')
    // Fora do contexto (outra conexão) a linha ainda não existe.
    const fora = await pool.query("SELECT 1 FROM app_config WHERE chave = 't'")
    assert.equal(fora.rowCount, 0)
  })
  assert.ok(await get('SELECT 1 AS ok FROM app_config WHERE chave = ?', ['t']))
})

test('transacao aninhada reaproveita a externa', async () => {
  await run('DELETE FROM app_config')
  await assert.rejects(
    transacao(async () => {
      await transacao(async () => {
        await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['n', '1'])
      })
      throw new Error('depois do aninhado')
    }),
  )
  const linha = await get('SELECT COUNT(*) AS n FROM app_config')
  assert.equal(linha.n, 0)
})

test('trabalho iniciado na transação mas executado depois dela usa o pool', async () => {
  await run('DELETE FROM app_config')
  // Espiona pool.query: o cliente devolvido ainda aceita consultas, então só a
  // chamada passar pelo pool prova que o contexto inativo foi ignorado.
  const original = pool.query.bind(pool)
  const chamadas = []
  pool.query = (texto, ...resto) => {
    chamadas.push(texto)
    return original(texto, ...resto)
  }
  try {
    let atrasado
    await transacao(async () => {
      // Sem await: só dispara depois do COMMIT, quando o cliente já foi devolvido.
      atrasado = new Promise((resolve) => setTimeout(resolve, 50))
        .then(() => run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', ['tarde', '1']))
    })
    assert.deepEqual(await atrasado, { changes: 1 })
    assert.ok(chamadas.some((t) => t.includes("INSERT INTO app_config")), 'o INSERT tardio deveria passar pelo pool')
  } finally {
    pool.query = original
  }
  assert.ok(await get('SELECT 1 AS ok FROM app_config WHERE chave = ?', ['tarde']))
})

test('transações concorrentes enxergam só as próprias linhas não confirmadas', async () => {
  await run('DELETE FROM app_config')
  const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const tentar = (chave, outra) => transacao(async () => {
    await run('INSERT INTO app_config (chave, valor) VALUES (?, ?)', [chave, '1'])
    await pausa(50) // garante que as duas estejam abertas ao mesmo tempo
    return {
      propria: Boolean(await get('SELECT 1 AS ok FROM app_config WHERE chave = ?', [chave])),
      alheia: Boolean(await get('SELECT 1 AS ok FROM app_config WHERE chave = ?', [outra])),
    }
  })
  const [a, b] = await Promise.all([tentar('a', 'b'), tentar('b', 'a')])
  assert.deepEqual(a, { propria: true, alheia: false })
  assert.deepEqual(b, { propria: true, alheia: false })
})

test('agora tem o formato YYYY-MM-DDTHH:MM:SSZ', () => {
  assert.match(agora(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
})
