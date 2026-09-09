import { Router } from 'express'
import { all, get, run } from '../db/index.js'
import config from '../config.js'
import { panorama, capacidades, historicoDeExecucoes } from '../services/status.js'
import { coletarAgora, coletarFonte, estadoDoAgendador } from '../collectors/index.js'
import { METODO_RELEVANCIA, avaliarRelevancia, classificar } from '../lib/relevance.js'
import { exigirPapel } from '../lib/auth.js'
import { limite } from '../lib/parametros.js'

const router = Router()

// GET /api/system/status — o painel de diagnóstico
router.get('/system/status', exigirPapel('admin'), (req, res) => res.json(panorama()))

router.get('/system/capabilities', exigirPapel('admin'), (req, res) => res.json({ items: capacidades() }))

// GET /api/system/runs — histórico das coletas
router.get('/system/runs', exigirPapel('analyst'), (req, res) => {
  const quantos = limite(req.query.limit, 40, 200)
  const itens = historicoDeExecucoes(quantos)

  res.json({
    items: itens,
    total: itens.length,
    // Resumo por coletor: transforma a lista bruta em algo que responde
    // "quanto isto é confiável?" sem exigir que alguém leia 40 linhas.
    porColetor: all(
      `SELECT collector,
              COUNT(*) AS execucoes,
              SUM(ok) AS sucessos,
              ROUND(AVG(duration_ms)) AS duracaoMediaMs,
              SUM(items_new) AS itensNovos,
              MAX(finished_at) AS ultima
       FROM collector_runs GROUP BY collector ORDER BY collector`
    ),
  })
})

// POST /api/system/collect — dispara a coleta manualmente
router.post('/system/collect', exigirPapel('admin'), async (req, res, next) => {
  try {
    const r = await coletarAgora('manual')
    if (r.jaEmAndamento) return res.status(409).json(r)
    res.json(r)
  } catch (err) { next(err) }
})

// POST /api/system/collect/:sourceId — coleta UMA fonte
//
// Existe para diagnóstico: quando o painel mostra uma fonte com erro, é
// preciso poder tentar só ela e ler a mensagem, sem disparar as sete.
router.post('/system/collect/:sourceId', exigirPapel('admin'), async (req, res, next) => {
  try {
    const fonte = get('SELECT * FROM sources WHERE id = ?', [req.params.sourceId])
    if (!fonte) return res.status(404).json({ error: 'Fonte não encontrada.' })
    res.json(await coletarFonte(fonte))
  } catch (err) { next(err) }
})

// GET /api/system/method — como o filtro decide
router.get('/system/method', exigirPapel('analyst'), (req, res) => {
  res.json({
    ...METODO_RELEVANCIA,
    // Amostra do que o filtro RECUSOU. É a metade que costuma ficar
    // invisível — e é ela que prova que o filtro filtra alguma coisa.
    amostraRecusada: all(
      `SELECT title, category FROM articles WHERE relevant = 0
       ORDER BY id DESC LIMIT 8`
    ).map((a) => a.title),
    amostraAprovada: all(
      `SELECT title, category, urgency FROM articles WHERE relevant = 1
       ORDER BY published_at DESC LIMIT 8`
    ),
  })
})

// POST /api/system/method/test — testa a regra num texto qualquer
//
// Deixa o filtro demonstrável ao vivo: cola-se um título e vê-se a decisão com
// os termos que casaram. Sem isso, "a regra é auditável" é só uma afirmação.
router.post('/system/method/test', exigirPapel('analyst'), (req, res) => {
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
    classificacao: classificar(texto),
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

// GET /api/health — sonda de saúde (Railway)
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
router.get('/meta', (req, res) => {
  res.json({
    nome: 'DefesaBR Intelligence API',
    versao: config.versao,
    node: process.version,
    ambiente: config.ambiente,
    deploy: config.deploy,
    agendador: estadoDoAgendador(),
    fontes: [
      { nome: 'Ministério da Defesa', tipo: 'RSS', url: 'https://www.gov.br/defesa' },
      { nome: 'Agência Brasil / Agência Gov (EBC)', tipo: 'RSS', url: 'https://agenciabrasil.ebc.com.br' },
      { nome: 'Dados Abertos da Câmara', tipo: 'API', url: 'https://dadosabertos.camara.leg.br' },
      { nome: 'World Bank Open Data', tipo: 'API', url: 'https://data.worldbank.org' },
      { nome: 'Banco Central do Brasil — SGS', tipo: 'API', url: 'https://dadosabertos.bcb.gov.br' },
    ],
    // O que a plataforma AINDA NÃO faz — contado, não escrito à mão.
    //
    // A lista era fixa e dizia `['Análise por IA', 'Contas e permissões',
    // 'Dossiês de analista']`. As contas passaram a existir — senha em scrypt,
    // token assinado, papel verificado por rota, 48 checagens em
    // `npm run check:auth` — e a rota pública continuou anunciando que elas
    // não existiam. Uma lista escrita à mão sobre o que falta envelhece
    // exatamente quando a coisa deixa de faltar, que é o pior momento
    // possível: a API desmentia a própria plataforma para qualquer um que
    // lesse `/api/meta`.
    //
    // Agora sai de `capacidades()`, a mesma fonte que alimenta o painel de
    // saúde do administrador. Implementar algo é o que remove o item daqui.
    naoImplementado: capacidades()
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

router.get('/bookmarks', (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.json({ items: [], total: 0 })

  const itens = all(
    `SELECT a.*, s.name AS source_name, b.created_at AS saved_at, b.note
     FROM bookmarks b
     JOIN articles a ON a.id = b.article_id
     LEFT JOIN sources s ON s.id = a.source_id
     WHERE b.client_id = ? ORDER BY b.created_at DESC`,
    [cliente]
  ).map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    summary: a.summary,
    source: a.source_name,
    category: a.category,
    urgency: a.urgency,
    date: a.published_at,
    savedAt: a.saved_at,
    note: a.note,
  }))

  res.json({ items: itens, total: itens.length })
})

router.post('/bookmarks/:articleId', (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.status(400).json({ error: 'Entre na plataforma ou envie o cabeçalho X-Client-Id.' })
  if (!get('SELECT id FROM articles WHERE id = ?', [req.params.articleId])) {
    return res.status(404).json({ error: 'Notícia não encontrada.' })
  }
  run(
    'INSERT OR IGNORE INTO bookmarks (client_id, article_id, note) VALUES (?, ?, ?)',
    [cliente, req.params.articleId, req.body?.note || null]
  )
  res.status(201).json({ ok: true })
})

router.delete('/bookmarks/:articleId', (req, res) => {
  const cliente = donoDe(req)
  if (!cliente) return res.status(400).json({ error: 'Entre na plataforma ou envie o cabeçalho X-Client-Id.' })
  run('DELETE FROM bookmarks WHERE client_id = ? AND article_id = ?', [cliente, req.params.articleId])
  res.json({ ok: true })
})

export default router
