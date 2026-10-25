import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'

const { default: express } = await import('express')
const { run, get, fecharBanco } = await import('../src/db/index.js')
const { resolverSegredo } = await import('../src/lib/segredo.js')
const { limitar, apagarJanelasVencidas } = await import('../src/lib/limite.js')
const { emitirToken, lerConta } = await import('../src/lib/auth.js')

let servidor
let base

// Rotas de teste atrás de limitar(); cada teste usa a sua, porque a chave do
// limite inclui o caminho e os testes não podem dividir cota.
before(async () => {
  delete process.env.AUTH_SECRET
  await bancoLimpo()
  const app = express()
  app.set('trust proxy', 1)
  app.get('/rajada', limitar({ max: 10, janelaMs: 60_000, soFalhas: true }), (_req, res) => {
    setTimeout(() => res.status(401).json({ ok: false }), 20)
  })
  app.get('/sucesso', limitar({ max: 10, janelaMs: 60_000, soFalhas: true }), (_req, res) => {
    res.json({ ok: true })
  })
  app.get('/forjado', limitar({ max: 10, janelaMs: 60_000, soFalhas: true }), (_req, res) => {
    res.status(401).json({ ok: false })
  })
  app.get('/semeada', limitar({ max: 5, janelaMs: 60_000 }), (_req, res) => res.json({ ok: true }))
  app.get('/janela', limitar({ max: 2, janelaMs: 60_000 }), (_req, res) => res.json({ ok: true }))
  await new Promise((ok) => { servidor = app.listen(0, ok) })
  base = `http://127.0.0.1:${servidor.address().port}`
})
after(async () => {
  await new Promise((ok) => servidor.close(ok))
  await fecharBanco()
})

test('duas resoluções simultâneas dão o mesmo segredo', async () => {
  await run("DELETE FROM app_config WHERE chave = 'auth_secret'")
  const [a, b] = await Promise.all([resolverSegredo(), resolverSegredo()])
  assert.equal(a.segredo, b.segredo)
  assert.equal(a.origem === 'banco' || b.origem === 'banco', true)
})

test('limitar admite só max em rajada concorrente', async () => {
  const respostas = await Promise.all(
    Array.from({ length: 30 }, () => fetch(`${base}/rajada`)),
  )
  const codigos = respostas.map((r) => r.status)
  assert.equal(codigos.filter((c) => c === 401).length, 10)
  assert.equal(codigos.filter((c) => c === 429).length, 20)
  const barrada = respostas.find((r) => r.status === 429)
  assert.ok(Number(barrada.headers.get('retry-after')) > 0)

  // O contador está NO BANCO: 10 admitidas ficam contadas e as 20 barradas
  // devolveram a vaga que reservaram (contagem não passa de max).
  const linha = await get("SELECT contagem FROM limite_tentativas WHERE chave LIKE '%:/rajada'")
  assert.equal(linha.contagem, 10)
})

test('o teto lê o que está gravado em limite_tentativas', async () => {
  // Linha semeada direto no banco, na chave que o middleware montaria para este
  // IP (XFF com um único salto = o que o proxy viu). Com um Map em memória a
  // primeira requisição seria admitida; só um contador no banco a barra.
  const expira = Date.now() + 60_000
  await run(
    'INSERT INTO limite_tentativas (chave, contagem, expira) VALUES (?, 5, ?)',
    ['203.0.113.50:/semeada', expira],
  )
  const r = await fetch(`${base}/semeada`, { headers: { 'X-Forwarded-For': '203.0.113.50' } })
  assert.equal(r.status, 429)
  const retry = Number(r.headers.get('retry-after'))
  assert.ok(Math.abs(retry - Math.ceil((expira - Date.now()) / 1000)) <= 2)
  assert.equal((await r.json()).code, 'LIMITE_EXCEDIDO')
})

test('sucesso estorna a cota', async () => {
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${base}/sucesso`)
    assert.equal(r.status, 200)
    await r.text()
    // o estorno roda em `finish`, depois da resposta; dá tempo ao banco
    await new Promise((ok) => setTimeout(ok, 30))
  }
})

test('X-Forwarded-For forjado não muda a chave', async () => {
  // Atrás de um proxy confiável (Vercel), ele ACRESCENTA o IP real ao fim da
  // cadeia: o cliente forja o começo, o último salto é o que o proxy viu. Com
  // trust proxy = 1, req.ip é esse último salto — simulado aqui com o mesmo IP
  // real (203.0.113.7) ao fim e um valor forjado diferente no começo.
  const codigos = []
  for (let i = 0; i < 11; i++) {
    const r = await fetch(`${base}/forjado`, {
      headers: { 'X-Forwarded-For': `10.9.8.${i}, 203.0.113.7` },
    })
    codigos.push(r.status)
    await r.text()
  }
  assert.deepEqual(codigos.slice(0, 10), Array(10).fill(401))
  assert.equal(codigos[10], 429)
})

test('apagarJanelasVencidas remove só o que venceu', async () => {
  await run("INSERT INTO limite_tentativas (chave, contagem, expira) VALUES ('velha', 3, ?)", [Date.now() - 1000])
  const n = await apagarJanelasVencidas()
  assert.ok(n >= 1)
  const r = await fetch(`${base}/janela`)
  assert.equal(r.status, 200)
})

test('lerConta com banco fora responde 503', async () => {
  process.env.AUTH_SECRET = 'segredo-de-teste-com-mais-de-16'
  const token = await emitirToken({ id: 1, name: 'x', email: 'x@x', role: 'user' })
  await run('ALTER TABLE users RENAME TO users_fora')
  try {
    const req = { headers: { authorization: `Bearer ${token}` } }
    let status = null
    let corpo = null
    let seguiu = false
    const res = { status(s) { status = s; return this }, json(c) { corpo = c; return this } }
    await lerConta(req, res, () => { seguiu = true })
    assert.equal(seguiu, false)
    assert.equal(status, 503)
    assert.equal(corpo.code, 'BANCO_INDISPONIVEL')
  } finally {
    await run('ALTER TABLE users_fora RENAME TO users')
  }
})
