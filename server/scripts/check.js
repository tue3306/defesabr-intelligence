// Teste de fumaça da API: percorre TODOS os endpoints e valida a forma da
// resposta, não só o código HTTP. Um 200 com corpo vazio passaria num teste
// que só olha status — e é exatamente o tipo de falha que aparece na
// produção e não no desenvolvimento.
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
      body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }),
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
        // `semSessao` existe para o caso em que a AUSENCIA de sessao E o
        // objeto do teste. A suite entra como administrador para poder medir
        // a forma das respostas protegidas, e isso mascarava a verificacao de
        // "sem dono, recusa": com sessao, a conta E o dono.
        ...(TOKEN && !opcoes.semSessao ? { Authorization: `Bearer ${TOKEN}` } : {}),
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
// O Radar só pode trazer proposição com termo de defesa na ementa, e cada uma
// diz qual. `todas=true` devolve também as de fora, marcadas como tal.
await checar('GET /legislative', '/api/legislative?limit=300',
  (b) => Array.isArray(b?.items)
    && b.items.every((i) => i.relevante === true && i.termos?.length > 0)
    && `${b.total} no Radar de ${b.coletadas} coletadas, ${b.semSituacao} sem tramitação`)
await checar('GET /legislative?todas', '/api/legislative?limit=300&todas=true',
  (b) => Array.isArray(b?.items)
    && b.items.filter((i) => !i.relevante).length === Math.min(b.foraDoDominio, b.items.length)
    && `${b.foraDoDominio} fora do domínio, marcadas`)
await checar('GET /economy/indicators', '/api/economy/indicators',
  (b) => b?.indicators?.length && `${b.indicators.length} indicadores, câmbio ${b.exchange?.usd ? 'ok' : 'ausente'}`)
await checar('GET /economy/comparison', '/api/economy/comparison',
  (b) => Array.isArray(b?.items) && `${b.items.length} países${b.periodosDistintos ? ' (anos divergentes)' : ''}`)
await checar('GET /sources', '/api/sources',
  (b) => Array.isArray(b?.items) && `${b.total} fontes, ${b.comErro} com erro`)
await checar('GET /search', '/api/search?q=defesa',
  (b) => Array.isArray(b?.items) && `${b.total} resultados em ${b.groups?.length} grupos`)
await checar('GET /search (vazio)', '/api/search?q=', (b) => b?.total === 0 && 'devolve vazio, não erro')

console.log('\nNOTIFICAÇÕES E GUIA')
const avisos = await checar('GET /notifications', '/api/notifications?limit=20',
  (b) => Array.isArray(b?.items) && Number.isInteger(b.unread) && `${b.total} aviso(s), ${b.unread} por ler`)
if (avisos?.items?.[0]) {
  // Lê e devolve ao estado anterior: a suíte não pode mudar o que a conta viu.
  const n = avisos.items[0]
  await checar('POST /notifications/:id/read', `/api/notifications/${n.id}/read`, (b) => b?.read === true && 'marcada como lida', { method: 'POST' })
  await checar('GET /notifications (lida)', '/api/notifications?limit=20',
    (b) => b?.items?.find((i) => i.id === n.id)?.read === true && 'estado gravado na conta')
  if (!n.read) {
    await checar('DELETE /notifications/:id/read', `/api/notifications/${n.id}/read`, (b) => b?.read === false && 'de volta a não lida', { method: 'DELETE' })
  }
}
await checar('POST /notifications/:id/read (inexistente)', '/api/notifications/99999999/read', () => 'recusa correta', { method: 'POST', status: 404 })
// A adoção só existe enquanto a instalação não tem administrador. Aqui tem —
// a suíte entrou como um —, então a rota precisa dizer que está fechada.
await checar('GET /auth/adocao', '/api/auth/adocao',
  (b) => b?.disponivel === false && 'fechada: a instalação já tem administrador')
await checar('POST /auth/adotar (com administrador)', '/api/auth/adotar', (b) => b?.code === 'JA_TEM_ADMINISTRADOR' && 'recusa correta',
  { method: 'POST', body: { codigo: 'nao-importa', username: 'nao.criado', password: 'nao-importa-9' }, status: 409 })
