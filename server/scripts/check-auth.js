// -----------------------------------------------------------------------------
// TESTE DE AUTORIZAÇÃO
//
// Prova que a diferença entre os perfis é verificada no SERVIDOR, e não
// apenas escondida na interface. Cada perfil é testado contra cada endpoint
// protegido, e o resultado é comparado com o esperado.
//
// O teste que mais importa é o de baixo: SEM SESSÃO. Se um endpoint de
// administrador responde a quem não tem token, esconder o botão no menu não
// protegeu nada — bastava saber o endereço.
//
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... node server/scripts/check-auth.js [http://localhost:3001]
//
// A conta de administrador vem do ambiente — as mesmas variáveis que a criam no
// servidor. A de usuário é criada pela própria suíte, pelo cadastro, e removida
// no fim; assim o teste roda em qualquer instalação sem senha no código.
// -----------------------------------------------------------------------------

const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')

const SENHA_TESTE = `teste-${Math.random().toString(36).slice(2, 12)}`
const USUARIO_TESTE = `suite-${Date.now().toString(36)}`

const CONTAS = [
  { rotulo: 'sem sessão', usuario: null, senha: null, papel: null },
  { rotulo: 'usuário', usuario: USUARIO_TESTE, senha: SENHA_TESTE, papel: 'user', cadastrar: true },
  { rotulo: 'admin', usuario: process.env.ADMIN_USERNAME, senha: process.env.ADMIN_PASSWORD, papel: 'admin' },
]

// Para cada rota, o papel mínimo. `null` = pública.
const ROTAS = [
  { metodo: 'GET', caminho: '/api/health', minimo: null },
  { metodo: 'GET', caminho: '/api/news?limit=1', minimo: null },
  { metodo: 'GET', caminho: '/api/news/clipping', minimo: null },
  { metodo: 'GET', caminho: '/api/legislative?limit=1', minimo: null },
  { metodo: 'GET', caminho: '/api/economy/indicators', minimo: null },
  { metodo: 'GET', caminho: '/api/search?q=marinha', minimo: null },

  { metodo: 'GET', caminho: '/api/sources', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/system/runs', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/system/method', minimo: 'admin' },
  { metodo: 'POST', caminho: '/api/system/method/test', minimo: 'admin', corpo: { text: 'Marinha do Brasil' } },

  { metodo: 'GET', caminho: '/api/system/status', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/system/capabilities', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/system/audit', minimo: 'admin' },
  { metodo: 'GET', caminho: '/api/users', minimo: 'admin' },

  // ── ROTAS QUE MUDAM ESTADO ──
  //
  // ESTAS FALTAVAM, e a ausencia custou caro. A suite cobria doze rotas, todas
  // de LEITURA, e passava com 48 de 48 enquanto duas rotas de ESCRITA estavam
  // completamente abertas:
  //
  //   PATCH /api/sources/:id            desligava qualquer fonte da coleta.
  //     Conferido: um curl sem token nenhum respondia 200 e as fontes ativas
  //     caiam de 50 para 49. Cinquenta chamadas e a plataforma para de coletar,
  //     sem erro em lugar nenhum — desligar fonte e operacao legitima, entao
  //     nada acende.
  //
  //   POST /api/legislative/:id/refresh fazia o servidor consultar a Camara.
  //     Aberta, e um amplificador: quem chama gasta uma requisicao, os Dados
  //     Abertos recebem milhares, e o IP bloqueado seria o desta plataforma.
  //
  // As duas passaram despercebidas pelo mesmo motivo: o botao correspondente
  // esta escondido atras do papel de administrador NA INTERFACE, e ninguem
  // perguntou quem alcanca a rota por baixo. E o antipadrao que este projeto
  // ja corrigiu nos perfis — esconder o botao nao e controle de acesso.
  //
  // Uma suite de autorizacao que so testa leitura mede a metade que menos
  // importa: ler dado publico a mais e vazamento, escrever sem permissao e
  // sabotagem.
  //
  // POR QUE ESTES ALVOS. Cada uma e inofensiva quando autorizada, para a suite
  // poder rodar em producao sem estragar nada: `enabled: true` numa fonte ja
  // ligada nao muda coisa alguma, e os identificadores inexistentes fazem a
  // rota parar no 404 ANTES de tocar em qualquer coisa — o que se mede aqui e
  // a GUARDA, nao o efeito.
  {
    metodo: 'PATCH',
    caminho: '/api/sources/1',
    minimo: 'admin',
    corpo: { enabled: true },
    muta: true,
  },
  {
    metodo: 'POST',
    caminho: '/api/legislative/999999/refresh',
    minimo: 'admin',
    autorizado: 404,
    muta: true,
  },
  {
    metodo: 'POST',
    caminho: '/api/system/collect/999999',
    minimo: 'admin',
    autorizado: 404,
    muta: true,
  },

  // ── A PRÓPRIA CONTA ──
  //
  // Corpos invalidos de proposito: nome vazio e senha atual errada param em 400
  // sem mudar nada.
  { metodo: 'PATCH', caminho: '/api/auth/me', minimo: 'user', corpo: { name: '' }, autorizado: 400, muta: true },
  {
    metodo: 'PUT',
    caminho: '/api/auth/senha',
    minimo: 'user',
    corpo: { atual: 'errada-de-proposito', nova: 'qualquer-coisa' },
    // 429: a cota por conta desta rota e curta, e so quem passou da guarda a gasta.
    autorizado: [400, 429],
    muta: true,
  },

  // ── GOVERNANÇA DE CONTAS ──
  //
  // Identificador inexistente de proposito: quem passa da guarda recebe 404
  // antes de qualquer alteracao, e a suite roda em producao sem suspender nem
  // remover ninguem.
  {
    metodo: 'PATCH',
    caminho: '/api/users/999999',
    minimo: 'admin',
    corpo: { status: 'ativo' },
    autorizado: 404,
    muta: true,
  },
  {
    metodo: 'DELETE',
    caminho: '/api/users/999999',
    minimo: 'admin',
    autorizado: 404,
    muta: true,
  },

  // ── NOTIFICAÇÕES E GUIA ──
  //
  // Identificador inexistente de propósito: 404 prova que a guarda passou sem
  // mexer no estado de leitura de ninguém. `read-all` muda só a conta que chama.
  { metodo: 'GET', caminho: '/api/notifications', minimo: 'user' },
  { metodo: 'POST', caminho: '/api/notifications/read-all', minimo: 'user', muta: true },
  { metodo: 'POST', caminho: '/api/notifications/999999/read', minimo: 'user', autorizado: 404, muta: true },
  { metodo: 'DELETE', caminho: '/api/notifications/999999/read', minimo: 'user', autorizado: 404, muta: true },
  { metodo: 'DELETE', caminho: '/api/notifications/999999', minimo: 'user', autorizado: 404, muta: true },
  { metodo: 'GET', caminho: '/api/guia', minimo: 'user' },

  // A adoção é pública de propósito — ela existe para quando não há ninguém
  // para autenticar. Com administrador na instalação, responde 409 a qualquer
  // um, com ou sem sessão.
  { metodo: 'GET', caminho: '/api/auth/adocao', minimo: null },
  {
    metodo: 'POST',
    caminho: '/api/auth/adotar',
    minimo: null,
    corpo: { codigo: 'nao-importa', username: 'nao.criado', password: 'nao-importa-9' },
    autorizado: 409,
    muta: true,
  },
]

const NIVEL = { user: 1, admin: 2 }

async function entrar(conta) {
  if (conta.papel && (!conta.usuario || !conta.senha)) {
    throw new Error('defina ADMIN_USERNAME e ADMIN_PASSWORD no ambiente para testar o administrador')
  }
  if (!conta.usuario) return null
  if (conta.cadastrar) {
    const c = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: conta.usuario, password: conta.senha }),
    })
    if (c.status !== 201) throw new Error(`cadastro da conta de teste falhou: HTTP ${c.status}`)
  }
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: conta.usuario, password: conta.senha }),
  })
  if (!r.ok) throw new Error(`login de ${conta.rotulo} falhou: HTTP ${r.status}`)
  return (await r.json()).token
}

