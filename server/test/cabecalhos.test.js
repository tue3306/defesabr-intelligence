import { bancoLimpo } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// -----------------------------------------------------------------------------
// O QUE ESTE ARQUIVO GUARDA
//
// Antes havia duas camadas respondendo ao navegador: o Express e o CDN da
// plataforma, configurado num JSON que repetia os mesmos cabeçalhos. O teste de
// então comparava os dois textos para que não divergissem — conferia a CÓPIA,
// não a resposta.
//
// Agora quem responde é só este processo, e o que vale conferir é o que sai na
// resposta de verdade: os cabeçalhos de segurança, a política de cache (que é o
// que impede uma aba aberta de pedir o bundle do deploy anterior) e o 404 em
// arquivo ausente.
//
// `NODE_ENV` e `STATIC_DIR` são definidos ANTES do import de app.js: config.js é
// avaliado ao carregar. Cada arquivo de teste roda em processo próprio, então
// isto não contamina os outros.
// -----------------------------------------------------------------------------

process.env.NODE_ENV = 'production'

const dist = mkdtempSync(join(tmpdir(), 'defesabr-dist-'))
mkdirSync(join(dist, 'assets'))
writeFileSync(join(dist, 'index.html'), '<!doctype html><title>DefesaBR</title>')
writeFileSync(join(dist, 'assets', 'index-ABC123.js'), 'export default 1\n')
process.env.STATIC_DIR = dist

const { criarApp } = await import('../src/app.js')
const { CABECALHOS_SEGURANCA } = await import('../src/lib/cabecalhos.js')
const { fecharBanco } = await import('../src/db/index.js')

let servidor
let base

before(async () => {
  await bancoLimpo()
  servidor = criarApp().listen(0)
  await new Promise((pronto) => servidor.once('listening', pronto))
  base = `http://127.0.0.1:${servidor.address().port}`
})

after(async () => {
  await new Promise((fim) => servidor.close(fim))
  await fecharBanco()
})

test('todo cabeçalho de segurança sai na resposta, com o valor declarado', async () => {
  const r = await fetch(`${base}/api/health`)
  await r.text()
  assert.equal(r.status, 200)
  for (const { key, value } of CABECALHOS_SEGURANCA) {
    assert.equal(r.headers.get(key.toLowerCase()), value, key)
  }
})

test('a CSP não abre exceção para origem de fora', async () => {
  const r = await fetch(`${base}/api/health`)
  await r.text()
  const csp = r.headers.get('content-security-policy')
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /script-src 'self'/)
  assert.match(csp, /frame-ancestors 'none'/)
  // Nenhum http(s):// solto na política: tudo é servido pela própria origem.
  assert.doesNotMatch(csp, /https?:\/\//)
  // 'unsafe-inline' só em estilo (gráficos escrevem style=), nunca em script.
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/)
})

test('a interface compilada é servida, e o index.html nunca fica em cache', async () => {
  const r = await fetch(`${base}/`)
  const corpo = await r.text()
  assert.equal(r.status, 200)
  assert.match(corpo, /DefesaBR/)
  // Guardar o index é o que faz uma aba, depois de um deploy, pedir bundles que
  // já não existem.
  assert.equal(r.headers.get('cache-control'), 'no-cache')
})

test('arquivo com hash no nome é imutável por um ano', async () => {
  const r = await fetch(`${base}/assets/index-ABC123.js`)
  await r.text()
  assert.equal(r.status, 200)
  const cache = r.headers.get('cache-control')
  assert.match(cache, /max-age=31536000/)
  assert.match(cache, /immutable/)
})

test('arquivo que não existe dá 404, e não o index.html', async () => {
  // Devolver HTML aqui é o que mata a aba com "Expected a JavaScript-or-Wasm
  // module script but the server responded with a MIME type of text/html".
  const r = await fetch(`${base}/assets/index-ANTIGO.js`)
  const corpo = await r.text()
  assert.equal(r.status, 404)
  assert.doesNotMatch(corpo, /<!doctype/i)
})

test('caminho de tela recebe o index (o front roteia no navegador)', async () => {
  const r = await fetch(`${base}/clipping`)
  const corpo = await r.text()
  assert.equal(r.status, 200)
  assert.match(corpo, /DefesaBR/)
})

test('rota de API inexistente responde JSON, não a interface', async () => {
  const r = await fetch(`${base}/api/nao-existe`)
  assert.equal(r.status, 404)
  assert.match((await r.json()).error, /Rota não encontrada/)
})
