import { roteador } from '../lib/roteador.js'
import { all, get, run } from '../db/index.js'
import config from '../config.js'
import { panorama, capacidades, historicoDeExecucoes } from '../services/status.js'
import { coletarAgora, coletarFonte, estadoDoAgendador } from '../collectors/index.js'
import { METODO_RELEVANCIA, avaliarRelevancia } from '../lib/relevance.js'
import { classificarParaOBrasil } from '../lib/ancora.js'
import { exigirPapel } from '../lib/auth.js'
import { limite, idNumerico } from '../lib/parametros.js'
import { limitar } from '../lib/limite.js'
import { registrarAuditoria, trilhaDeAuditoria } from '../lib/auditoria.js'
import { alertasDeSeguranca } from './auth.js'
import { resumoCurto } from '../lib/saneamento.js'

const router = roteador()

// GET /api/system/status — o painel de diagnóstico
router.get('/system/status', exigirPapel('admin'), async (req, res, next) => {
  try {
    res.json({ ...(await panorama()), alertas: await alertasDeSeguranca() })
  } catch (err) { next(err) }
})

router.get('/system/capabilities', exigirPapel('admin'), async (req, res) => res.json({ items: await capacidades() }))

// GET /api/system/runs — histórico das coletas
router.get('/system/runs', exigirPapel('admin'), async (req, res) => {
  const quantos = limite(req.query.limit, 40, 200)
  const itens = await historicoDeExecucoes(quantos)

  res.json({
    items: itens,
    total: itens.length,
    // Resumo por coletor: transforma a lista bruta em algo que responde
    // "quanto isto é confiável?" sem exigir que alguém leia 40 linhas.
    porColetor: await all(
      `SELECT collector,
              COUNT(*) AS execucoes,
              SUM(ok)::int AS sucessos,
              ROUND(AVG(duration_ms))::int AS "duracaoMediaMs",
              SUM(items_new)::int AS "itensNovos",
              MAX(finished_at) AS ultima
       FROM collector_runs GROUP BY collector ORDER BY collector`
    ),
  })
})

// GET /api/system/audit — atos de governança e execuções de coleta, juntos
router.get('/system/audit', exigirPapel('admin'), async (req, res) => {
  const itens = await trilhaDeAuditoria(limite(req.query.limit, 60, 300))
  res.json({ items: itens, total: itens.length })
})

// POST /api/system/collect — dispara a coleta manualmente
router.post('/system/collect', exigirPapel('admin'), async (req, res, next) => {
  try {
    const r = await coletarAgora('manual')
    if (r.jaEmAndamento) return res.status(409).json({ ...r, error: r.mensagem })
    await registrarAuditoria(req, { acao: `Coleta completa disparada à mão (${Math.round(r.duracaoMs / 1000)} s)`, alvo: 'Todos os coletores' })
    res.json(r)
  } catch (err) { next(err) }
})

// POST /api/system/collect/:sourceId — coleta UMA fonte
//
// Existe para diagnóstico: quando o painel mostra uma fonte com erro, é
// preciso poder tentar só ela e ler a mensagem, sem disparar as sete.
router.post('/system/collect/:sourceId', exigirPapel('admin'), async (req, res, next) => {
  try {
    const id = idNumerico(req.params.sourceId)
    const fonte = id && await get('SELECT * FROM sources WHERE id = ?', [id])
    if (!fonte) return res.status(404).json({ error: 'Fonte não encontrada.' })
    const r = await coletarFonte(fonte)
    await registrarAuditoria(req, {
      acao: r?.ok === false ? `Teste de fonte falhou — ${r.erro || 'sem detalhe'}` : 'Fonte testada manualmente',
      alvo: `Fonte · ${fonte.name}`,
      nivel: r?.ok === false ? 'error' : 'info',
    })
    res.json(r)
  } catch (err) { next(err) }
})

// GET /api/system/method — como o filtro decide
router.get('/system/method', exigirPapel('admin'), async (req, res) => {
  res.json({
    ...METODO_RELEVANCIA,
    // Amostra do que o filtro RECUSOU. É a metade que costuma ficar
    // invisível — e é ela que prova que o filtro filtra alguma coisa.
    //
    // Sem o que a lente mundial aprovou: depois dela, as oito matérias mais
    // novas com `relevant = 0` eram quase todas cobertura internacional
    // gravada de propósito por outra régua — a amostra deixava de mostrar o
    // que o filtro do Brasil joga fora e passava a mostrar a área Mundo.
    amostraRecusada: (await all(
      `SELECT title, category FROM articles WHERE relevant = 0 AND mundo = 0
       ORDER BY id DESC LIMIT 8`
    )).map((a) => a.title),
    amostraAprovada: await all(
      `SELECT title, category, urgency FROM articles WHERE relevant = 1
       ORDER BY published_at DESC NULLS LAST LIMIT 8`
    ),
  })
})