/**
 * O que ESPERAMOS: 401 sem sessão, 403 com papel insuficiente, e o desfecho
 * autorizado quando o papel alcança o mínimo.
 *
 * `rota.autorizado` existe porque nem toda rota permitida devolve 200: as que
 * recebem um identificador inexistente de propósito devolvem 404, e é isso que
 * as torna seguras de testar. Confundir "não autorizado" com "não encontrado"
 * é justamente o erro que este arquivo existe para não deixar passar.
 */
function esperado(rota, papel) {
  const autorizado = rota.autorizado || 200
  if (!rota.minimo) return autorizado
  if (!papel) return 401
  return (NIVEL[papel] || 0) >= NIVEL[rota.minimo] ? autorizado : 403
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
      const esperava = esperado(rota, conta.papel)
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

      // `esperado` pode devolver uma LISTA de códigos aceitáveis. É o caso das
      // rotas cujo resultado legítimo depende de configuração — o relatório
      // semanal devolve 200 com chave e 409 sem —, e nos dois casos a guarda
      // foi passada, que é o que esta suíte mede.
      const aceitos = Array.isArray(esperava) ? esperava : [esperava]
      const ok = aceitos.includes(obtido)
      if (ok) passaram += 1
      else falharam += 1

      const marca = ok ? cor('  ok  ', 32) : cor(' FALHA', 31)
      const alvo = rota.minimo ? `[${rota.minimo}+]` : '[público]'
      // As que mudam estado ficam marcadas: sao as que doem quando falham.
      const escrita = rota.muta ? cor(' ✎', 33) : '  '
      console.log(
        `  ${marca}${escrita} ${rota.metodo.padEnd(5)} ${rota.caminho.padEnd(34)} ${alvo.padEnd(11)}`
        + ` esperado ${aceitos.join(' ou ')}, obtido ${obtido}`,
      )
    }
    console.log('')
  }

  // Remove a conta de teste com a sessão do administrador.
  try {
    const admin = CONTAS.find((c) => c.papel === 'admin')
    const token = await entrar(admin)
    const lista = await fetch(`${BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
    const teste = lista.items?.find((u) => u.username === USUARIO_TESTE)
    if (teste) {
      await fetch(`${BASE}/api/users/${teste.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    }
  } catch {
    console.log(cor(`  aviso: não foi possível remover a conta de teste ${USUARIO_TESTE}`, 33))
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
