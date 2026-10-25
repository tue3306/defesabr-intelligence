// Arquivo à parte de propósito: `segredoDaSessao()` guarda a promessa do segredo
// por processo, e cada arquivo de teste roda no seu. Aqui o segredo NUNCA foi
// resolvido antes de o banco ser derrubado, então a primeira resolução falha.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { bancoLimpo } from './ajuda.js'

const { criarApp } = await import('../src/app.js')
const { run, fecharBanco } = await import('../src/db/index.js')
const { hashSenha } = await import('../src/lib/auth.js')

const SEGREDO = 'segredo-semeado-para-o-teste-0123456789'
let servidor
let base
let token

before(async () => {
  delete process.env.AUTH_SECRET
  await bancoLimpo()
  // Segredo semeado no banco e token assinado À MÃO: não passa por auth.js, cujo
  // cache ainda não pode ter resolvido o segredo.
  await run("INSERT INTO app_config (chave, valor) VALUES ('auth_secret', ?)", [SEGREDO])
  const { sal, hash } = await hashSenha('senha-de-teste-longa')
  await run(
    `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
     VALUES ('t', 't', 't@x.invalid', ?, ?, 'user', 'institucional', 'local')`,
    [hash, sal],
  )
  const corpo = Buffer.from(JSON.stringify({
    sub: 1, name: 't', email: 't@x.invalid', role: 'user', iat: Date.now(), exp: Date.now() + 3600_000,
  })).toString('base64url')
  token = `${corpo}.${createHmac('sha256', SEGREDO).update(corpo).digest('base64url')}`

  servidor = criarApp().listen(0)
  await new Promise((ok) => servidor.once('listening', ok))
  base = `http://127.0.0.1:${servidor.address().port}`
})
after(async () => {
  await new Promise((fim) => servidor.close(fim))
  await fecharBanco()
})

/** Esconde a tabela durante `fn` e a devolve SEMPRE, falhando ou não. */
async function comTabelaFora(tabela, fn) {
  await run(`ALTER TABLE ${tabela} RENAME TO ${tabela}_fora`)
  try {
    await fn()
  } finally {
    await run(`ALTER TABLE ${tabela}_fora RENAME TO ${tabela}`)
  }
}

const login = () => fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 't', password: 'senha-de-teste-longa' }),
})

test('token válido com o segredo irresolúvel dá 503 BANCO_INDISPONIVEL, nunca 401', async () => {
  await comTabelaFora('app_config', async () => {
    const r = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(r.status, 503)
    assert.equal((await r.json()).code, 'BANCO_INDISPONIVEL')
  })
})

test('login sem segredo resolúvel dá 503 SESSAO_INDISPONIVEL pelo tratador de erros', async () => {
  await comTabelaFora('app_config', async () => {
    const r = await login()
    assert.equal(r.status, 503)
    assert.equal((await r.json()).code, 'SESSAO_INDISPONIVEL')
  })
  // Restaurado o banco, a falha não ficou gravada: o mesmo login passa.
  const ok = await login()
  assert.equal(ok.status, 200)
})

test('o limitador falha fechado com 503 quando o banco dele falha', async () => {
  await comTabelaFora('limite_tentativas', async () => {
    const r = await login()
    assert.equal(r.status, 503)
    assert.equal((await r.json()).code, 'BANCO_INDISPONIVEL')
  })
})
