import { Router } from 'express'
import { all, get } from '../db/index.js'
import { exigirPapel } from '../lib/auth.js'
import { dias, limite } from '../lib/parametros.js'
import { METODO_CORRELACAO } from '../lib/correlacao.js'
import { CATALOGO_RESUMO, SETORES, ORGAOS, EMPRESAS, INFRAESTRUTURAS, entidade } from '../lib/entidades.js'
import { panoramaCorrelacao } from '../collectors/correlacoes.js'

const router = Router()

// -----------------------------------------------------------------------------
// INTELIGÊNCIA CORRELACIONADA — o Brasil no centro
//
// Estas rotas respondem a uma pergunta que nenhuma das outras respondia: o que
// esta notícia tem a ver com o resto do que a plataforma sabe sobre o país.
//
// Todas exigem sessão (`exigirPapel('user')`). Não é reserva de conteúdo: a
// correlação cruza a lista nominal de organizações brasileiras atacadas, e essa
// lista já é restrita a quem entra — deixar a versão correlacionada aberta
// contornaria a própria restrição pela porta dos fundos.
//
// O MÉTODO É PUBLICADO junto do resultado, em `/intel/metodo`. Uma correlação
// cujo critério não se pode inspecionar é indistinguível de uma inventada, e
// este projeto já removeu coisa demais por esse motivo.
// -----------------------------------------------------------------------------

/** Uma correlação, na forma que a interface consome. */
const mapear = (c) => ({
  id: c.id,
  artigo: {
    id: c.article_id,
    titulo: c.title,
    resumo: c.summary,
    url: c.url,
    categoria: c.category,
    urgencia: c.urgency,
    publicadoEm: c.published_at,
    fonte: c.fonte,
    brScore: c.br_score,
    brMotivo: c.br_motivo,
  },
  regra: c.regra,
  alvo: { tipo: c.alvo_tipo, id: c.alvo_id, rotulo: c.alvo_rotulo },
  // Os quatro campos que fazem esta rota valer: por que existe a ligação, qual
  // a prova literal, o que isso significa no Brasil e o que pode decorrer.
  motivo: c.motivo,
  evidencia: c.evidencia,
  contextoBrasil: c.contexto_br,
  impacto: c.impacto,
  forca: c.forca,
})

const SELECT_CORR = `
  SELECT c.*, a.title, a.summary, a.url, a.category, a.urgency, a.published_at,
         a.br_score, a.br_motivo, s.name AS fonte
    FROM correlations c
    JOIN articles a ON a.id = c.article_id
    LEFT JOIN sources s ON s.id = a.source_id`

// GET /api/intel/correlacoes — as ligações encontradas, mais fortes primeiro
router.get('/intel/correlacoes', exigirPapel('user'), (req, res) => {
  const janela = dias(req.query.days, 60)
  const forcaMinima = Math.min(Math.max(parseInt(req.query.minForca, 10) || 1, 1), 5)
  const regra = String(req.query.regra || '').trim()
  const alvoTipo = String(req.query.alvoTipo || '').trim()

  const params = [forcaMinima]
  let onde = `WHERE c.forca >= ?
      AND (a.published_at IS NULL
           OR a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${janela} days'))`
  if (regra) { onde += ' AND c.regra = ?'; params.push(regra) }
  if (alvoTipo) { onde += ' AND c.alvo_tipo = ?'; params.push(alvoTipo) }

  const itens = all(
    `${SELECT_CORR} ${onde}
      ORDER BY c.forca DESC, a.published_at DESC NULLS LAST, c.id DESC
      LIMIT ?`,
    [...params, limite(req.query.limit, 60, 200)]
  ).map(mapear)

  res.json({
    periodoDias: janela,
    items: itens,
    total: itens.length,
    resumo: panoramaCorrelacao(),
    metodo: METODO_CORRELACAO,
  })
})

// GET /api/intel/brasil — o panorama do país, montado das correlações
//
// Responde "o que está acontecendo COM O BRASIL", cruzando o que a coleta
// trouxe com o que já estava registrado. Nada aqui é estimado: toda contagem
// sai de uma consulta, e a nota diz o que cada uma mede.
router.get('/intel/brasil', exigirPapel('user'), (req, res) => {
  const janela = dias(req.query.days, 60)
  const corte = `strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${janela} days')`

  res.json({
    periodoDias: janela,

    // As entidades brasileiras mais citadas no período, por tipo. É o mapa do
    // que a imprensa está cobrindo, no vocabulário do catálogo.
    entidades: all(
      `SELECT e.tipo, e.entidade_id, e.nome, COUNT(DISTINCT e.article_id) AS mencoes
         FROM article_entities e
         JOIN articles a ON a.id = e.article_id
        WHERE a.published_at >= ${corte}
        GROUP BY e.tipo, e.entidade_id
        ORDER BY mencoes DESC LIMIT 40`
    ),

    // Setores com cobertura noticiosa E incidente registrado. A interseção é o
    // que interessa: um setor que aparece nos dois lados está sob pressão em
    // duas dimensões diferentes.
    setoresSobPressao: all(
      `SELECT c.alvo_id AS setor, c.alvo_rotulo AS nome,
              COUNT(DISTINCT c.article_id) AS materias, MAX(c.contexto_br) AS contexto
         FROM correlations c
         JOIN articles a ON a.id = c.article_id
        WHERE c.regra = 'setor-sob-pressao' AND a.published_at >= ${corte}
        GROUP BY c.alvo_id ORDER BY materias DESC`
    ),

    // Unidades da federação citadas que TAMBÉM têm órgão com vazamento.
    estados: all(
      `SELECT c.alvo_id AS uf, c.alvo_rotulo AS nome,
              COUNT(DISTINCT c.article_id) AS materias, MAX(c.evidencia) AS evidencia
         FROM correlations c
         JOIN articles a ON a.id = c.article_id
        WHERE c.regra = 'uf-orgaos-atacados' AND a.published_at >= ${corte}
        GROUP BY c.alvo_id ORDER BY materias DESC`
    ),

    // As ligações mais fortes do período — as que apontam para um incidente
    // concreto contra a organização citada.
    ligacoesFortes: all(
      `${SELECT_CORR}
        WHERE c.forca >= 4 AND a.published_at >= ${corte}
        ORDER BY c.forca DESC, a.published_at DESC LIMIT 12`
    ).map(mapear),

    // As matérias com maior vínculo com o país, pelo índice de relevância.
    maisBrasileiras: all(
      `SELECT a.id, a.title, a.url, a.category, a.urgency, a.published_at,
              a.br_score, a.br_motivo, s.name AS fonte
         FROM articles a LEFT JOIN sources s ON s.id = a.source_id
        WHERE a.relevant = 1 AND a.br_score IS NOT NULL AND a.br_score > 0
          AND a.published_at >= ${corte}
        ORDER BY a.br_score DESC, a.published_at DESC LIMIT 12`
    ),

    cobertura: panoramaCorrelacao(),
    catalogo: CATALOGO_RESUMO,
    nota: 'Contagens de MENÇÃO e de LIGAÇÃO, não de risco. Uma entidade aparece mais porque foi '
      + 'citada mais vezes no período; um setor aparece sob pressão porque há cobertura noticiosa '
      + 'e incidente registrado ao mesmo tempo, o que não significa que sejam o mesmo fato.',
  })
})

