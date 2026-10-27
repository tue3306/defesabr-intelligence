import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avaliarRelevancia } from '../src/lib/relevance.js'

// Pura: não abre banco. Casos reais que entraram no acervo indevidamente.

test('resenha de filme com "exército" genérico não entra no acervo', () => {
  const r = avaliarRelevancia('Uma aldeia contra um exército inteiro e um amor proibido no meio da guerra nesta aventura medieval com Robert Patrick')
  assert.equal(r.relevante, false)
})

test('"exército digital" de campanha política não entra', () => {
  const r = avaliarRelevancia('Como Janones montou um exército digital na campanha de Lula — e qual espaço pode ter no novo governo')
  assert.equal(r.relevante, false)
})

test('notícia que nomeia a instituição continua entrando, mesmo falando de filme', () => {
  const r = avaliarRelevancia('Exército Brasileiro lança filme sobre a Força Expedicionária na Segunda Guerra')
  assert.equal(r.relevante, true)
})

test('notícia militar comum continua entrando', () => {
  assert.equal(avaliarRelevancia('Exército envia tropas para a fronteira com a Venezuela').relevante, true)
  assert.equal(avaliarRelevancia('Ucrânia: Zelenskyy denuncia mês de espera por aprovação de mísseis Patriot').relevante, true)
})

test('"submarino nuclear de ataque" é classe de navio, não ataque: não vira CRÍTICO', async () => {
  const { classificar } = await import('../src/lib/relevance.js')
  const t = 'Naval Group apresenta o Rubis, quinto submarino nuclear de ataque do programa Barracuda'
  assert.notEqual(classificar(t, t).urgencia, 'CRITICO')
})

test('ataque de verdade continua CRÍTICO', async () => {
  const { classificar } = await import('../src/lib/relevance.js')
  const t = 'Drone de ataque atinge base e deixa mortos; Exército confirma ataque'
  const r = classificar(t, t)
  assert.equal(r.urgencia, 'CRITICO')
})