await checar('GET /meta (contas e disco)', '/api/meta',
  (b) => b?.contas && typeof b.contas.variaveis?.ADMIN_USERNAME === 'boolean'
    && typeof b.armazenamento?.persistente === 'boolean'
    && `${b.contas.administradoresAtivos} administrador(es) ativo(s) de ${b.contas.total} conta(s)`
      + ` · banco ${b.armazenamento.persistente ? 'persistente' : 'EFÊMERO'}`)
await checar('GET /guia', '/api/guia', (b) => b?.telas?.length && b?.naoFaz?.length && `${b.telas.length} telas no guia`)

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
// FAVORITO SEM DONO: nem sessao, nem identificador de cliente. E o unico caso
// em que a rota deve recusar — e o teste so prova isso se ele proprio nao
// estiver autenticado, senao a conta do administrador vira o dono e a resposta
// legitima passa a ser 201.
await checar('POST /bookmarks sem dono', `/api/bookmarks/1`, () => 'recusa correta',
  { method: 'POST', status: 400, semSessao: true, headers: { 'X-Client-Id': '' } })

// A PASTA SEGUE A CONTA. Com sessao, o cabecalho de cliente e irrelevante: dois
// clientes diferentes na MESMA conta veem a mesma pasta. E o que faz "Minha
// Pasta" sobreviver a troca de navegador, e o que impede um visitante de
// alcancar a pasta de alguem escrevendo um identificador no cabecalho.
if (feed?.items?.[0]) {
  const id = feed.items[0].id
  await checar('POST /bookmarks (conta)', `/api/bookmarks/${id}`,
    () => 'salvo na conta', { method: 'POST', status: 201, headers: { 'X-Client-Id': 'navegador-A' } })
  await checar('GET /bookmarks (outro navegador)', '/api/bookmarks',
    (b) => b?.items?.some((i) => i.id === id) && 'a pasta segue a conta',
    { headers: { 'X-Client-Id': 'navegador-B' } })
  await checar('GET /bookmarks (visitante)', '/api/bookmarks',
    (b) => b?.total === 0 && 'visitante nao alcanca a pasta da conta',
    { semSessao: true, headers: { 'X-Client-Id': 'navegador-A' } })
  await checar('DELETE /bookmarks (conta)', `/api/bookmarks/${id}`,
    (b) => b?.ok && 'removido', { method: 'DELETE' })
}

