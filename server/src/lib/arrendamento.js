import { randomBytes } from 'node:crypto'
import { get, run } from '../db/index.js'

// -----------------------------------------------------------------------------
// ARRENDAMENTO (lease) EM BANCO
//
// O ciclo de coleta pode ser disparado por três caminhos ao mesmo tempo: o
// agendador interno, a coleta manual do admin e o POST /api/cron/ciclo. Uma
// variável em memória cobriria um processo só — e um redeploy no Railway sobe a
// instância nova antes de derrubar a velha, então por alguns segundos há duas.
// A trava precisa estar no banco, que é o único ponto comum.
//
// A linha `app_config` de chave `arrendamento:<nome>` guarda
// `<expira ISO>|<token aleatório>`. O prefixo é o vencimento (comparável como
// texto, porque o ISO tem largura fixa); o sufixo aleatório garante que dois
// tomadores no mesmo segundo nunca recebam o mesmo token — sem ele, quem
// liberasse apagaria o arrendamento do outro.
//
// O vencimento existe para um processo morto no meio do ciclo (um redeploy, um
// OOM) não deixar a coleta trancada para sempre: depois de `validadeMs`, o
// arrendamento pode ser tomado de novo.
// -----------------------------------------------------------------------------

const PREFIXO = 'arrendamento:'

/**
 * Tenta tomar o arrendamento `nome` por `validadeMs`.
 * Devolve o token (a guardar para liberar) ou `null` se outro o detém.
 *
 * Um único INSERT … ON CONFLICT DO UPDATE … WHERE: o Postgres serializa as
 * tentativas na linha, então só uma vence mesmo em concorrência.
 */
export async function tomarArrendamento(nome, validadeMs = 360_000) {
  const segundos = Math.max(1, Math.ceil(validadeMs / 1000))
  const sufixo = randomBytes(8).toString('hex')
  const chave = PREFIXO + nome
  // `<=` e não `<`: com vencimento e relógio no mesmo segundo (granularidade do
  // iso_agora), o arrendamento que acabou de vencer deve poder ser retomado.
  const linha = await get(
    `INSERT INTO app_config (chave, valor)
     VALUES (?, iso_agora(?) || '|' || ?)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
     WHERE split_part(app_config.valor, '|', 1) <= iso_agora()
     RETURNING valor`,
    [chave, `${segundos} seconds`, sufixo],
  )
  // Sem linha devolvida, o WHERE barrou o upsert: o arrendamento está em vigor.
  return linha?.valor ?? null
}

/** Apaga o arrendamento só se ainda for o do `token` (quem venceu não derruba o novo dono). */
export async function liberarArrendamento(nome, token) {
  await run('DELETE FROM app_config WHERE chave = ? AND valor = ?', [PREFIXO + nome, token])
}

/** O arrendamento `nome` está em vigor agora? (só leitura, para status) */
export async function arrendamentoTomado(nome) {
  const linha = await get(
    `SELECT 1 AS tomado FROM app_config
     WHERE chave = ? AND split_part(valor, '|', 1) > iso_agora()`,
    [PREFIXO + nome],
  )
  return Boolean(linha)
}
