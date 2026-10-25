// Apaga o banco de DATABASE_URL e o recria vazio: o schema `public` inteiro é
// derrubado e as migrações são reaplicadas. Na próxima subida local
// (`npm run dev`) o servidor semeia fontes e administrador e dispara a coleta.
//
// É destrutivo e não tem volta, então as travas ficam:
//   • pergunta antes, e só segue com "apagar" digitado (ou --sim/--yes);
//   • recusa banco que não esteja nesta máquina, a menos que se passe
//     --remoto. Uma DATABASE_URL de produção esquecida no .env não pode custar
//     o acervo e as contas de verdade num Enter distraído;
//   • recusa de todo jeito quando o ambiente é produção.
//
// O pool do adaptador NÃO é usado: um `pg.Client` próprio, aberto só depois da
// confirmação, para não tocar no banco antes de a pessoa dizer sim.
import pg from 'pg'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import config from '../src/config.js'
import { aplicarMigracoes } from '../src/db/migracoes.js'
import { opcoesDoCliente } from '../src/db/conexao.js'

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const forcar = process.argv.includes('--sim') || process.argv.includes('--yes')
const remotoPermitido = process.argv.includes('--remoto')

let alvo
try {
  const { hostname, port, pathname } = new URL(config.banco.url)
  alvo = { host: hostname, porta: port, nome: decodeURIComponent(pathname.replace(/^\//, '')) || 'postgres' }
} catch {
  console.error('DATABASE_URL ilegível: nada foi alterado.')
  process.exit(1)
}

// Só host, porta e nome: a URL carrega usuário e senha.
const descricao = `${alvo.host}${alvo.porta ? `:${alvo.porta}` : ''}/${alvo.nome}`
console.log(`Banco: ${descricao}`)

if (config.ambiente === 'production') {
  console.error('Recusado: o ambiente é produção. Este script só apaga banco de desenvolvimento.')
  process.exit(1)
}
if (!HOSTS_LOCAIS.has(alvo.host) && !remotoPermitido) {
  console.error('Recusado: o banco não está nesta máquina. Se é isso mesmo, rode de novo com --remoto.')
  process.exit(1)
}

if (!forcar) {
  const rl = createInterface({ input: stdin, output: stdout })
  const r = await rl.question('Apagar o banco? Contas e acervo somem; o acervo é recoletado na próxima subida. (digite "apagar") ')
  rl.close()
  if (r.trim().toLowerCase() !== 'apagar') {
    console.log('Cancelado. Nada foi alterado.')
    process.exit(0)
  }
}

// Mesmo TLS do pool (db/conexao.js): contra o Supabase a conexão é remota.
const cliente = new pg.Client(opcoesDoCliente({ url: config.banco.url, env: process.env }))
try {
  await cliente.connect()
  await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  const { aplicadas } = await aplicarMigracoes(cliente)
  console.log(`Esquema recriado (${aplicadas.length} migração(ões) aplicadas).`)
  console.log('\nPronto. Suba o servidor (npm run dev) para semear e coletar.')
} catch (erro) {
  console.error(`Falhou: ${erro.message}`)
  process.exitCode = 1
} finally {
  await cliente.end()
}
