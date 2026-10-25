import './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'
import { run, get, all, fecharBanco, agora } from '../src/db/index.js'
import { resolverSegredo } from '../src/lib/segredo.js'
import { emitirToken, lerToken, lerConta } from '../src/lib/auth.js'
import { adocaoDisponivel, adotarInstalacao } from '../src/lib/adocao.js'
import { registrarAuditoria, trilhaDeAuditoria } from '../src/lib/auditoria.js'
import { gerarNotificacoes, listarNotificacoes, marcarTodasLidas } from '../src/lib/notificacoes.js'
import { correlacionar } from '../src/lib/correlacao.js'
import { ransomwareDoPais } from '../src/lib/ransomwarePais.js'

before(async () => {
  delete process.env.AUTH_SECRET
  await bancoLimpo()
})
after(() => fecharBanco())

test('o segredo nasce no banco, é reaproveitado e o token faz o ciclo completo', async () => {
  const primeiro = await resolverSegredo()
  assert.equal(primeiro.origem, 'banco-novo')
  const segundo = await resolverSegredo()
  assert.equal(segundo.origem, 'banco')
  assert.equal(segundo.segredo, primeiro.segredo)

  const token = await emitirToken({ id: 1, name: 'x', email: 'x@x', role: 'user' })
  assert.equal((await lerToken(token)).sub, 1)
  assert.equal(await lerToken(`${token}a`), null)
})

test('adoção cria o administrador e se fecha em seguida', async () => {
  assert.equal(await adocaoDisponivel(), true)
  const conta = await adotarInstalacao({
    username: 'dono',
    password: 'senha-de-teste-longa',
    emailDerivado: (u) => `${u}@local.invalid`,
  })
  assert.equal(conta.role, 'admin')
  assert.equal(await adocaoDisponivel(), false)
  const de_novo = await adotarInstalacao({
    username: 'dono', password: 'outra-senha-longa', emailDerivado: (u) => `${u}@local.invalid`,
  })
  assert.equal(de_novo.id, conta.id)
})

test('lerConta autoriza pelo banco e respeita o marco de revogação', async () => {
  const conta = await get("SELECT * FROM users WHERE username = 'dono'")
  const token = await emitirToken(conta)
  const req = { headers: { authorization: `Bearer ${token}` } }
  await new Promise((ok) => lerConta(req, null, ok))
  assert.equal(req.conta.role, 'admin')

  // sessoes_desde é BIGINT em milissegundos e chega como Number
  await run('UPDATE users SET sessoes_desde = ? WHERE id = ?', [Date.now() + 10_000, conta.id])
  const req2 = { headers: { authorization: `Bearer ${token}` } }
  await new Promise((ok) => lerConta(req2, null, ok))
  assert.equal(req2.conta, null)
})

test('auditoria grava e a trilha junta governança e coleta', async () => {
  await registrarAuditoria({ conta: { sub: 1, name: 'Dono' } }, { acao: 'teste', alvo: 'alvo' })
  await run(
    "INSERT INTO collector_runs (collector, started_at, ok, trigger) VALUES ('rss', ?, 1, 'manual')",
    [agora()],
  )
  const trilha = await trilhaDeAuditoria(10)
  assert.deepEqual(trilha.map((t) => t.tipo).sort(), ['coleta', 'governanca'])
})

async function semear() {
  const [fonte] = (await all("INSERT INTO sources (slug, name, url, kind) VALUES ('f', 'Fonte', 'http://f', 'rss') RETURNING id"))
  await run(
    `INSERT INTO articles (source_id, guid, title, url, published_at, relevant, urgency)
     VALUES (?, 'g1', 'Ataque contra o Exército Brasileiro', 'https://x', iso_agora('-1 hours'), 1, 'CRITICO'),
            (?, 'g2', 'Antiga', 'https://y', iso_agora('-100 hours'), 1, 'CRITICO')`,
    [fonte.id, fonte.id],
  )
  await run(
    `INSERT INTO ransomware_victims (external_id, victim, website, "group", country, sector, discovered_at, criticality, nature)
     VALUES ('v1', 'Prefeitura de Teste', 'teste.rj.gov.br', 'Emperador', 'BR', 'governo',
             to_char(now() - interval '2 hours', 'YYYY-MM-DD HH24:MI:SS'), 'CRITICO', 'estado'),
            ('v2', 'Outra', 'outra.com.br', 'emperador', 'BR', 'saude', iso_agora('-3 days'), 'ALTO', 'privado')`,
  )
}

test('notificações: gera sem duplicar, lista por conta e marca como lidas', async () => {
  await semear()
  const conta = await get("SELECT * FROM users WHERE username = 'dono'")
  const a = await gerarNotificacoes({ rss: { coletor: 'rss', ok: false, erro: 'x' } })
  assert.equal(a.criadas, 3) // 1 matéria dentro da janela + 1 incidente + 1 falha de coletor
  const b = await gerarNotificacoes({})
  assert.equal(b.criadas, 0)

  const lista = await listarNotificacoes({ sub: conta.id, role: 'admin' })
  assert.equal(lista.total, 3)
  assert.equal(lista.unread, 3)
  assert.equal(await marcarTodasLidas({ sub: conta.id, role: 'admin' }), 3)
  assert.equal((await listarNotificacoes({ sub: conta.id, role: 'admin' })).unread, 0)
})

test('correlação por UF, grupo e vítimas do país roda sobre o Postgres', async () => {
  const r = await correlacionar({
    title: 'Grupo Emperador ataca prefeituras do Rio de Janeiro em vazamento de dados',
    summary: 'ransomware contra órgão do RJ',
  })
  const regras = r.correlacoes.map((c) => c.regra)
  assert.ok(regras.includes('grupo-citado'), regras.join(','))

  const pais = await ransomwareDoPais('BR')
  assert.equal(pais.total, 2)
  assert.equal(pais.itens.length, 2)
})