// Regra de domínio das proposições: lógica pura, sem rede. Casos reais do
// acervo — os que a regra deve aceitar e os que ela existe para recusar.
console.log('\nREGRA DAS PROPOSIÇÕES')
{
  const { avaliarProposicao } = await import('../src/lib/proposicoes.js')
  const casos = [
    ['Dispõe sobre medidas de valorização dos militares das Forças Armadas.', true],
    ['Altera a Lei nº 1.001, de 21 de outubro de 1969 (Código Penal Militar).', true],
    ['Aprova o texto do Acordo de Cooperação em Defesa entre o Brasil e a Arábia Saudita.', true],
    ['Institui política para trabalhadores substituídos por automação e inteligência artificial.', false],
    ['Dispõe sobre auxílio-fardamento para policiais-militares, bombeiros-militares e guardas municipais.', false],
    ['Altera a Lei nº 14.751, de 2023, para garantir ao militar estadual a vedação de regresso.', false],
    ['Para que a Comissão de Relações Exteriores e Defesa Nacional apure o contrato da COP30.', false],
    ['Cria a Universidade Federal da Fronteira Norte.', false],
  ]
  for (const [ementa, esperado] of casos) {
    const nome = `${esperado ? 'aceita' : 'recusa'}: ${ementa.slice(0, 26)}…`
    const r = avaliarProposicao(ementa)
    if (r.relevante === esperado) {
      passou += 1
      console.log(`  \x1b[32m✓\x1b[0m ${nome.padEnd(36)} \x1b[2m${r.termos.join(', ') || 'sem termo'}\x1b[0m`)
    } else {
      falhou += 1
      problemas.push(`regra das proposições: ${nome}`)
      console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} esperado ${esperado}`)
    }
  }
}

// Lente mundial e detecção de país: lógica pura, sem rede. Os negativos são as
// armadilhas que a medição encontrou — "guerra" de preços, o "ataque" do time,
// o "US" do torneio e o pronome, o verbo "irá" e "irão", o hospital
// Sírio-Libanês —, e cada uma voltaria na próxima mudança de vocabulário sem
// um caso que a denuncie.
console.log('\nLENTE MUNDIAL')
{
  const { avaliarMundo, detectarTeatros, urgenciaMundo } = await import('../src/lib/mundo.js')
  const { detectarPaises } = await import('../src/lib/geo.js')
  const conferir = (nome, ok, nota) => {
    if (ok) {
      passou += 1
      console.log(`  \x1b[32m✓\x1b[0m ${nome.padEnd(36)} \x1b[2m${nota}\x1b[0m`)
    } else {
      falhou += 1
      problemas.push(`lente mundial: ${nome}`)
      console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} ${nota}`)
    }
  }

  const casos = [
    ['Rússia lança mísseis contra Kiev durante a madrugada', true],
    ['Israel bombardeia Rafah, no sul da Faixa de Gaza', true],
    ['Pentágono envia porta-aviões ao Caribe', true],
    ['Irã ameaça fechar o Estreito de Ormuz', true],
    ['Houthis atacam navio mercante no Mar Vermelho', true],
    ['US airstrike kills militants in Somalia', true],
    ['NATO allies boost troops on the eastern flank', true],
    ['Ukraine says Russian drones hit Kharkiv overnight', true],
    ['Supermercados dos EUA travam guerra de preços com a China', false],
    ['Ataque do Flamengo decide clássico contra o Vasco', false],
    ['Call of Duty ganha novo trailer com guerra na Ucrânia', false],
    ['Alcaraz vence a final do US Open em Nova York', false],
    ['Tell us what you think about the new phone', false],
    ['Irá assumir o cargo na próxima semana, diz ministro', false],
    ['Os termômetros irão variar ao longo da semana', false],
    ['Paciente segue internado no Hospital Sírio-Libanês', false],
    ['Hackers invadem site de prefeitura alemã', false],
  ]
  for (const [texto, esperado] of casos) {
    const r = avaliarMundo(texto)
    conferir(`${esperado ? 'aprova' : 'recusa'}: ${texto.slice(0, 26)}…`, r.mundo === esperado,
      r.mundo === esperado ? (r.termos.join(', ') || 'sem termo') : `esperado ${esperado}, termos: ${r.termos.join(', ')}`)
  }

  const paises = [
    ['U.S. troops arrive in Poland', 'United States of America', true],
    ['Alcaraz vence a final do US Open', 'United States of America', false],
    ['Help us build a better city', 'United States of America', false],
    ['Irá assumir o cargo, diz ministro', 'Iran', false],
    ['Irã retoma enriquecimento de urânio', 'Iran', true],
    ['Boletim do Hospital Sírio-Libanês', 'Syria', false],
  ]
  for (const [texto, pais, esperado] of paises) {
    const achou = detectarPaises(texto).includes(pais)
    conferir(`${esperado ? 'país' : 'sem país'}: ${texto.slice(0, 24)}…`, achou === esperado, `${pais}: ${achou}`)
  }

  conferir('teatro: Zelensky em Kiev', detectarTeatros('Zelensky recebe aliados em Kiev').includes('russia-ucrania'), 'russia-ucrania')
  conferir('teatro: "irá" não é o Irã', detectarTeatros('Irá assumir o cargo').length === 0, 'nenhum teatro')
  conferir('teatro: Índia e Paquistão juntos', detectarTeatros('Índia acusa Paquistão de ataque').includes('india-paquistao')
    && !detectarTeatros('Índia lança satélite').includes('india-paquistao'), 'só com os dois')
  conferir('urgência: invasão militar', urgenciaMundo('Rússia inicia invasão terrestre no norte') === 'CRITICO', 'CRITICO')
  conferir('urgência: invasão de site', urgenciaMundo('Hackers anunciam invasão de site do governo') !== 'CRITICO', 'não é CRITICO')
  conferir('urgência: 45 mortos', urgenciaMundo('Bombardeio deixa 45 mortos em Gaza') === 'CRITICO', 'CRITICO')
}

// URGÊNCIA DO RECORTE BRASIL — o degrau CRÍTICO é o que abre o aviso que
// interrompe a tela. Os casos são manchetes reais do acervo de setembro de
// 2026: as que ocupavam o topo sem narrar ataque nenhum, e as que precisam
// continuar lá.
console.log('\nURGÊNCIA')
{
  const { classificar } = await import('../src/lib/relevance.js')
  const conferir = (nome, ok, nota) => {
    if (ok) {
      passou += 1
      console.log(`  \x1b[32m✓\x1b[0m ${nome.padEnd(36)} \x1b[2m${nota}\x1b[0m`)
    } else {
      falhou += 1
      problemas.push(`urgência: ${nome}`)
      console.log(`  \x1b[31m✗\x1b[0m ${nome.padEnd(36)} ${nota}`)
    }
  }
  const casos = [
    ['Rússia diz que lançou ataque massivo contra Kiev, Zaporizhia e Odessa', 'CRITICO'],
    ['Caças da Otan abatem drone que invadiu o espaço aéreo da Lituânia', 'CRITICO'],
    ['Prédio desaba em Gaza e mata ao menos 21', 'CRITICO'],
    ['Guerra no Irã já custou R$ 224 bilhões aos EUA, diz Pentágono', 'ALTO'],
    ['Brasil e Argentina: crise entre governos começa a pressionar a relação', 'ALTO'],
    ['A relação entre o filme Guerra nas Estrelas e a Marinha dos EUA', 'BAIXO'],
    ['Indra apresenta míssil de cruzeiro para ataques a mais de 300 quilômetros', 'MEDIO'],
    ['11 de Setembro: como os ataques de 2001 transformaram as Forças Armadas', 'MEDIO'],
    ['UFRJ homenageia vítimas da ditadura com diplomas póstumos', 'MEDIO'],
    ['Análise: fazer Otan arcar com despesas da guerra só enfraquece os EUA', 'MEDIO'],
    ['Exército capacita pelotões especializados no confronto anticarro', 'MEDIO'],
  ]
  for (const [titulo, esperado] of casos) {
    const { urgencia } = classificar(titulo, titulo)
    conferir(`${esperado}: ${titulo.slice(0, 26)}…`, urgencia === esperado, urgencia === esperado ? urgencia : `veio ${urgencia}`)
  }

  // Termo militar em uso civil não aprova a matéria.
  const { avaliarRelevancia } = await import('../src/lib/relevance.js')
  const relevancia = [
    ['Riachuelo finca os pés na Oscar Freire com loja em homenagem a São Paulo', false],
    ['Médico em carro blindado cai em golpe do retrovisor e acaba baleado no Rio', false],
    ['Marinha lança ao mar o submarino Riachuelo após manutenção', true],
    ['Exército recebe novos blindados Guarani em Santa Maria', true],
  ]
  for (const [titulo, esperado] of relevancia) {
    const r = avaliarRelevancia(titulo)
    conferir(`${esperado ? 'aprova' : 'recusa'}: ${titulo.slice(0, 26)}…`, r.relevante === esperado, r.termos.join(', ') || 'sem termo')
  }
}

// MUNDO & CONFLITOS — as cinco rotas novas.
//
// A forma, e três invariantes que a interface assume e nenhum código de status
// denunciaria: o total de matérias nunca é menor que o de um teatro, a
// distribuição por urgência soma o total, e a página nunca passa de 20 itens.
// E a separação que justifica a área existir à parte: notícia que só a lente
// mundial aprovou NÃO pode vazar para /news nem para o clipping.
console.log('\nMUNDO & CONFLITOS')
{
  const somaUrgencia = (u) => Object.values(u || {}).reduce((a, n) => a + n, 0)
  const noticiaValida = (n) => n && typeof n.titulo === 'string' && ['brasil', 'mundo'].includes(n.escopo)
    && ['pt', 'en'].includes(n.idioma) && Array.isArray(n.teatros) && Array.isArray(n.paises)
    && ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].includes(n.urgencia)
    && (n.url === null || /^https?:\/\//.test(n.url))
  const paginaValida = (p) => p && Array.isArray(p.itens) && p.itens.length <= 20 && p.porPagina === 20
    && p.pagina >= 1 && p.pagina <= p.paginas && p.itens.every(noticiaValida)

  for (const rota of ['/api/mundo/panorama', '/api/mundo/pais/Russia', '/api/mundo/teatro/russia-ucrania',
    '/api/mundo/feed', '/api/mundo/metodo', '/api/news/countries?escopo=mundo']) {
    await checar(`${rota.replace('/api', '').slice(0, 24)} sem sessão`, rota, () => 'recusa correta', { status: 401, semSessao: true })
  }

  await checar('GET /mundo/panorama', '/api/mundo/panorama?days=30', (b) => {
    if (!b?.totais || !Array.isArray(b.teatros) || !Array.isArray(b.paises) || !Array.isArray(b.destaques)) return false
    if (b.teatros.length !== 16) return false
    const maior = Math.max(0, ...b.teatros.map((t) => t.total))
    if (b.totais.materias < maior) return false
    if (!b.teatros.every((t) => somaUrgencia(t.porUrgencia) === t.total && t.manchetes.length <= 3
      && t.manchetes.every(noticiaValida) && (t.total > 0 || t.ultimaMencao === null))) return false
    if (b.paises.some((p) => p.nome === 'Brazil') || b.paises.length > 25) return false
    if (b.destaques[0]?.nome !== 'United States of America') return false
    return `${b.totais.materias} matérias, ${b.totais.teatrosComCobertura} de ${b.teatros.length} teatros com cobertura`
  })
  await checar('GET /mundo/pais/:nome', '/api/mundo/pais/United%20States%20of%20America?days=90', (b) =>
    b?.iso === 'US' && somaUrgencia(b.cobertura?.porUrgencia) === b.cobertura.total
      && Array.isArray(b.cobertura.porDia) && b.cobertura.porFonte.length <= 8
      && b.coMencionados.length <= 10 && !b.coMencionados.some((p) => p.nome === b.pais)
      && paginaValida(b.noticias) && typeof b.ransomware?.disponivel === 'boolean'
      && `${b.cobertura.total} matérias, ${b.noticias.paginas} página(s)`)
  await checar('GET /mundo/pais (fora do catálogo)', '/api/mundo/pais/Atlantida', (b) => b?.error && 'recusa correta', { status: 404 })
  await checar('GET /mundo/pais (teatro inválido)', '/api/mundo/pais/Russia?teatro=nao-existe', (b) => b?.campo === 'teatro' && 'recusa correta', { status: 400 })
  await checar('GET /mundo/pais (idioma inválido)', '/api/mundo/pais/Russia?idioma=xx', (b) => b?.campo === 'idioma' && 'recusa correta', { status: 400 })
  await checar('GET /mundo/pais (page=-5)', '/api/mundo/pais/Russia?page=-5', (b) => b?.noticias?.pagina === 1 && 'presa em 1')

  await checar('GET /mundo/teatro/:id', '/api/mundo/teatro/russia-ucrania?days=90', (b) =>
    b?.teatro?.id === 'russia-ucrania' && Array.isArray(b.teatro.regras) && Array.isArray(b.teatro.regras[0])
      && somaUrgencia(b.cobertura?.porUrgencia) === b.cobertura.total && b.paises.length <= 15
      && paginaValida(b.noticias) && b.noticias.itens.every((n) => n.teatros.includes('russia-ucrania'))
      && b.teatro.paisesDescritos?.length === b.teatro.paises.length && b.teatro.paisesDescritos.every((p) => p.pt && p.iso)
      && `${b.cobertura.total} matérias, ${b.paises.length} países citados`)
  await checar('GET /mundo/teatro (desconhecido)', '/api/mundo/teatro/nao-existe', (b) => b?.error && 'recusa correta', { status: 404 })
  await checar('GET /mundo/teatro (país inválido)', '/api/mundo/teatro/israel-gaza?pais=Atlantida', (b) => b?.campo === 'pais' && 'recusa correta', { status: 400 })

  const feedMundo = await checar('GET /mundo/feed', '/api/mundo/feed?days=90', (b) =>
    paginaValida(b) && b.periodoDias === 90 && `${b.total} notícias em ${b.paginas} página(s)`)
  await checar('GET /mundo/feed (urgência inválida)', '/api/mundo/feed?urgencia=URGENTE', (b) => b?.campo === 'urgencia' && 'recusa correta', { status: 400 })
  await checar('GET /mundo/feed (page=999999)', '/api/mundo/feed?page=999999', (b) => paginaValida(b) && b.pagina === b.paginas && `presa em ${b.pagina}`)
  await checar('GET /mundo/feed (q com %)', '/api/mundo/feed?q=100%25', (b) => paginaValida(b) && `${b.total} resultado(s), curinga escapado`)
  await checar('GET /mundo/feed (filtro en)', '/api/mundo/feed?idioma=en&days=90', (b) =>
    paginaValida(b) && b.itens.every((n) => n.idioma === 'en') && `${b.total} em inglês`)
  await checar('GET /mundo/metodo', '/api/mundo/metodo', (b) =>
    Number.isInteger(b?.versao) && typeof b.regra === 'string' && b.teatros?.length === 16 && Array.isArray(b.fontes)
      && `versão ${b.versao}, ${b.fontes.length} fonte(s) internacionais`)
  await checar('GET /news/countries?escopo=mundo', '/api/news/countries?escopo=mundo&days=90', (b) =>
    Array.isArray(b?.items) && Array.isArray(b.catalogo) && Number.isInteger(b.maximo)
      && `${b.items.length} países, ${b.totalAnalisado} matérias`)
  await checar('GET /news/countries (escopo inválido)', '/api/news/countries?escopo=marte', (b) => b?.campo === 'escopo' && 'recusa correta', { status: 400 })

  // A SEPARAÇÃO. Junta as notícias só-mundo de três páginas do feed e confere
  // que nenhuma está no feed de defesa nem no clipping, com a janela máxima.
  const soMundo = new Set()
  if (feedMundo) {
    for (let p = 1; p <= 3; p += 1) {
      const r = await fetch(`${BASE}/api/mundo/feed?days=3650&page=${p}`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} })
      const b = await r.json().catch(() => null)
      for (const n of b?.itens || []) if (n.escopo === 'mundo') soMundo.add(n.id)
    }
  }
  await checar('/news sem matéria só-mundo', '/api/news?days=3650&limit=200', (b) =>
    Array.isArray(b?.items) && !b.items.some((i) => soMundo.has(i.id)) && `${soMundo.size} só-mundo conferidas`)
  // O DENOMINADOR DO FILTRO DO BRASIL. A taxa "X de Y aprovados" não pode
  // contar o que só a lente mundial gravou, e as duas respostas que expõem o
  // total precisam usar a mesma régua. Se só `/news/stats` voltar a contar as
  // só-mundo, `coletados` da janela máxima passa de `totalCollected` (1.211
  // contra 888 na cópia do acervo medida). É uma guarda parcial: se as duas
  // regredirem juntas, esta checagem não percebe.
  const noticias = await checar('/news totalCollected', '/api/news?limit=1', (b) =>
    Number.isInteger(b?.totalCollected) && `${b.totalCollected} coletados sem só-mundo`)
  await checar('/news/stats filtro sem só-mundo', '/api/news/stats?days=3650', (b) =>
    Number.isInteger(b?.filtro?.coletados) && b.filtro.aprovados <= b.filtro.coletados
      && (!noticias || b.filtro.coletados <= noticias.totalCollected)
      && `${b.filtro.aprovados} de ${b.filtro.coletados}`)
  await checar('/news/clipping sem matéria só-mundo', '/api/news/clipping?days=3650&limit=60', (b) =>
    Array.isArray(b?.news) && !b.news.some((i) => soMundo.has(i.id)) && `${soMundo.size} só-mundo conferidas`)
}

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
    const marca = { operacional: '\x1b[32m●\x1b[0m', degradado: '\x1b[33m●\x1b[0m', nao_implementado: '\x1b[2m○\x1b[0m', opcional: '\x1b[2m◌\x1b[0m' }[c.estado]
    console.log(`  ${marca} ${c.nome.padEnd(38)} \x1b[2m${c.detalhe}\x1b[0m`)
  }
}

console.log()
process.exit(falhou ? 1 : 0)
