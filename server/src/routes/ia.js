import { Router } from 'express'
import { all, get, run } from '../db/index.js'
import { exigirPapel } from '../lib/auth.js'
import { limitar } from '../lib/limite.js'
import { dias } from '../lib/parametros.js'
import {
  configIa, salvarChave, removerChave, salvarModelo,
  salvarChaveDaConta, removerChaveDaConta, salvarModeloDaConta,
  MODELO_PADRAO,
} from '../lib/chaveIa.js'
import {
  sintetizarClipping, perguntarSobreAcervo, lerCorrelacao,
  analisarLote, relatorioSemanal, responderSobreAPlataforma,
} from '../services/ia.js'
import { TELAS, NIVEIS, CONCEITOS, NAO_FAZ, PRIMEIROS_PASSOS, guiaComoTexto } from '../lib/guia.js'
import { detectarEntidades } from '../lib/entidades.js'
import { sinteseGuardada, guardarSintese } from '../lib/sinteseCache.js'
import { nivelDeAlerta } from './news.js'

const router = Router()

// -----------------------------------------------------------------------------
// ASSISTENTE — a síntese e as perguntas sobre o acervo
//
// O recurso que o ROADMAP descrevia como "deliberadamente ausente", agora
// presente, e com as mesmas condições que o próprio arquivo fixou:
//
//   • a chave vive no servidor, nunca no navegador;
//   • sem chave o recurso não roda e NÃO aparece como falha;
//   • todo texto escrito por máquina é marcado como tal na resposta.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE A SÍNTESE É SOB DEMANDA E FICA GUARDADA
//
// A tentação era preencher `summaryExecutive` dentro de `/news/clipping`, que
// é onde a interface já o lê. Isso poria uma chamada de modelo — cara e de
// alguns segundos — em TODA abertura da tela, inclusive nas dezenas de vezes
// em que ninguém quer o resumo.
//
// A síntese é gerada quando alguém pede e guardada por (período, dia). A partir
// daí `/news/clipping` a devolve de graça, e o contrato do ROADMAP — "o dia em
// que `summaryExecutive` vier preenchido, a tela o exibe sem mudança nenhuma" —
// vale sem que a tela mude nem gaste.
// -----------------------------------------------------------------------------

/** Teto de matérias por análise. Acima disso o contexto fica raso e caro. */
const MAXIMO_POR_ANALISE = 15

const SELECT_MATERIAS = `
  SELECT a.title, a.summary, a.category, a.urgency, a.published_at AS date,
         s.name AS source
    FROM articles a LEFT JOIN sources s ON s.id = a.source_id
   WHERE a.relevant = 1
     AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)`

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ia/estado — o recurso está ligado?
//
// Aberto a qualquer sessão porque toda tela precisa saber se deve oferecer o
// botão. NÃO devolve a chave: só se existe, de onde veio e os quatro últimos
// caracteres, que é o suficiente para conferir qual está em uso.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ia/estado', exigirPapel('user'), (req, res) => {
  const e = configIa(req.conta?.sub)
  res.json({
    configurada: e.configurada,
    origem: e.origem,
    modelo: e.modelo,
    modeloPadrao: MODELO_PADRAO,
    finalDaChave: e.finalDaChave,
    // Está usando a chave de outra pessoa? Isso muda quem paga a conta, e
    // quem usa merece saber antes de gastar.
    daInstalacao: e.daInstalacao,
    instalacaoTemChave: e.instalacaoTemChave,
    // Configurar a chave DA INSTALAÇÃO é do administrador. Configurar a
    // própria é de qualquer conta — é a chave dela.
    podeConfigurarInstalacao: req.conta?.role === 'admin',
    fixadoPorAmbiente: !!process.env.ANTHROPIC_API_KEY,
    nota: e.configurada
      ? 'Textos gerados por modelo aparecem sempre marcados como escritos por máquina.'
      : 'Nenhum modelo conectado. Os campos de síntese ficam vazios em vez de preenchidos com texto plausível.',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A CHAVE DA PRÓPRIA CONTA
//
// Qualquer sessão pode configurar a sua — é a chave dela, e o consumo é
// cobrado na fatura dela. Não há papel a exigir além de estar autenticado:
// pedir permissão de administrador para alguém usar a própria chave seria
// governar o dinheiro dos outros.
//
// A gravação é cifrada (ver lib/segredoGuardado.js) e nada aqui devolve o
// valor: a resposta traz só os quatro últimos caracteres.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/ia/minha-chave', exigirPapel('user'), limitar({ max: 10, janelaMs: 60_000 }), (req, res) => {
  const r = salvarChaveDaConta(req.conta.sub, req.body?.chave)
  if (!r.ok) return res.status(400).json({ error: r.erro })
  const e = configIa(req.conta.sub)
  res.json({ ok: true, configurada: true, origem: e.origem, modelo: e.modelo, finalDaChave: e.finalDaChave })
})

