import pg from 'pg'
import config from '../src/config.js'
import { aplicarMigracoes } from '../src/db/migracoes.js'

// Aplica as migrações de supabase/migrations no banco de DATABASE_URL.
// A semeadura (fontes iniciais, administrador) entra junto em outra etapa.
const cliente = new pg.Client({ connectionString: config.banco.url })

try {
  await cliente.connect()
  const { aplicadas, puladas } = await aplicarMigracoes(cliente)
  console.log(aplicadas.length ? `Aplicadas: ${aplicadas.join(', ')}` : 'Banco já está em dia.')
  if (puladas.length) console.log(`Puladas (sem pg_cron): ${puladas.join(', ')}`)
} catch (erro) {
  console.error(erro.message)
  process.exitCode = 1
} finally {
  await cliente.end()
}
