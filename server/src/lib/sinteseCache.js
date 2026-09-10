import { get, run } from '../db/index.js'

// -----------------------------------------------------------------------------
// A SÍNTESE GUARDADA
//
// Um resumo por período e por dia, em `app_config`.
//
// Este módulo existe para QUEBRAR UM CICLO. A leitura da síntese nasceu dentro
// de `routes/ia.js`, e `routes/news.js` passou a importá-la para preencher
// `summaryExecutive` — só que `routes/ia.js` já importava `nivelDeAlerta` de
// `routes/news.js`. As duas rotas ficaram se importando em círculo.
//
// ESM tolera o ciclo enquanto ninguém usa o import em tempo de carga, e as duas
// só o usam dentro de handler — ou seja, funcionaria. Mas funcionaria por
// coincidência: bastaria alguém mover uma dessas chamadas para o corpo do
// módulo para receber `undefined` no lugar da função, num erro que só aparece
// no primeiro pedido e não na subida do servidor.
//
// O estado compartilhado desce para uma camada que não conhece rota nenhuma, e
// as duas rotas passam a depender dela em vez de uma da outra.
//
// SEM TABELA NOVA: `app_config` já existe e já guarda estado de instalação
// (o segredo de sessão, a chave do modelo). Uma migração a menos é uma coisa a
// menos que pode falhar num deploy.
// -----------------------------------------------------------------------------

/** Um resumo por período e por dia — `ia_sintese:7:2026-09-10`. */
export const chaveSintese = (periodoDias) =>
  `ia_sintese:${periodoDias}:${new Date().toISOString().slice(0, 10)}`

/**
 * A síntese guardada do período, ou `null`.
 *
 * Nunca lança: um cache ilegível é ausência de cache, não erro de página. O
 * banco pode não estar migrado no primeiro boot, e o JSON pode ter sido
 * gravado por uma versão anterior com outro formato.
 */
export function sinteseGuardada(periodoDias) {
  try {
    const linha = get('SELECT valor FROM app_config WHERE chave = ?', [chaveSintese(periodoDias)])
    return linha ? JSON.parse(linha.valor) : null
  } catch {
    return null
  }
}

/** Grava a síntese do período. */
export function guardarSintese(periodoDias, carga) {
  run(
    'INSERT OR REPLACE INTO app_config (chave, valor) VALUES (?, ?)',
    [chaveSintese(periodoDias), JSON.stringify(carga)],
  )
}

export default { sinteseGuardada, guardarSintese, chaveSintese }