// POST /api/system/method/test — testa a regra num texto qualquer
//
// Deixa o filtro demonstrável ao vivo: cola-se um título e vê-se a decisão com
// os termos que casaram. Sem isso, "a regra é auditável" é só uma afirmação.
router.post('/system/method/test', exigirPapel('admin'), (req, res) => {
  const texto = String(req.body?.text || '').trim()
  if (!texto) return res.status(400).json({ error: 'Envie um texto em "text".' })

  const r = avaliarRelevancia(texto)
  res.json({
    texto: texto.slice(0, 400),
    relevante: r.relevante,
    pontos: r.pontos,
    termosFortes: r.fortes,
    termosFracos: r.fracos,
    exclusoes: r.excluidos,
    forteNaAbertura: r.naAbertura,
    // Texto recusado não entra no acervo e não recebe categoria: classificá-lo
    // mesmo assim exibia "Forças Armadas, urgência CRÍTICO" para uma previsão
    // de tempestade que o próprio filtro tinha acabado de recusar.
    classificacao: r.relevante ? classificarParaOBrasil(texto) : null,
    porque: r.relevante
      ? (r.naAbertura
        ? 'Termo inequívoco na abertura do texto.'
        : 'Dois ou mais termos inequívocos ao longo do texto.')
      : r.excluidos.length && !r.fortes.length
        ? `Desqualificado por contexto: ${r.excluidos.join(', ')}.`
        : r.fortes.length === 1
          ? 'O único termo inequívoco aparece enterrado no corpo — menção de passagem.'
          : 'Nenhum termo inequívoco do domínio.',
  })
})

// GET /api/health — sonda de saúde
//
// `deploy` responde a pergunta que `ok: true` não responde: não se o processo
// está de pé, mas se é o processo CERTO. Ver a nota em `config.js`.
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    ambiente: config.ambiente,
    versao: config.versao,
    deploy: config.deploy,
  })
})

// GET /api/meta — identidade e fontes
router.get('/meta', async (req, res) => {
  res.json({
    nome: 'DefesaBR Intelligence API',
    versao: config.versao,
    node: process.version,
    ambiente: config.ambiente,
    deploy: config.deploy,
    agendador: await estadoDoAgendador(),
    // O banco sobrevive à próxima publicação? Era a pergunta que explicava
    // contas que "somiam sozinhas" num disco efêmero. Com o Postgres
    // gerenciado a resposta é sempre sim; o campo fica para quem já o lê.
    armazenamento: {
      persistente: true,
      banco: 'postgres',
    },
    // ─────────────────────────────────────────────────────────────────────
    // A CONTA DE ADMINISTRADOR CHEGOU AO SERVIÇO?
    //
    // Sem `ADMIN_USERNAME`/`ADMIN_PASSWORD` a instalação sobe sem
    // administrador, e a única pista ficava no log do boot — que num deploy
    // some na primeira rolagem. Quem publicou tentava entrar, recebia
    // "usuário ou senha incorretos" (a resposta certa: a conta não existe) e
    // não tinha como distinguir senha errada de variável que não chegou.
    //
    // Só BOOLEANOS e uma contagem: nenhum valor de variável, nenhum nome de
    // conta. Diz se a variável chegou, não o que ela contém.
    // ─────────────────────────────────────────────────────────────────────
    contas: {
      variaveis: {
        ADMIN_USERNAME: Boolean(config.auth.administrador.usuario),
        ADMIN_PASSWORD: Boolean(config.auth.administrador.senha),
        AUTH_SECRET: config.auth.segredoFixado,
      },
      administradoresAtivos: (await get(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND COALESCE(status, 'ativo') = 'ativo'",
      ))?.n ?? 0,
      total: (await get('SELECT COUNT(*) AS n FROM users'))?.n ?? 0,
    },
    // Era uma lista escrita à mão com cinco fontes — duas de RSS, quando o
    // catálogo tem dezenas — e sem o Comex Stat nem o ransomware.live.
    fontes: [
      {
        nome: `Feeds RSS (${(await get('SELECT COUNT(*) AS n FROM sources WHERE enabled = 1'))?.n ?? 0} ativos)`,
        tipo: 'RSS',
        url: null,
      },
      { nome: 'Dados Abertos da Câmara', tipo: 'API', url: 'https://dadosabertos.camara.leg.br' },
      { nome: 'Banco Central do Brasil — SGS', tipo: 'API', url: 'https://dadosabertos.bcb.gov.br' },
      { nome: 'Comex Stat (MDIC)', tipo: 'API', url: 'https://comexstat.mdic.gov.br' },
      { nome: 'World Bank Open Data', tipo: 'API', url: 'https://data.worldbank.org' },
      { nome: 'ransomware.live', tipo: 'API', url: 'https://www.ransomware.live' },
    ],
    // O que a plataforma AINDA NÃO faz — contado, não escrito à mão.
    //
    // A lista era fixa e dizia que 'Contas e permissões' e 'Dossiês de
    // analista' faltavam. As contas passaram a existir — senha em scrypt,
    // token assinado, papel verificado por rota, checagens em
    // `npm run check:auth` — e a rota pública continuou anunciando que elas
    // não existiam. Uma lista escrita à mão sobre o que falta envelhece
    // exatamente quando a coisa deixa de faltar, que é o pior momento
    // possível: a API desmentia a própria plataforma para qualquer um que
    // lesse `/api/meta`.
    //
    // Agora sai de `capacidades()`, a mesma fonte que alimenta o painel de
    // saúde do administrador. Implementar algo é o que remove o item daqui.
    naoImplementado: (await capacidades())
      .filter((c) => c.estado === 'nao_implementado')
      .map((c) => c.nome),
  })
})

