import { bancoLimpo } from './ajuda.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

// Orçamento de 1 MB: qualquer banco migrado o estoura, e o item fica vermelho.
// Definido antes do import dinâmico porque config.js lê o ambiente ao carregar.
process.env.DB_ORCAMENTO_MB = '1'
const { capacidades } = await import('../src/services/status.js')
const { fecharBanco } = await import('../src/db/index.js')

before(() => bancoLimpo())
after(() => fecharBanco())

test('acima do orçamento, o item manda rodar VACUUM FULL (DELETE não encolhe o arquivo)', async () => {
  const item = (await capacidades()).find((c) => c.id === 'armazenamento')
  assert.equal(item.metricas.nivel, 'vermelho')
  assert.match(item.detalhe, /VACUUM FULL/)
  assert.match(item.descricao, /VACUUM FULL/)
  assert.doesNotMatch(item.descricao, /autovacuum devolve/i)
})
