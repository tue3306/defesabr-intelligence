import { all, get, run } from '../db/index.js'
import config from '../config.js'
import { apagarJanelasVencidas } from './limite.js'

// -----------------------------------------------------------------------------
// RETENÇÃO E ORÇAMENTO DE ARMAZENAMENTO
//
// O Supabase Free para de aceitar escrita em 500 MB. Duas defesas:
//
//   1. POR IDADE: só-mundo além de MUNDO_RETENCAO_DIAS e audit_log além de
//      AUDITORIA_RETENCAO_DIAS saem, e as janelas vencidas do limitador também.
//   2. POR PRESSÃO: se o banco seguir acima do orçamento (DB_ORCAMENTO_MB), a
//      janela do só-mundo encurta para 120 e depois 60 dias.
//
// NUNCA se apaga `relevant = 1` (o acervo de defesa do Brasil não tem prazo) nem
// matéria em `bookmarks` (a chave estrangeira é CASCADE: apagar o artigo
// apagaria em silêncio o que alguém guardou de propósito).
//
// DELETE não encolhe `pg_database_size` na hora — o espaço só volta após o
// VACUUM. Por isso a pressão é de no máximo TRÊS passadas por chamada (180, 120,
// 60) e nunca um laço "até caber".
// -----------------------------------------------------------------------------

/** Janelas de pressão, da mais folgada à mais apertada, depois da de config. */
const JANELAS_DE_PRESSAO = [120, 60]

/** Linhas por DELETE, quando o chamador não informa. */
const LOTE_PADRAO = 2000

/**
 * Teto de lotes por passada. 200 × 2.000 = 400 mil linhas, bem acima do que um
 * ciclo acumula (~3,4 kB/artigo), e mantém a função dentro dos 300 s da Vercel
 * mesmo num acervo antigo gigante: o resto sai no ciclo seguinte.
 */
const MAX_LOTES_POR_PASSADA = 200

/** Tamanho do banco e das tabelas públicas, da maior para a menor. */
export async function tamanhoDoBanco() {
  const banco = await get('SELECT pg_database_size(current_database()) AS bytes')
  const tabelas = await all(
    `SELECT c.relname AS tabela, pg_total_relation_size(c.oid) AS bytes
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY bytes DESC`
  )
  return {
    bytes: Number(banco?.bytes || 0),
    porTabela: tabelas.map((t) => ({ tabela: t.tabela, bytes: Number(t.bytes) })),
  }
}

/** DELETE em lotes: `tabela` e `condicao` são constantes deste arquivo. */
async function apagarEmLotes(tabela, condicao, params, lote) {
  let total = 0
  for (let i = 0; i < MAX_LOTES_POR_PASSADA; i += 1) {
    const { changes } = await run(
      `DELETE FROM ${tabela} WHERE id IN (SELECT id FROM ${tabela} WHERE ${condicao} LIMIT ?)`,
      [...params, lote]
    )
    const n = Number(changes || 0)
    total += n
    if (n < lote) break
  }
  return total
}

const apagarSoMundo = (dias, lote) => apagarEmLotes(
  'articles',
  `relevant = 0 AND mundo = 1
     AND published_at < iso_agora(?)
     AND id NOT IN (SELECT article_id FROM bookmarks)`,
  [`-${dias} days`],
  lote
)

const apagarAuditoria = (dias, lote) => apagarEmLotes(
  'audit_log', 'created_at < iso_agora(?)', [`-${dias} days`], lote
)

/**
 * Aplica a retenção por prazo e, se preciso, por pressão.
 * `removidos`: { mundo, auditoria, limite } — contagens somadas das passadas.
 */
export async function aplicarRetencao({ tamanho = tamanhoDoBanco, lote = LOTE_PADRAO } = {}) {
  const orcamento = config.armazenamento.orcamentoBytes
  let janelaMundoDias = config.mundo.retencaoDias
  let mundo = await apagarSoMundo(janelaMundoDias, lote)
  const auditoria = await apagarAuditoria(config.auditoria.retencaoDias, lote)
  const limite = await apagarJanelasVencidas()

  let acimaDoOrcamento = (await tamanho()).bytes > orcamento
  for (const dias of JANELAS_DE_PRESSAO) {
    if (!acimaDoOrcamento) break
    // Só aperta: um MUNDO_RETENCAO_DIAS já menor que a janela não a alarga.
    if (dias >= janelaMundoDias) continue
    janelaMundoDias = dias
    mundo += await apagarSoMundo(dias, lote)
    acimaDoOrcamento = (await tamanho()).bytes > orcamento
  }

  return { removidos: { mundo, auditoria, limite }, janelaMundoDias, acimaDoOrcamento }
}

export default { tamanhoDoBanco, aplicarRetencao }
