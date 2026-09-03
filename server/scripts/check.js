// Teste de fumaça da API: percorre TODOS os endpoints e valida a forma da
// resposta, não só o código HTTP. Um 200 com corpo vazio passaria num teste
// que só olha status — e é exatamente o tipo de falha que aparece na
// demonstração e não no desenvolvimento.
//
//   node scripts/check.js [http://localhost:3001]

const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')

let passou = 0
let falhou = 0
const problemas = []

// A suite passou a precisar de sessao.
//
// Metade dos endpoints exige papel desde que a autorizacao virou verificacao
// de servidor. Testa-los sem token nao prova que estao quebrados — prova que a
// protecao funciona, o que o `check-auth.js` ja verifica em detalhe.
//
// Aqui entramos como administrador, que alcanca tudo, para que este teste volte
// a medir o que ele existe para medir: a FORMA das respostas.
let TOKEN = null

async function autenticar() {
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@defesabr.com', password: 'admin123' }),
    })
    if (r.ok) TOKEN = (await r.json()).token
  } catch {
    // Sem sessao os testes de rota protegida falham, e devem falhar visivelmente.
  }
}

async function checar(nome, caminho, validar, opcoes = {}) {
  const url = BASE + caminho
  try {
    const r = await fetch(url, {
      method: opcoes.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': 'teste-de-fumaca',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        ...opcoes.headers,
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
    })
    const corpo = await r.json().catch(() => null)

    const esperado = opcoes.status || 200
    if (r.status !== esperado) {
      falhou += 1
      problemas.push(`${nome}: HTTP ${r.status} (esperado ${esperado})`)
      console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} HTTP ${r.status}`)
      return null
    }

    const nota = validar ? validar(corpo) : 'ok'
    if (nota === false || nota == null) {
      falhou += 1
      problemas.push(`${nome}: resposta com forma inesperada`)
      console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} forma inesperada`)
      return corpo
    }

    passou += 1
    console.log(`  \x1b[32m✓\x1b[0m ${nome.padEnd(36)} \x1b[2m${nota}\x1b[0m`)
    return corpo
  } catch (err) {
    falhou += 1
    problemas.push(`${nome}: ${err.message}`)
    console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} ${err.message}`)
    return null
  }
}

console.log(`\nTestando ${BASE}/api\n`)

await autenticar()
console.log(TOKEN
  ? '  [2msessão: administrador[0m'
  : '  [33msem sessão — rotas protegidas vão falhar[0m')

console.log('SISTEMA')
await checar('GET /health', '/api/health', (b) => b?.ok && `uptime ${b.uptime}s`)
await checar('GET /meta', '/api/meta', (b) => b?.fontes?.length && `${b.fontes.length} fontes declaradas`)
const status = await checar('GET /system/status', '/api/system/status',
  (b) => b?.capacidades?.length && `${b.resumo.operacional} operacionais, ${b.resumo.degradado} degradados, ${b.resumo.naoImplementado} não implementados`)
await checar('GET /system/capabilities', '/api/system/capabilities', (b) => b?.items?.length && `${b.items.length} capacidades`)
await checar('GET /system/runs', '/api/system/runs', (b) => Array.isArray(b?.items) && `${b.items.length} execuções, ${b.porColetor?.length} coletores`)
await checar('GET /system/method', '/api/system/method',
  (b) => b?.etapas?.length && `${b.termosFortes} fortes / ${b.termosFracos} fracos / ${b.exclusoes} exclusões`)

console.log('\nNOTÍCIAS')
const feed = await checar('GET /news', '/api/news?days=90&limit=10',
  (b) => Array.isArray(b?.items) && `${b.items.length} itens, ${b.totalRelevant} relevantes de ${b.totalCollected}`)
await checar('GET /news/clipping', '/api/news/clipping?days=30',
  (b) => Array.isArray(b?.news) && `${b.news.length} no período, alerta ${b.alert?.level ?? 'null'}`)
await checar('GET /news/stats', '/api/news/stats?days=90',
  (b) => Array.isArray(b?.porDia) && `${b.porDia.length} dias, ${b.porCategoria.length} categorias`)
if (feed?.items?.[0]) {
  await checar('GET /news/:id', `/api/news/${feed.items[0].id}`,
    (b) => b?.explicacao && `explicação: ${b.explicacao.relevante ? 'relevante' : 'recusado'}`)
}
await checar('GET /news/:id (inexistente)', '/api/news/99999999', () => 'recusa correta', { status: 404 })

console.log('\nDADOS PÚBLICOS')
await checar('GET /legislative', '/api/legislative?limit=5',
  (b) => Array.isArray(b?.items) && `${b.total} proposições, ${b.semSituacao} sem tramitação`)
await checar('GET /economy/indicators', '/api/economy/indicators',
  (b) => b?.indicators?.length && `${b.indicators.length} indicadores, câmbio ${b.exchange?.usd ? 'ok' : 'ausente'}`)
await checar('GET /economy/comparison', '/api/economy/comparison',
  (b) => Array.isArray(b?.items) && `${b.items.length} países${b.periodosDistintos ? ' (anos divergentes)' : ''}`)
await checar('GET /sources', '/api/sources',
  (b) => Array.isArray(b?.items) && `${b.total} fontes, ${b.comErro} com erro`)
await checar('GET /search', '/api/search?q=defesa',
  (b) => Array.isArray(b?.items) && `${b.total} resultados em ${b.groups?.length} grupos`)
await checar('GET /search (vazio)', '/api/search?q=', (b) => b?.total === 0 && 'devolve vazio, não erro')

console.log('\nFILTRO AO VIVO')
await checar('POST method/test (aprova)', '/api/system/method/test', (b) => b?.relevante === true && b.porque, {
  method: 'POST',
  body: { text: 'Forças Armadas ampliam Operação Ágata na faixa de fronteira norte' },
})
await checar('POST method/test (recusa)', '/api/system/method/test', (b) => b?.relevante === false && b.porque, {
  method: 'POST',
  body: { text: 'Justiça condena empresa em ação de defesa do consumidor' },
})
await checar('POST method/test (sem texto)', '/api/system/method/test', () => 'recusa correta', {
  method: 'POST', body: {}, status: 400,
})

console.log('\nFAVORITOS')
if (feed?.items?.[0]) {
  const id = feed.items[0].id
  await checar('POST /bookmarks/:id', `/api/bookmarks/${id}`, () => 'salvo', { method: 'POST', status: 201 })
  await checar('GET /bookmarks', '/api/bookmarks', (b) => b?.items?.some((i) => i.id === id) && `${b.total} salvos`)
  await checar('DELETE /bookmarks/:id', `/api/bookmarks/${id}`, (b) => b?.ok && 'removido', { method: 'DELETE' })
  await checar('GET /bookmarks (após remover)', '/api/bookmarks', (b) => !b.items.some((i) => i.id === id) && 'vazio de novo')
}
await checar('POST /bookmarks sem cliente', `/api/bookmarks/1`, () => 'recusa correta',
  { method: 'POST', status: 400, headers: { 'X-Client-Id': '' } })

console.log('\nERROS')
await checar('GET rota inexistente', '/api/nao-existe', (b) => b?.error && 'devolve JSON de erro', { status: 404 })

// ── Relatório ──
console.log(`\n${'─'.repeat(56)}`)
console.log(`  ${passou} passaram · ${falhou} falharam`)
if (problemas.length) {
  console.log('\nPROBLEMAS:')
  problemas.forEach((p) => console.log(`  • ${p}`))
}

if (status?.capacidades) {
  console.log('\nESTADO DAS CAPACIDADES:')
  for (const c of status.capacidades) {
    const marca = { operacional: '\x1b[32m●\x1b[0m', degradado: '\x1b[33m●\x1b[0m', nao_implementado: '\x1b[2m○\x1b[0m' }[c.estado]
    console.log(`  ${marca} ${c.nome.padEnd(38)} \x1b[2m${c.detalhe}\x1b[0m`)
  }
}

console.log()
process.exit(falhou ? 1 : 0)
