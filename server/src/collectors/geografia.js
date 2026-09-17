import { all, run, agora, transacao } from '../db/index.js'
import config from '../config.js'
import { detectarPaises } from '../lib/geo.js'
import { avaliarMundo, detectarTeatros, urgenciaMundo } from '../lib/mundo.js'
import { limparRodape, CARACTERES_CONSIDERADOS } from '../lib/relevance.js'

// -----------------------------------------------------------------------------
// DERIVAÇÃO GEOGRÁFICA — países e teatros de cada artigo
//
// Como `correlacoes.js`, não busca nada fora: aplica regra ao que já está no
// banco e grava o resultado em `article_paises` e `article_teatros`.
//
// POR QUE EXISTE
//
// O mapa (/news/countries) e o dossiê de país (/news/pais/:nome) rodavam
// `detectarPaises` sobre cada matéria da janela A CADA REQUISIÇÃO. Com o acervo
// só de defesa do Brasil eram algumas centenas de regex; com a lente mundial
// gravando a cobertura internacional, viram milhares — e `node:sqlite` é
// síncrono, então esse tempo é o servidor inteiro parado, healthcheck
// inclusive. Aqui o custo é pago uma vez por artigo, e a tela conta por JOIN.
//
// O QUE ELE FAZ, NESTA ORDEM
//
//   1. Artigo com `mundo_score` NULO — o acervo anterior à lente, ou o acervo
//      inteiro depois de uma troca de versão do vocabulário — recebe a
//      avaliação da lente. `relevant`, `category` e `urgency` de matéria do
//      Brasil NÃO são tocados: são outra régua. Matéria com `relevant = 0` que
//      passa agora ganha a categoria e a urgência da escala internacional, como
//      na coleta.
//   2. Países e teatros são recalculados do zero para o artigo (apaga e grava),
//      o que torna o passo idempotente.
//   3. Retenção: cobertura só internacional mais velha que
//      `MUNDO_RETENCAO_DIAS` sai do banco.
//
// A ORDEM NO CICLO: roda depois de `rss` e `agregadores`, que trazem os
// artigos, e antes de `correlacoes` — a mesma ideia de dependência expressa
// na estrutura de collectors/index.js.
// -----------------------------------------------------------------------------

/** Teto de artigos por ciclo. Na partida a frio o acervo inteiro está pendente. */
const TETO_POR_CICLO = 3000

/**
 * Artigos por transação. Entre um lote e outro o laço devolve a vez ao event
 * loop: medido na cópia do acervo, cada artigo custa ~2,5 ms (788 derivados em
 * 2,0 s, lente + países + teatros + escrita). 3.000 numa transação só seriam
 * quase oito segundos de servidor surdo, healthcheck incluído; em lotes de 50,
 * a maior pausa fica perto de 130 ms.
 */
const LOTE = 50

const ceder = () => new Promise((resolve) => setImmediate(resolve))

/**
 * O texto que as duas detecções leem: sem o rodapé do veículo e cortado onde a
 * lente e o filtro de relevância cortam. O G1 publica a matéria inteira no
 * resumo — até 20 mil caracteres —, e um país citado no décimo parágrafo não
 * é assunto da matéria.
 */
const textoDoArtigo = (a) => limparRodape(`${a.title} ${a.summary || ''}`).slice(0, CARACTERES_CONSIDERADOS)

/** Deriva países e teatros do acervo pendente. Nunca lança. */
export async function derivarGeografia() {
  const inicio = Date.now()
  try {
    const pendentes = all(
      `SELECT id, title, summary, relevant, mundo, mundo_score
         FROM articles
        WHERE geo_at IS NULL
        ORDER BY published_at DESC
        LIMIT ${TETO_POR_CICLO}`
    )

    let avaliados = 0
    let novos = 0
    let paises = 0
    let teatros = 0

    for (let i = 0; i < pendentes.length; i += LOTE) {
      const lote = pendentes.slice(i, i + LOTE)
      transacao(() => {
        const quando = agora()
        for (const a of lote) {
          const texto = textoDoArtigo(a)

          if (a.mundo_score == null) {
            const m = avaliarMundo(texto)
            const termos = m.termos.slice(0, 8).join(', ') || null
            if (!a.relevant && m.mundo) {
              run(
                `UPDATE articles SET mundo = 1, mundo_score = ?, mundo_termos = ?,
                        category = 'Internacional', urgency = ? WHERE id = ?`,
                [m.pontos, termos, urgenciaMundo(a.title), a.id]
              )
            } else {
              run(
                'UPDATE articles SET mundo = ?, mundo_score = ?, mundo_termos = ? WHERE id = ?',
                [m.mundo ? 1 : 0, m.pontos, termos, a.id]
              )
            }
            avaliados += 1
            if (m.mundo && !a.mundo) novos += 1
          }

          run('DELETE FROM article_paises WHERE article_id = ?', [a.id])
          run('DELETE FROM article_teatros WHERE article_id = ?', [a.id])
          for (const pais of detectarPaises(texto)) {
            run('INSERT OR IGNORE INTO article_paises (article_id, pais) VALUES (?, ?)', [a.id, pais])
            paises += 1
          }
          for (const teatro of detectarTeatros(texto)) {
            run('INSERT OR IGNORE INTO article_teatros (article_id, teatro) VALUES (?, ?)', [a.id, teatro])
            teatros += 1
          }
          run('UPDATE articles SET geo_at = ? WHERE id = ?', [quando, a.id])
        }
      })
      if (i + LOTE < pendentes.length) await ceder()
    }

    // ── RETENÇÃO ──
    //
    // Só o que é EXCLUSIVAMENTE internacional (`relevant = 0 AND mundo = 1`): o
    // acervo de defesa do Brasil não tem prazo. E nunca o que está numa pasta —
    // `bookmarks` tem chave estrangeira com CASCADE, e apagar a matéria
    // apagaria em silêncio o que alguém guardou de propósito.
    const removidos = Number(run(
      `DELETE FROM articles
        WHERE relevant = 0 AND mundo = 1
          AND published_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-${config.mundo.retencaoDias} days')
          AND id NOT IN (SELECT article_id FROM bookmarks)`
    ).changes || 0)

    return {
      ok: true,
      avaliados,
      paises,
      teatros,
      removidos,
      // Nomes que o histórico de execuções espera — ver `registrar()` em
      // collectors/index.js. `encontrados` são os artigos pendentes que este
      // ciclo processou; `novos`, os que entraram na lente mundial agora.
      encontrados: pendentes.length,
      novos,
      duracaoMs: Date.now() - inicio,
    }
  } catch (err) {
    return { ok: false, erro: String(err?.message || err).slice(0, 200), duracaoMs: Date.now() - inicio }
  }
}

export default { derivarGeografia }
