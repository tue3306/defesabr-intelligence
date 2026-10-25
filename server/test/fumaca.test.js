import './ajuda.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'

// Garante que os testes falam com o banco de testes e nunca com o de
// desenvolvimento — bancoLimpo() apaga o schema inteiro.
test('a base de testes aponta para defesabr_test', async () => {
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await cliente.connect()
  try {
    const { rows } = await cliente.query('SELECT current_database() AS banco')
    assert.equal(rows[0].banco, 'defesabr_test')
  } finally {
    await cliente.end()
  }
})