router.delete('/ia/minha-chave', exigirPapel('user'), (req, res) => {
  removerChaveDaConta(req.conta.sub)
  const e = configIa(req.conta.sub)
  res.json({ ok: true, configurada: e.configurada, origem: e.origem, daInstalacao: e.daInstalacao })
})

router.put('/ia/meu-modelo', exigirPapel('user'), (req, res) => {
  const r = salvarModeloDaConta(req.conta.sub, req.body?.modelo)
  if (!r.ok) return res.status(400).json({ error: r.erro })
  const e = configIa(req.conta.sub)
  res.json({ ok: true, modelo: e.modelo })
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/ia/chave — configura a chave desta instalação (só administrador)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/ia/chave', exigirPapel('admin'), limitar({ max: 10, janelaMs: 60_000 }), (req, res) => {
  const r = salvarChave(req.body?.chave)
  if (!r.ok) return res.status(400).json({ error: r.erro })
  const { modelo, finalDaChave } = configIa()
  res.json({ ok: true, configurada: true, origem: 'banco', modelo, finalDaChave })
})

router.delete('/ia/chave', exigirPapel('admin'), (_req, res) => {
  removerChave()
  const estado = configIa()
  res.json({ ok: true, configurada: estado.configurada, origem: estado.origem })
})

