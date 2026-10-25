import { get, run, transacao, agora } from './index.js'
import { LENTE_VERSAO } from '../lib/mundo.js'
import { semearFontes } from '../collectors/rss.js'
import { semearAgregadores } from '../collectors/newsapi.js'
import { semearContas } from '../routes/auth.js'

// -----------------------------------------------------------------------------
// SEMEADURA — o que o banco precisa ter além do esquema
//
// Antes, `migrate()` fazia tudo a cada subida: criava tabelas, consertava
// colunas de bancos antigos, cadastrava fontes e conferia a versão da lente
// mundial. O esquema agora vive em `supabase/migrations/` e o banco nasce no
// formato final, então os consertos de bancos antigos (passos 4 a 7) saíram.
// Ficou só o que é DADO e precisa ser garantido em todo banco: fontes padrão,
// conta de administrador e a versão da lente.
//
// Idempotente: roda em `npm run migrate` e na subida local sem duplicar nada.
// -----------------------------------------------------------------------------

/**
 * O vocabulário da lente mundial mudou desde a última semeadura?
 *
 * `mundo` e os países/teatros derivados são RESULTADO de regra, e a regra
 * muda: um termo novo, um teatro novo, uma exclusão. Sem isto, o acervo
 * antigo ficaria julgado pela versão velha e o novo pela nova, e as contagens
 * da tela misturariam os dois critérios sem nada que o denunciasse.
 *
 * Zerar `geo_at` e `mundo_score` não apaga nada: marca o acervo como
 * pendente, e a derivação (collectors/geografia.js) reavalia em lotes no
 * ciclo seguinte. `mundo` fica com o valor antigo até lá, em vez de sumir.
 *
 * @returns {Promise<boolean>} true quando a versão mudou e o acervo foi marcado
 */
async function conferirLenteMundial() {
  return transacao(async () => {
    const versao = (await get("SELECT valor FROM app_config WHERE chave = 'lente_mundo_versao'"))?.valor
    if (versao === String(LENTE_VERSAO)) return false

    // Quando a lente passou a gravar nesta instalação — só na primeira vez.
    // Antes disso as editorias de mundo descartavam a cobertura
    // internacional, e comparar um período com outro anterior a esta data
    // mede a coleta que começou, não o mundo. /mundo/panorama diz isso.
    if (versao === undefined) {
      await run(
        `INSERT INTO app_config (chave, valor) VALUES ('lente_mundo_desde', ?)
         ON CONFLICT (chave) DO NOTHING`,
        [agora()],
      )
    }
    await run('UPDATE articles SET geo_at = NULL, mundo_score = NULL')
    await run(
      `INSERT INTO app_config (chave, valor) VALUES ('lente_mundo_versao', ?)
       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
      [String(LENTE_VERSAO)],
    )
    return true
  })
}

/**
 * Garante fontes padrão, agregadores configurados, conta de administrador e a
 * versão da lente mundial.
 *
 * @returns {Promise<{ fontes: number, contas: { criadas: number, assumidas: number, removidas: number, avisos: string[] }, lenteReavaliada: boolean }>}
 */
export async function semearTudo() {
  const fontes = (await semearFontes()) + (await semearAgregadores())
  const contas = await semearContas()
  const lenteReavaliada = await conferirLenteMundial()
  return { fontes, contas, lenteReavaliada }
}

export default { semearTudo }