// GET /api/intel/entidade/:tipo/:id — dossiê de uma entidade brasileira
//
// Reúne, para uma organização, setor, instalação ou UF, tudo o que a plataforma
// tem: as matérias que a citam, as correlações que ela produziu e — quando é
// organização com domínio conhecido — os vazamentos registrados contra ela.
router.get('/intel/entidade/:tipo/:id', exigirPapel('user'), (req, res) => {
  const tipo = String(req.params.tipo).slice(0, 20)
  const id = String(req.params.id).slice(0, 60)
  const janela = dias(req.query.days, 180)

  const cat = entidade(tipo, id)
  if (!cat) return res.status(404).json({ error: 'Entidade não consta no catálogo.' })

  const materias = all(
    `SELECT a.id, a.title, a.summary, a.url, a.category, a.urgency, a.published_at,
            a.br_score, e.termo, s.name AS fonte
       FROM article_entities e
       JOIN articles a ON a.id = e.article_id
       LEFT JOIN sources s ON s.id = a.source_id
      WHERE e.tipo = ? AND e.entidade_id = ?
        AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${janela} days')
      ORDER BY a.published_at DESC LIMIT 30`,
    [tipo, id]
  )

  const correlacoes = all(
    `${SELECT_CORR}
      WHERE c.alvo_tipo = ? AND c.alvo_id = ?
      ORDER BY c.forca DESC, a.published_at DESC LIMIT 20`,
    [tipo === 'uf' ? 'uf' : tipo, id]
  ).map(mapear)

  // Vazamentos contra a organização, quando ela tem domínio próprio no
  // catálogo. Sem domínio não há como cruzar sem inferir — e a resposta
  // distingue "nenhum vazamento" de "não dá para saber".
  const dominio = cat.dominio && !cat.dominio.includes('/') ? cat.dominio : null
  const vazamentos = dominio
    ? all(
      `SELECT victim, "group", sector, discovered_at, criticality, nature
         FROM ransomware_victims WHERE country = 'BR' AND (website = ? OR website = ?)
        ORDER BY discovered_at DESC LIMIT 10`,
      [dominio, `www.${dominio}`]
    )
    : []

  res.json({
    entidade: {
      tipo, id, nome: cat.nome || cat.nome_,
      setor: cat.setor || null,
      dominio,
      esfera: cat.esfera || null,
      controle: cat.controle || null,
      critico: !!cat.critico,
    },
    periodoDias: janela,
    materias,
    correlacoes,
    vazamentos: {
      itens: vazamentos,
      total: vazamentos.length,
      // Sem domínio no catálogo não dá para cruzar. A interface precisa
      // distinguir ausência de fato de ausência de meio.
      disponivel: !!dominio,
    },
    nota: 'As matérias listadas são as que CITAM esta entidade — o campo `termo` mostra o trecho '
      + 'que produziu o reconhecimento. Citação não implica envolvimento.',
  })
})

// GET /api/intel/metodo — como a correlação decide
//
// O equivalente, para a correlação, do que `/system/method` é para o filtro de
// relevância: a régua publicada, para que a decisão possa ser contestada.
router.get('/intel/metodo', (req, res) => {
  res.json({
    ...METODO_CORRELACAO,
    catalogo: {
      ...CATALOGO_RESUMO,
      setores: SETORES.map((s) => ({ id: s.id, nome: s.nome, critico: s.critico, termos: s.termos.length })),
      orgaos: ORGAOS.map((o) => ({ id: o.id, nome: o.nome, esfera: o.esfera, setor: o.setor })),
      empresas: EMPRESAS.map((e) => ({ id: e.id, nome: e.nome, controle: e.controle, setor: e.setor })),
      infraestruturas: INFRAESTRUTURAS.map((i) => ({ id: i.id, nome: i.nome, setor: i.setor, uf: i.uf })),
    },
    cobertura: panoramaCorrelacao(),
  })
})

export default router
