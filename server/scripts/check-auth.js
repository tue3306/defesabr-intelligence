// -----------------------------------------------------------------------------
// TESTE DE AUTORIZAÇÃO
//
// Prova que a diferença entre os três perfis é verificada no SERVIDOR, e não
// apenas escondida na interface. Cada perfil é testado contra cada endpoint
// protegido, e o resultado é comparado com o esperado.
//
// O teste que mais importa é o de baixo: SEM SESSÃO. Se um endpoint de
// administrador responde a quem não tem token, esconder o botão no menu não
// protegeu nada — bastava saber o endereço.
//
//   node server/scripts/check-auth.js [http://localhost:3001]
// -----------------------------------------------------------------------------

const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')

const CONTAS = [
  { rotulo: 'sem sessão', email: null, senha: null, papel: null },
  { rotulo: 'usuário', email: 'usuario@defesabr.com', senha: 'usuario123', papel: 'user' },
  { rotulo: 'analista', email: 'analista@defesabr.com', senha: 'analista123', papel: 'analyst' },
  { rotulo: 'admin', email: 'admin@defesabr.com', senha: 'admin123', papel: 'admin' },
]

// Para cada rota, o papel mínimo. `null` = pública.
const ROTAS = [
  { metodo: 'GET', caminho: '/api/health', minimo: null },
  { metodo: 'GET', caminho: '/api/news?limit=1', minimo: null },
  { metodo: 'GET', caminho: '/api/news/clipping', minimo: null },
  { metodo: 'GET', caminho: '/api/legislative?limit=1', minimo: null },
  { metodo: 'GET', caminho: '/api/economy/indicators', minimo: null },
  { metodo: 'GET', caminho: '/api/search?q=marinha', minimo: null },

  { metodo: 'GET', caminho: '/api/sources', minimo: 'analyst' },
  { metodo: 'GET', caminho: '/api/system/runs', minimo: 'analyst' },
  { metodo: 'GET', caminho: '/api/system/method', minimo: 'analyst' },
  { metodo: 'POST', caminho: '/api/system/method/test', minimo: 'analyst', corpo: { text: 'Marinha do Brasil' } },

  { metodo: 'GET', caminho: '/api/system/status', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/system/capabilities', minimo: 'admin' },
]

const NIVEL = { user: 1, analyst: 2, admin: 3 }

async function entrar(conta) {
  if (!conta.email) return null
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: conta.email, password: conta.senha }),
  })
  if (!r.ok) throw new Error(`login de ${conta.rotulo} falhou: HTTP ${r.status}`)
  return (await r.json()).token
}

/** O que ESPERAMOS: 200 se o papel alcança o mínimo, senão 401 (sem sessão) ou 403. */
function esperado(minimo, papel) {
  if (!minimo) return 200
  if (!papel) return 401
  return (NIVEL[papel] || 0) >= NIVEL[minimo] ? 200 : 403
}

const cor = (t, c) => `\x1b[${c}m${t}\x1b[0m`

async function main() {
  console.log(`\nTestando autorização em ${BASE}\n`)

  let passaram = 0
  let falharam = 0

  for (const conta of CONTAS) {
    let token
    try {
      token = await entrar(conta)
    } catch (err) {
      console.log(cor(`  ${conta.rotulo}: ${err.message}`, 31))
      falharam += ROTAS.length
      continue
    }

    console.log(cor(`  ${conta.rotulo.toUpperCase()}`, 1))

    for (const rota of ROTAS) {
      const esperava = esperado(rota.minimo, conta.papel)
      let obtido
      try {
        const r = await fetch(BASE + rota.caminho, {
          method: rota.metodo,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: rota.corpo ? JSON.stringify(rota.corpo) : undefined,
        })
        obtido = r.status
      } catch (err) {
        obtido = `erro: ${err.message}`
      }

      const ok = obtido === esperava
      if (ok) passaram += 1
      else falharam += 1

      const marca = ok ? cor('  ok  ', 32) : cor(' FALHA', 31)
      const alvo = rota.minimo ? `[${rota.minimo}+]` : '[público]'
      console.log(
        `  ${marca} ${rota.metodo.padEnd(4)} ${rota.caminho.padEnd(34)} ${alvo.padEnd(11)}`
        + ` esperado ${esperava}, obtido ${obtido}`,
      )
    }
    console.log('')
  }

  const linha = '─'.repeat(56)
  console.log(linha)
  console.log(`  ${passaram} passaram · ${falharam} falharam\n`)
  process.exit(falharam ? 1 : 0)
}

main().catch((err) => {
  console.error(cor(`\n  Falha: ${err.message}\n`, 31))
  process.exit(1)
})