router.put('/ia/modelo', exigirPapel('admin'), (req, res) => {
  const r = salvarModelo(req.body?.modelo)
  if (!r.ok) return res.status(400).json({ error: r.erro })
  res.json({ ok: true, modelo: r.modelo })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/sintese — o resumo executivo do período
//
// Limitado a seis por hora por sessão: é uma chamada paga, e o resultado fica
// guardado — pedir de novo no mesmo dia devolve o mesmo texto sem custo.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/sintese', exigirPapel('user'), limitar({ max: 6, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const periodoDias = dias(req.body?.days, 7)

  // Já existe hoje? Devolve sem gastar.
  const guardada = sinteseGuardada(periodoDias, req.conta?.sub)
  if (guardada && !req.body?.forcar) {
    return res.json({ ...guardada, doCache: true })
  }

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    // 409 e não 500: não é falha, é recurso não configurado.
    return res.status(409).json({
      error: 'Nenhuma chave de modelo configurada para esta conta nem para esta instalação.',
      code: 'SEM_CHAVE',
    })
  }

  const materias = all(`${SELECT_MATERIAS} ORDER BY a.published_at DESC LIMIT 40`, [`-${periodoDias} days`])
  const alerta = nivelDeAlerta(all(
    `SELECT urgency FROM articles
      WHERE relevant = 1
        AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)`,
    [`-${periodoDias} days`],
  ))

  const r = await sintetizarClipping({ materias, periodoDias, alerta, userId: req.conta?.sub })
  if (!r.ok) {
    const status = r.codigo === 'SEM_MATERIA' ? 422 : 502
    return res.status(status).json({ error: r.erro, code: r.codigo })
  }

  const carga = {
    texto: r.texto,
    // A MARCA. Ver a regra 2 em services/ia.js: toda saída de modelo viaja
    // identificada, para que a tela nunca a confunda com apuração.
    origem: 'modelo',
    modelo: r.modelo,
    periodoDias,
    materiasConsideradas: materias.length,
    geradoEm: new Date().toISOString(),
    uso: r.uso,
  }
  guardarSintese(periodoDias, carga, req.conta?.sub)

  res.json({ ...carga, doCache: false })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/perguntar — pergunta livre sobre o acervo
//
// O contexto é montado AQUI, e não pelo cliente: quem pergunta escolhe a
// pergunta, não o material. Deixar o front mandar o contexto permitiria pedir
// ao modelo que comentasse texto que não veio da coleta — e a resposta sairia
// com a mesma aparência de uma apurada no acervo.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/perguntar', exigirPapel('user'), limitar({ max: 20, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const pergunta = String(req.body?.pergunta || '').trim()
  if (pergunta.length < 5) return res.status(400).json({ error: 'Escreva a pergunta.' })
  if (pergunta.length > 500) return res.status(400).json({ error: 'Pergunta longa demais (máximo 500 caracteres).' })

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    return res.status(409).json({ error: 'Nenhuma chave de modelo configurada para esta conta nem para esta instalação.', code: 'SEM_CHAVE' })
  }

  const periodoDias = dias(req.body?.days, 30)
  const materias = all(`${SELECT_MATERIAS} ORDER BY a.published_at DESC LIMIT 60`, [`-${periodoDias} days`])
  if (!materias.length) {
    return res.status(422).json({ error: 'Não há matéria no período para consultar.', code: 'SEM_MATERIA' })
  }

  // O panorama entra como CONTAGEM JÁ APURADA, não como texto para o modelo
  // contar. Pedir a um modelo que some linhas é onde ele erra; a plataforma já
  // sabe somar, e o modelo só precisa ler o total.
  const linhas = all(
    `SELECT c.alvo_rotulo AS alvo, c.regra, COUNT(*) AS total
       FROM correlations c JOIN articles a ON a.id = c.article_id
      WHERE a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)
      GROUP BY c.alvo_rotulo, c.regra ORDER BY total DESC LIMIT 20`,
    [`-${periodoDias} days`],
  )
  const panorama = linhas.length
    ? linhas.map((l) => `${l.alvo}: ${l.total} ligação(ões) pela regra "${l.regra}"`).join('\n')
    : null

  const r = await perguntarSobreAcervo({ pergunta, materias, panorama, userId: req.conta?.sub })
  if (!r.ok) return res.status(502).json({ error: r.erro, code: r.codigo })

  res.json({
    pergunta,
    texto: r.texto,
    origem: 'modelo',
    modelo: r.modelo,
    periodoDias,
    materiasConsideradas: materias.length,
    geradoEm: new Date().toISOString(),
    uso: r.uso,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/correlacao/:id — o que esta ligação significa
//
// A correlação é carregada AQUI, pelo id, e não recebida do cliente. Aceitar o
// corpo pronto permitiria mandar ao modelo uma "correlação" que a plataforma
// nunca produziu, e a resposta sairia com a mesma aparência de uma lida do
// acervo.
//
// A leitura fica guardada na própria linha: uma ligação não muda, então relê-la
// não deve custar outra chamada. Ver a coluna `leitura_ia` em `correlations`.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/correlacao/:id', exigirPapel('user'), limitar({ max: 30, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Identificador inválido.' })

  const linha = get(
    `SELECT c.id, c.regra, c.motivo, c.evidencia, c.contexto_br, c.forca,
            a.title AS titulo, a.summary AS resumo, a.published_at AS publicado,
            s.name AS fonte, c.leitura_ia
       FROM correlations c
       JOIN articles a ON a.id = c.article_id
       LEFT JOIN sources s ON s.id = a.source_id
      WHERE c.id = ?`,
    [id],
  )
  if (!linha) return res.status(404).json({ error: 'Correlação não encontrada.' })

  // Já lida antes? Devolve sem gastar.
  if (linha.leitura_ia && !req.body?.forcar) {
    try {
      return res.json({ ...JSON.parse(linha.leitura_ia), doCache: true })
    } catch { /* cache ilegível: gera de novo */ }
  }

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    return res.status(409).json({ error: 'Nenhuma chave de modelo configurada para esta conta nem para esta instalação.', code: 'SEM_CHAVE' })
  }

  const r = await lerCorrelacao({
    userId: req.conta?.sub,
    correlacao: {
      motivo: linha.motivo,
      evidencia: linha.evidencia,
      contextoBrasil: linha.contexto_br,
      forca: linha.forca,
      artigo: {
        titulo: linha.titulo,
        resumo: linha.resumo,
        publicadoEm: linha.publicado,
        fonte: linha.fonte,
      },
    },
  })
  if (!r.ok) return res.status(502).json({ error: r.erro, code: r.codigo })

  const carga = {
    texto: r.texto,
    origem: 'modelo',
    modelo: r.modelo,
    geradoEm: new Date().toISOString(),
  }
  run('UPDATE correlations SET leitura_ia = ? WHERE id = ?', [JSON.stringify(carga), id])

  res.json({ ...carga, doCache: false })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ia/candidatas — as matérias que se pode escolher para analisar
//
// A lista existe para a tela de seleção. Devolve o que a plataforma JÁ apurou
// de cada uma — índice de vínculo, motivo e quantas ligações tem —, porque é
// isso que permite escolher com critério em vez de por manchete.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ia/candidatas', exigirPapel('user'), (req, res) => {
  const periodoDias = dias(req.query.days, 14)
  const itens = all(
    `SELECT a.id, a.title AS titulo, a.category AS categoria, a.urgency AS urgencia,
            a.published_at AS publicadoEm, a.br_score AS brScore, a.br_motivo AS brMotivo,
            s.name AS fonte,
            (SELECT COUNT(*) FROM correlations c WHERE c.article_id = a.id) AS ligacoes
       FROM articles a LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.relevant = 1
        AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)
      ORDER BY a.br_score DESC NULLS LAST, a.published_at DESC
      LIMIT 60`,
    [`-${periodoDias} days`],
  )
  res.json({ periodoDias, total: itens.length, items: itens, maximoPorAnalise: MAXIMO_POR_ANALISE })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/analise — o Contexto e o Impacto de um conjunto escolhido
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE O MODELO ESCREVE, E O QUE ELE NÃO ESCREVE
//
// Escreve:     Contexto no Brasil, Impacto possível, e a leitura do conjunto.
// Não escreve: o Índice de vínculo com o Brasil.
//
// O índice continua saindo da contagem de entidades brasileiras reconhecidas
// pelo catálogo — é o mesmo número de sempre, e viaja nesta resposta vindo da
// coluna `br_score`, não do modelo. Pedir a nota ao modelo seria pedir a única
// coisa que ele não pode dar com segurança: um valor que PARECE apurado.
//
// ─────────────────────────────────────────────────────────────────────────────
// O SERVIDOR ESCOLHE O MATERIAL, O CLIENTE ESCOLHE OS IDs
//
// O corpo traz só números. As matérias são lidas do banco aqui, e as entidades
// de cada uma são detectadas aqui. Aceitar texto pronto do cliente permitiria
// mandar ao modelo conteúdo que a plataforma nunca coletou — e a resposta
// sairia com a mesma aparência de uma apurada no acervo.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/analise', exigirPapel('user'), limitar({ max: 12, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : []

  if (!ids.length) return res.status(400).json({ error: 'Escolha ao menos uma matéria.' })
  if (ids.length > MAXIMO_POR_ANALISE) {
    return res.status(400).json({
      error: `São no máximo ${MAXIMO_POR_ANALISE} matérias por análise.`,
      code: 'LIMITE_DE_SELECAO',
    })
  }

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    return res.status(409).json({
      error: 'Nenhuma chave de modelo configurada para esta conta nem para esta instalação.',
      code: 'SEM_CHAVE',
    })
  }

  const marcadores = ids.map(() => '?').join(',')
  const linhas = all(
    `SELECT a.id, a.title AS titulo, a.summary AS resumo, a.category AS categoria,
            a.urgency AS urgencia, a.published_at AS publicadoEm, a.url,
            a.br_score AS brScore, a.br_motivo AS brMotivo, s.name AS fonte
       FROM articles a LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.id IN (${marcadores}) AND a.relevant = 1
      ORDER BY a.published_at DESC`,
    ids,
  )
  if (!linhas.length) return res.status(404).json({ error: 'Nenhuma das matérias escolhidas está no acervo.' })

  // Os fatos apurados de cada matéria — é isto que o modelo recebe como lista
  // fechada, e é contra isto que a resposta dele é conferida depois.
  const itens = linhas.map((l) => ({
    ...l,
    entidades: detectarEntidades(`${l.titulo} ${l.resumo || ''}`)
      .map((e) => ({ nome: e.nome, tipo: e.tipo })),
    correlacoes: all(
      'SELECT motivo, evidencia, forca FROM correlations WHERE article_id = ? ORDER BY forca DESC LIMIT 4',
      [l.id],
    ),
  }))

  const r = await analisarLote({ itens, userId: req.conta?.sub })
  if (!r.ok) {
    const status = r.codigo === 'SEM_MATERIA' ? 422 : 502
    return res.status(status).json({ error: r.erro, code: r.codigo })
  }

  // Junta a prosa do modelo com o que a plataforma apurou. O índice vem da
  // coluna, e a lista de entidades detectadas vem do catálogo: quem lê pode
  // conferir o texto contra os dois.
  const porId = new Map(itens.map((i) => [i.id, i]))
  const materias = r.itens.map((a) => {
    const base = porId.get(a.id)
    return {
      id: a.id,
      titulo: base.titulo,
      fonte: base.fonte,
      url: base.url,
      categoria: base.categoria,
      urgencia: base.urgencia,
      publicadoEm: base.publicadoEm,
      // ── Apurado pela plataforma ──
      brScore: base.brScore,
      brMotivo: base.brMotivo,
      entidadesDetectadas: base.entidades,
      ligacoesApuradas: base.correlacoes.length,
      // ── Escrito por modelo, já conferido ──
      contexto: a.contexto,
      impacto: a.impacto,
      entidadesCitadas: a.entidadesCitadas,
    }
  })

  res.json({
    origem: 'modelo',
    modelo: r.modelo,
    geradoEm: new Date().toISOString(),
    leitura: r.leitura,
    materias,
    verificacao: r.verificacao,
    uso: r.uso,
    nota: 'Contexto, impacto e leitura foram escritos por modelo de linguagem. O índice de '
      + 'vínculo e as entidades detectadas são contagem da plataforma, não do modelo.',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/semanal — o relatório da semana
//
// Guardado por conta e semana: um relatório da semana não muda durante ela, e
// relê-lo não deve custar outra chamada.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/semanal', exigirPapel('user'), limitar({ max: 8, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const guardado = sinteseGuardada('semanal', req.conta?.sub)
  if (guardado && !req.body?.forcar) return res.json({ ...guardado, doCache: true })

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    return res.status(409).json({
      error: 'Nenhuma chave de modelo configurada para esta conta nem para esta instalação.',
      code: 'SEM_CHAVE',
    })
  }

  const materias = all(`${SELECT_MATERIAS} ORDER BY a.published_at DESC LIMIT 50`, ['-7 days'])
  const alerta = nivelDeAlerta(all(
    "SELECT urgency FROM articles WHERE relevant = 1 AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')",
  ))

  // As contagens vão APURADAS. Pedir a um modelo que some linhas é onde ele
  // erra; a plataforma já sabe somar, e ele só precisa ler o total.
  const setores = all(
    `SELECT c.alvo_rotulo AS nome, COUNT(*) AS total
       FROM correlations c JOIN articles a ON a.id = c.article_id
      WHERE c.regra = 'setor-sob-pressao'
        AND a.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')
      GROUP BY c.alvo_rotulo ORDER BY total DESC LIMIT 8`,
  )
  const categorias = all(
    `SELECT category AS nome, COUNT(*) AS total FROM articles
      WHERE relevant = 1 AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')
      GROUP BY category ORDER BY total DESC LIMIT 8`,
  )
  const panorama = [
    categorias.length ? `Matérias por categoria: ${categorias.map((c) => `${c.nome} ${c.total}`).join(', ')}.` : '',
    setores.length ? `Setores com cobertura e incidente na semana: ${setores.map((c) => `${c.nome} ${c.total}`).join(', ')}.` : '',
  ].filter(Boolean).join('\n') || null

  const r = await relatorioSemanal({ materias, alerta, panorama, userId: req.conta?.sub })
  if (!r.ok) {
    const status = r.codigo === 'SEM_MATERIA' ? 422 : 502
    return res.status(status).json({ error: r.erro, code: r.codigo })
  }

  const carga = {
    texto: r.texto,
    origem: 'modelo',
    modelo: r.modelo,
    periodoDias: 7,
    materiasConsideradas: materias.length,
    alerta: alerta?.level ? { nivel: alerta.level, score: alerta.score } : null,
    geradoEm: new Date().toISOString(),
    uso: r.uso,
  }
  guardarSintese('semanal', carga, req.conta?.sub)
  res.json({ ...carga, doCache: false })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ia/guia — o guia da plataforma
//
// FUNCIONA SEM CHAVE NENHUMA, e essa é a decisão central deste recurso.
//
// Uma visita guiada existe para quem acabou de chegar — e quem acabou de chegar
// é exatamente quem ainda não configurou chave de modelo. Um assistente que só
// funcionasse com IA estaria quebrado para a única pessoa que ele precisa
// atender.
//
// Então o guia escrito é a base, sempre disponível, navegável por tópicos. O
// modelo é a camada de cima: com chave, o mesmo conteúdo passa a responder
// pergunta livre. Sem chave, continua sendo um guia — que já é útil.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ia/guia', exigirPapel('user'), (req, res) => {
  const { configurada } = configIa(req.conta?.sub)
  res.json({
    telas: TELAS,
    niveis: NIVEIS,
    conceitos: CONCEITOS,
    naoFaz: NAO_FAZ,
    primeirosPassos: PRIMEIROS_PASSOS,
    // Diz à tela se ela deve oferecer o campo de pergunta ou só os tópicos.
    perguntaDisponivel: configurada,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ia/guia — pergunta livre sobre COMO USAR a plataforma
//
// O material é o guia e mais nada. Não é "contexto adicional": é a fronteira.
// Um modelo perguntado sobre um produto que ele não conhece descreve um menu
// que não existe, e quem acabou de chegar não tem como perceber.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ia/guia', exigirPapel('user'), limitar({ max: 30, janelaMs: 60 * 60_000, porConta: true }), async (req, res) => {
  const pergunta = String(req.body?.pergunta || '').trim()
  if (pergunta.length < 3) return res.status(400).json({ error: 'Escreva a pergunta.' })
  if (pergunta.length > 300) return res.status(400).json({ error: 'Pergunta longa demais (máximo 300 caracteres).' })

  const { configurada } = configIa(req.conta?.sub)
  if (!configurada) {
    return res.status(409).json({
      error: 'Sem chave de modelo, o assistente responde pelos tópicos do guia.',
      code: 'SEM_CHAVE',
    })
  }

  const r = await responderSobreAPlataforma({
    pergunta,
    guia: guiaComoTexto(),
    userId: req.conta?.sub,
  })
  if (!r.ok) return res.status(502).json({ error: r.erro, code: r.codigo })

  res.json({
    pergunta,
    texto: r.texto,
    origem: 'modelo',
    modelo: r.modelo,
    geradoEm: new Date().toISOString(),
  })
})

export default router
