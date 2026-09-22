import { Router } from 'express'
import { get } from '../db/index.js'
import config from '../config.js'
import { METODO_RELEVANCIA, METODO_URGENCIA } from '../lib/relevance.js'
import { METODO_CRITICIDADE } from '../lib/criticidade.js'
import { METODO_ALERTA } from '../lib/alerta.js'
import { METODO_CORRELACAO } from '../lib/correlacao.js'
import { METODO_MUNDO, TEATROS } from '../lib/mundo.js'
import { LIMIAR_SIMILARIDADE, JANELA_HORAS } from '../lib/eventos.js'
import { CADENCIA_MINUTOS } from '../collectors/index.js'

// -----------------------------------------------------------------------------
// GET /api/metodo — TODAS as réguas da plataforma, em um lugar só e em público
//
// A plataforma exibe números que classificam o mundo: urgência de uma matéria,
// criticidade de um incidente, nível de alerta do período, força de uma
// correlação. Cada régua já estava publicada em algum canto — `/system/method`
// (só administrador), `/intel/metodo`, `/mundo/metodo` (com sessão) — e o
// resultado prático era que a pessoa que VÊ o número não tinha como chegar à
// régua que o produziu.
//
// Um selo "CRÍTICO" que ninguém pode contestar é decoração. Esta rota é o que
// permite a uma página pública explicar cada escala com os valores REAIS do
// código: os pesos do índice de alerta, os degraus da criticidade, as sete
// regras de correlação com a força de cada uma, o vocabulário da urgência.
//
// PÚBLICA de propósito. Não há nada aqui sobre o acervo de ninguém: é a régua,
// não a medição. Quem avalia se confia na plataforma precisa ler isto ANTES de
// criar conta.
// -----------------------------------------------------------------------------

const router = Router()

router.get('/metodo', (_req, res) => {
  const fontes = get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN idioma = 'en' THEN 1 ELSE 0 END) AS ingles
       FROM sources WHERE enabled = 1`
  ) || { total: 0, ingles: 0 }

  res.json({
    // ── O que entra no acervo ──
    relevancia: METODO_RELEVANCIA,
    // ── Como cada coisa é classificada ──
    urgencia: METODO_URGENCIA,
    criticidade: METODO_CRITICIDADE,
    alerta: METODO_ALERTA,
    correlacao: {
      janelaDias: METODO_CORRELACAO.janelaDias,
      forca: METODO_CORRELACAO.forca,
      regras: METODO_CORRELACAO.regras,
      guardas: METODO_CORRELACAO.guardas,
      ressalva: METODO_CORRELACAO.ressalva,
    },
    mundo: {
      versao: METODO_MUNDO.versao,
      regra: METODO_MUNDO.regra,
      etapas: METODO_MUNDO.etapas,
      teatros: TEATROS.map((t) => ({ id: t.id, nome: t.nome, regiao: t.regiao, descricao: t.descricao })),
    },
    eventos: {
      limiar: LIMIAR_SIMILARIDADE,
      janelaHoras: JANELA_HORAS,
      regra: `Títulos com ${Math.round(LIMIAR_SIMILARIDADE * 100)}% de termos significativos em comum, `
        + `publicados a menos de ${JANELA_HORAS}h um do outro, são tratados como o mesmo evento.`,
    },
    coleta: {
      intervaloMinutos: config.coleta.intervaloMinutos,
      cadenciaPorColetor: CADENCIA_MINUTOS,
      fontes: fontes.total ?? 0,
      fontesEmIngles: fontes.ingles ?? 0,
      retencaoMundoDias: config.mundo.retencaoDias,
    },
    // A frase que vale para TODA escala desta lista, e que a interface repete
    // em cada tela: o que se mede é o que foi publicado, não o mundo.
    ressalvaGeral: 'Toda escala aqui classifica TEXTO COLETADO por vocabulário escrito e auditável. '
      + 'Nenhuma usa inteligência artificial, estimativa ou opinião editorial. Volume de cobertura não '
      + 'é medida de risco, e ausência de matéria não é ausência de fato.',
  })
})

export default router
