import { Router } from 'express'
import { all } from '../db/index.js'
import { exigirPapel } from '../lib/auth.js'
import { limitar } from '../lib/limite.js'
import { dias } from '../lib/parametros.js'
import { configIa, salvarChave, removerChave, salvarModelo, MODELO_PADRAO } from '../lib/chaveIa.js'
import { sintetizarClipping, perguntarSobreAcervo } from '../services/ia.js'
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
  const { configurada, origem, modelo, finalDaChave } = configIa()
  res.json({
    configurada,
    origem,
    modelo,
    modeloPadrao: MODELO_PADRAO,
    finalDaChave,
    // Quem pode configurar. A tela usa isto para decidir entre "peça ao
    // administrador" e "configure aqui".
    podeConfigurar: req.conta?.role === 'admin',
    fixadoPorAmbiente: !!process.env.ANTHROPIC_API_KEY,
    nota: configurada
      ? 'Textos gerados por modelo aparecem sempre marcados como escritos por máquina.'
      : 'Nenhum modelo conectado. Os campos de síntese ficam vazios em vez de preenchidos com texto plausível.',
  })
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
router.post('/ia/sintese', exigirPapel('user'), limitar({ max: 6, janelaMs: 60 * 60_000 }), async (req, res) => {
  const periodoDias = dias(req.body?.days, 7)

  // Já existe hoje? Devolve sem gastar.
  const guardada = sinteseGuardada(periodoDias)
  if (guardada && !req.body?.forcar) {
    return res.json({ ...guardada, doCache: true })
  }

  const { configurada } = configIa()
  if (!configurada) {
    // 409 e não 500: não é falha, é recurso não configurado.
    return res.status(409).json({
      error: 'Nenhum modelo está configurado nesta instalação.',
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

  const r = await sintetizarClipping({ materias, periodoDias, alerta })
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
  guardarSintese(periodoDias, carga)

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
router.post('/ia/perguntar', exigirPapel('user'), limitar({ max: 20, janelaMs: 60 * 60_000 }), async (req, res) => {
  const pergunta = String(req.body?.pergunta || '').trim()
  if (pergunta.length < 5) return res.status(400).json({ error: 'Escreva a pergunta.' })
  if (pergunta.length > 500) return res.status(400).json({ error: 'Pergunta longa demais (máximo 500 caracteres).' })

  const { configurada } = configIa()
  if (!configurada) {
    return res.status(409).json({ error: 'Nenhum modelo está configurado nesta instalação.', code: 'SEM_CHAVE' })
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

  const r = await perguntarSobreAcervo({ pergunta, materias, panorama })
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

export default router