// ═══════════════════════════ FAVORITOS ═══════════════════════════
//
// QUEM É O DONO DE UM FAVORITO
//
// Estas rotas nasceram antes das contas, e o "dono" era o navegador: a
// interface geraria um identificador local e o enviaria em `X-Client-Id`. Duas
// coisas aconteceram depois, e as duas pedem esta mudança.
//
// A PRIMEIRA é que as contas passaram a existir. Um favorito preso ao
// navegador some quando a pessoa troca de máquina, e a "Minha Pasta" de quem
// entrou com a mesma conta em dois lugares seria duas pastas diferentes.
// Havendo sessão, o dono do favorito é a CONTA — que é o que o usuário
// entende por "meus salvos".
//
// A SEGUNDA é que o identificador de cliente é escolhido por quem chama. Não
// é segredo, não é verificado e não custa nada adivinhar: `curl -H
// 'X-Client-Id: <id de outro>' .../api/bookmarks` devolveria a pasta alheia, e
// o DELETE apagaria. Enquanto ninguém enviava o cabeçalho isso era um furo
// dormindo; ligá-lo à sessão é o que o fecha antes de acordar.
//
// O prefixo mantém os dois espaços separados na MESMA coluna — sem migração,
// sem tabela nova. `conta:7` nunca colide com `anon:7`, e um visitante não
// alcança a pasta de ninguém escrevendo um número no cabeçalho.
const donoDe = (req) => {
  if (req.conta?.sub) return `conta:${req.conta.sub}`
  const cliente = String(req.get('X-Client-Id') || req.query.clientId || '').trim().slice(0, 80)
  return cliente ? `anon:${cliente}` : ''
}

router.get('/bookmarks', async (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.json({ items: [], total: 0 })

  const itens = (await all(
    `SELECT a.*, s.name AS source_name, b.created_at AS saved_at, b.note
     FROM bookmarks b
     JOIN articles a ON a.id = b.article_id
     LEFT JOIN sources s ON s.id = a.source_id
     WHERE b.client_id = ? ORDER BY b.created_at DESC`,
    [cliente]
  )).map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    summary: resumoCurto(a.summary),
    source: a.source_name,
    category: a.category,
    urgency: a.urgency,
    date: a.published_at,
    savedAt: a.saved_at,
    note: a.note,
  }))

  res.json({ items: itens, total: itens.length })
})

// Teto por visitante: cada POST anônimo com um `X-Client-Id` novo criava uma
// linha, e nada impedia um laço de encher a tabela. 60 por minuto sobra para
// quem marca à mão.
router.post('/bookmarks/:articleId', limitar({ max: 60, janelaMs: 60_000, porConta: true }), async (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.status(400).json({ error: 'Entre na plataforma ou envie o cabeçalho X-Client-Id.' })
  const artigoId = idNumerico(req.params.articleId)
  const artigo = artigoId && await get('SELECT id, relevant, mundo FROM articles WHERE id = ?', [artigoId])
  // Só-mundial exige conta, como em /api/mundo/*. E há um segundo motivo: a
  // retenção de 180 dias poupa o que está em `bookmarks`, então sem esta trava
  // qualquer visitante anônimo anulava a retenção marcando as matérias velhas
  // na "pasta" — conferido com 1.539 POST sem sessão.
  if (!artigo || (!req.conta && !artigo.relevant && artigo.mundo)) {
    return res.status(404).json({ error: 'Notícia não encontrada.' })
  }
  await run(
    'INSERT INTO bookmarks (client_id, article_id, note) VALUES (?, ?, ?) ON CONFLICT (client_id, article_id) DO NOTHING',
    // A nota era gravada como viesse: um objeto no JSON derrubava a ligação do
    // parâmetro com 500, e um texto de 200 KB entrava inteiro.
    [cliente, artigoId, typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null]
  )
  res.status(201).json({ ok: true })
})

router.delete('/bookmarks/:articleId', async (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.status(400).json({ error: 'Entre na plataforma ou envie o cabeçalho X-Client-Id.' })
  const artigoId = idNumerico(req.params.articleId)
  if (artigoId) await run('DELETE FROM bookmarks WHERE client_id = ? AND article_id = ?', [cliente, artigoId])
  res.json({ ok: true })
})

export default router
