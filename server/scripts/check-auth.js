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
  { rotulo: 'sem sessão', usuario: null, senha: null, papel: null },
  { rotulo: 'usuário', usuario: 'usuario123', senha: 'usuario123', papel: 'user' },
  { rotulo: 'admin', usuario: 'admin123', senha: 'admin123', papel: 'admin' },
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
    minimo: 'analyst',
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

  // ── ASSISTENTE POR IA ──
  //
  // `PUT /api/ia/chave` GRAVA UM SEGREDO. E a rota mais sensivel que este
  // servidor tem: quem a alcanca sem ser administrador troca a chave de API de
  // quem hospeda — e o consumo e cobrado nessa pessoa.
  //
  // As de sintese e pergunta gastam dinheiro a cada chamada. Uma delas aberta
  // sem sessao seria conta aberta para a internet inteira.
  //
  // O corpo enviado a `PUT /ia/chave` e invalido de proposito: o teste quer
  // saber quem PASSA DA GUARDA, e passar da guarda com corpo invalido devolve
  // 400 — o que prova a autorizacao sem sobrescrever a chave da instalacao.
  {
    metodo: 'PUT',
    caminho: '/api/ia/chave',
    minimo: 'admin',
    corpo: { chave: 'formato-invalido-de-proposito' },
    autorizado: 400,
    muta: true,
  },
  {
    metodo: 'PUT',
    caminho: '/api/ia/modelo',
    minimo: 'admin',
    corpo: { modelo: '' },
    muta: true,
  },
  { metodo: 'GET', caminho: '/api/ia/estado', minimo: 'user' },
  { metodo: 'GET', caminho: '/api/ia/candidatas', minimo: 'user' },
  // Analise em lote. Lista vazia de proposito: 400 prova que a guarda passou,
  // sem gastar chamada de modelo nem depender de haver chave configurada.
  {
    metodo: 'POST',
    caminho: '/api/ia/analise',
    minimo: 'user',
    corpo: { ids: [] },
    // 429 TAMBEM PROVA QUE A GUARDA PASSOU, e por isso e aceito.
    //
    // Esta suite mede autorizacao, nao cota. Quem nao esta autenticado leva 401
    // em `exigirPapel`, ANTES do limitador — entao so quem passou pela guarda
    // pode receber 429. Recusa-lo faria a suite falhar na segunda execucao
    // dentro da mesma hora, e uma suite que nao roda duas vezes nao serve.
    autorizado: [400, 429],
    muta: true,
  },
  // Relatorio semanal. Sem chave devolve 409 — nao e falha, e recurso
  // desligado; com chave devolveria 200 do cache. Os dois passam da guarda.
  {
    metodo: 'POST',
    caminho: '/api/ia/semanal',
    minimo: 'user',
    corpo: {},
    // 200 com chave e cache, 409 sem chave, 429 com a cota gasta. Os tres
    // significam a mesma coisa aqui: a guarda deixou passar.
    autorizado: [200, 409, 429],
    muta: true,
  },
  // A leitura de uma correlacao. Id inexistente de proposito: 404 prova que a
  // guarda foi passada, sem gastar chamada de modelo.
  {
    metodo: 'POST',
    caminho: '/api/ia/correlacao/999999',
    minimo: 'user',
    autorizado: 404,
    muta: true,
  },

  // A CHAVE DA PROPRIA CONTA. Qualquer sessao configura a sua — e ninguem sem
  // sessao configura a de ninguem. Corpo invalido de proposito: o teste quer
  // saber quem passa da GUARDA, e passar com corpo invalido devolve 400 sem
  // sobrescrever a chave de quem estiver rodando a suite.
  {
    metodo: 'PUT',
    caminho: '/api/ia/minha-chave',
    minimo: 'user',
    corpo: { chave: 'formato-invalido-de-proposito' },
    autorizado: 400,
    muta: true,
  },
  {
    metodo: 'PUT',
    caminho: '/api/ia/meu-modelo',
    minimo: 'user',
    corpo: { modelo: '' },
    muta: true,
  },
  // Sem chave configurada a rota responde 409 (recurso nao ligado), que e
  // exatamente o estado de uma instalacao recem-clonada. O que se testa aqui e
  // a guarda: 401 sem sessao, e passar dela com sessao.
  {
    metodo: 'POST',
    caminho: '/api/ia/sintese',
    minimo: 'user',
    corpo: { days: 7 },
    // 429 tambem prova que a guarda passou — ver a nota em /api/ia/analise.
    autorizado: [409, 429],
    muta: true,
  },
  {
    metodo: 'POST',
    caminho: '/api/ia/perguntar',
    minimo: 'user',
    corpo: { pergunta: 'o que aconteceu no periodo' },
    autorizado: [409, 429],
    muta: true,
  },
]

const NIVEL = { user: 1, analyst: 2, admin: 3 }

async function entrar(conta) {
  if (!conta.usuario) return null
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

  const linha = '─'.repeat(56)
  console.log(linha)
  console.log(`  ${passaram} passaram · ${falharam} falharam\n`)
  process.exit(falharam ? 1 : 0)
}

main().catch((err) => {
  console.error(cor(`\n  Falha: ${err.message}\n`, 31))
  process.exit(1)
})
