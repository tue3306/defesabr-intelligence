import { all, get, run, transacao } from '../db/index.js'
import { correlacionar } from '../lib/correlacao.js'

// -----------------------------------------------------------------------------
// CÁLCULO DAS CORRELAÇÕES
//
// Não é um coletor no sentido dos outros: não busca nada fora. É um passo de
// DERIVAÇÃO que roda depois deles, aplicando as regras de `lib/correlacao.js`
// ao que acabou de entrar.
//
// ─────────────────────────────────────────────────────────────────────────────
// A ORDEM IMPORTA, E ESTE PROJETO JÁ PAGOU POR ERRAR ISSO
//
// `coletarAtores` foi posto em `Promise.all` junto de `coletarRansomware`, do
// qual depende: ele lia a tabela de vítimas antes de ela ser preenchida,
// terminava em 47 ms sem gravar nada, e a tela de Atores ficava com zero CVEs
// até o ciclo seguinte — meia hora depois, a cada publicação.
//
// Este passo depende de TODOS os outros: precisa dos artigos que o RSS trouxe,
// das vítimas que o ransomware.live trouxe e dos perfis de ator com os CVEs.
// Por isso roda por último, em série, e a dependência está expressa na
// estrutura de `collectors/index.js` em vez de comentada em algum lugar.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE RECALCULAR, E NÃO SÓ ACRESCENTAR
//
// Uma correlação depende de duas pontas. O artigo de ontem sobre o setor de
// saúde não tinha correlação nenhuma; hoje entraram três hospitais brasileiros
// na lista de vazamentos, e ele passa a ter. Se o cálculo só olhasse artigos
// novos, essa ligação nunca apareceria — a matéria já teria sido processada.
//
// A solução é recalcular uma JANELA: os artigos recentes são reavaliados a
// cada ciclo, e é neles que o insumo novo pode mudar o resultado. Artigos
// antigos ficam como estão, porque as duas pontas deles já estabilizaram.
// -----------------------------------------------------------------------------

/**
 * Quantos dias de artigos são reavaliados a cada ciclo.
 *
 * 45 dias cobre com folga o horizonte em que uma vítima nova ainda pode
 * mudar o resultado de uma matéria já coletada: os grupos divulgam vazamento
 * dias ou semanas depois do ataque, e a imprensa costuma noticiar antes ou
 * logo depois. Além disso, o que muda é raro e o custo cresce à toa.
 */
const JANELA_RECALCULO_DIAS = 45

/** Teto de artigos por ciclo. Protege o tempo do agendador na partida a frio. */
const TETO_POR_CICLO = 900

/**
 * Aplica as regras de correlação ao acervo recente.
 *
 * Nunca lança: um erro aqui não pode derrubar o ciclo de coleta, que já
 * gravou tudo o que buscou.
 */
export async function calcularCorrelacoes() {
  const inicio = Date.now()

  const artigos = all(
    `SELECT id, title, summary, category, urgency, published_at
       FROM articles
      WHERE relevant = 1
        AND (published_at IS NULL
             OR published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now', '-${JANELA_RECALCULO_DIAS} days'))
      ORDER BY published_at DESC
      LIMIT ${TETO_POR_CICLO}`
  )

  if (!artigos.length) {
    return { ok: true, artigos: 0, correlacoes: 0, entidades: 0, duracaoMs: Date.now() - inicio }
  }

  let totalCorrelacoes = 0
  let totalEntidades = 0
  let comCorrelacao = 0

  // Uma transação para o lote inteiro. São milhares de escritas pequenas; sem
  // isso, cada uma vira uma sincronização de disco e o passo passa de segundos
  // a minutos.
  transacao(() => {
    for (const a of artigos) {
      const { entidades, correlacoes, brScore, brMotivo } = correlacionar(a)

      // Substitui o resultado anterior deste artigo em vez de acumular: o
      // recálculo tem de ser idempotente, senão cada ciclo duplicaria as
      // ligações e a contagem exibida cresceria sozinha.
      run('DELETE FROM article_entities WHERE article_id = ?', [a.id])
      run('DELETE FROM correlations WHERE article_id = ?', [a.id])

      for (const e of entidades) {
        run(
          `INSERT OR IGNORE INTO article_entities (article_id, tipo, entidade_id, nome, termo)
           VALUES (?, ?, ?, ?, ?)`,
          [a.id, e.tipo, e.id, e.nome, e.termo]
        )
      }

      for (const c of correlacoes) {
        run(
          `INSERT OR IGNORE INTO correlations
             (article_id, regra, alvo_tipo, alvo_id, alvo_rotulo, motivo, evidencia,
              contexto_br, impacto, forca)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.id, c.regra, c.alvoTipo, String(c.alvoId).slice(0, 200), c.alvoRotulo,
            c.motivo, c.evidencia, c.contextoBr, c.impacto, c.forca]
        )
      }

      run('UPDATE articles SET br_score = ?, br_motivo = ? WHERE id = ?', [brScore, brMotivo, a.id])

      totalEntidades += entidades.length
      totalCorrelacoes += correlacoes.length
      if (correlacoes.length) comCorrelacao += 1
    }
  })

  return {
    ok: true,
    artigos: artigos.length,
    // `encontrados` e `novos` alimentam o histórico de execuções, que espera
    // esses nomes — ver `registrar()` em collectors/index.js.
    encontrados: totalCorrelacoes,
    novos: totalCorrelacoes,
    correlacoes: totalCorrelacoes,
    entidades: totalEntidades,
    artigosComCorrelacao: comCorrelacao,
    duracaoMs: Date.now() - inicio,
  }
}

/** Quanto do acervo já foi correlacionado — alimenta o painel de capacidades. */
export function panoramaCorrelacao() {
  return {
    artigosAvaliados: get('SELECT COUNT(*) AS n FROM articles WHERE br_score IS NOT NULL')?.n ?? 0,
    artigosComCorrelacao: get('SELECT COUNT(DISTINCT article_id) AS n FROM correlations')?.n ?? 0,
    correlacoes: get('SELECT COUNT(*) AS n FROM correlations')?.n ?? 0,
    entidades: get('SELECT COUNT(*) AS n FROM article_entities')?.n ?? 0,
    porRegra: all(
      `SELECT regra, COUNT(*) AS total, MAX(forca) AS forca
         FROM correlations GROUP BY regra ORDER BY forca DESC, total DESC`
    ),
  }
}

export default { calcularCorrelacoes, panoramaCorrelacao }
