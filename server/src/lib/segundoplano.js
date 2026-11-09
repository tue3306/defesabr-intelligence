// -----------------------------------------------------------------------------
// TRABALHO DEPOIS DA RESPOSTA
//
// Duas coisas acontecem depois de a resposta sair: o ciclo de coleta disparado
// por `POST /api/cron/ciclo` (25–60 s) e o estorno da vaga do limitador de
// tentativas, no evento `finish`.
//
// No deploy serverless isso era um problema: a instância era congelada logo
// depois da resposta e o trabalho pendente morria no meio, então era preciso
// uma função da plataforma para segurá-la viva até a promessa terminar.
//
// No Railway o processo é LONGO — um contêiner que fica de pé entre
// requisições. A promessa simplesmente continua, e a única coisa que ainda
// precisa de cuidado é a rejeição: desde o Node 15, promessa rejeitada sem
// `catch` derruba o processo. É só isso que esta função faz, e é por isso que
// ela existe em vez de um `void promessa` espalhado pelo código.
// -----------------------------------------------------------------------------

/**
 * Deixa `promessa` terminar por conta própria, sem prender a resposta, e
 * garante que uma rejeição nunca fique sem dono.
 * @param {Promise<unknown>} promessa
 */
export function emSegundoPlano(promessa) {
  Promise.resolve(promessa).catch((err) => {
    console.error('[segundo-plano] falhou:', err?.message || err)
  })
}

export default emSegundoPlano
