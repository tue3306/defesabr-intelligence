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

/**
 * Um resumo por CONTA, período e dia — `ia_sintese:5:7:2026-09-10`.
 *
 * A conta entra na chave porque a chave de API é dela. O cache era por
 * instalação, e nesse desenho a primeira pessoa a pedir a síntese pagava a
 * leitura de todas as outras — sem saber, e sem que ninguém pudesse notar.
 *
 * Compartilhar o cache economizaria chamadas, e é exatamente por isso que não
 * serve: a economia sairia da fatura de alguém que não escolheu pagá-la.
 */
export const chaveSintese = (periodoDias, userId = 0) =>
  `ia_sintese:${userId || 0}:${periodoDias}:${new Date().toISOString().slice(0, 10)}`

/**
 * A síntese guardada do período, ou `null`.
 *
 * Nunca lança: um cache ilegível é ausência de cache, não erro de página. O
 * banco pode não estar migrado no primeiro boot, e o JSON pode ter sido
 * gravado por uma versão anterior com outro formato.
 */
export function sinteseGuardada(periodoDias, userId = 0) {
  try {
    const linha = get('SELECT valor FROM app_config WHERE chave = ?', [chaveSintese(periodoDias, userId)])
    return linha ? JSON.parse(linha.valor) : null
  } catch {
    return null
  }
}

/** Grava a síntese do período. */
export function guardarSintese(periodoDias, carga, userId = 0) {
  run(
    'INSERT OR REPLACE INTO app_config (chave, valor) VALUES (?, ?)',
    [chaveSintese(periodoDias, userId), JSON.stringify(carga)],
  )
}

export default { sinteseGuardada, guardarSintese, chaveSintese }
