import { run, get, agora } from '../db/index.js'
import config from '../config.js'
import { coletarTodas, coletarFonte, semearFontes } from './rss.js'
import { coletarCamara, enriquecerSituacoes } from './camara.js'
import { coletarWorldBank } from './indicators.js'
import { coletarAgregadores } from './newsapi.js'
import { coletarRansomware } from './ransomware.js'
import { coletarAtores } from './atores.js'
import { coletarComex } from './comex.js'
import { coletarBcb } from './bcb.js'
import { calcularCorrelacoes } from './correlacoes.js'
import { derivarGeografia } from './geografia.js'
import { gerarNotificacoes } from '../lib/notificacoes.js'
import { tomarArrendamento, liberarArrendamento, arrendamentoTomado } from '../lib/arrendamento.js'

// -----------------------------------------------------------------------------
// ORQUESTRAÇÃO DA COLETA
//
// Cada execução é REGISTRADA em `collector_runs`, com duração, itens novos e
// erro. Esse histórico é o que permite ao painel de status responder "isto
// funciona?" com evidência, em vez de com uma bolinha verde decorativa que
// alguém desenhou uma vez.
// -----------------------------------------------------------------------------

// ─────────────────────────────────────────────────────────────────────────────
// CADÊNCIA POR COLETOR
//
// O ciclo roda a cada `COLLECT_INTERVAL_MINUTES` (15 por padrão), que é a
// frequência certa para notícia. Não é para o resto: a Câmara não muda de
// quarto em quarto de hora, o Banco Central publica série diária e o World
// Bank, anual. Rodar todos a cada ciclo só multiplicaria chamadas a serviços
// públicos que não têm nada novo — e cotas gratuitas (GNews: 100/dia) acabariam.
//
// Cada coletor tem um espaçamento mínimo desde a última execução BEM-SUCEDIDA.
// Execução que falhou não conta: a próxima tentativa vem no ciclo seguinte.
// Coleta disparada à mão, na primeira subida ou pela linha de comando ignora a
// cadência — quem pede agora quer agora.
// ─────────────────────────────────────────────────────────────────────────────
export const CADENCIA_MINUTOS = {
  rss: 0,            // a cada ciclo
  ransomware: 30,    // cota da API; vítimas novas aparecem em horas, não minutos
  agregadores: 60,   // GNews 100 req/dia, NewsData 200 créditos/dia
  camara: 60,
  bcb: 60,
  worldbank: 24 * 60,
  comex: 12 * 60,    // o próprio coletor também pula dado com menos de 12 h
  atores: 30,        // renova só perfis com mais de 24 h, em lotes
  geografia: 0,      // derivação local, sem rede
  correlacoes: 0,    // derivação local, sem rede
}

const GATILHOS_SEM_CADENCIA = new Set(['manual', 'primeira-execucao', 'cli'])

/** A última execução bem-sucedida deste coletor é recente demais? */
export async function cedoDemais(nome, gatilho) {
  const minutos = CADENCIA_MINUTOS[nome] || 0
  if (!minutos || GATILHOS_SEM_CADENCIA.has(gatilho)) return false
  const ultima = await get(
    `SELECT finished_at FROM collector_runs
      WHERE collector = ? AND ok = 1 AND finished_at >= iso_agora(?)
      ORDER BY id DESC LIMIT 1`,
    // 1 minuto de folga: um ciclo de 15 que terminou em 29:40 não deve pular o de 30.
    [nome, `-${minutos - 1} minutes`],
  )
  return !!ultima
}

/** Envolve um coletor para que o resultado vire linha no histórico. */
export async function registrar(nome, fn, gatilho = 'agendado') {
  if (await cedoDemais(nome, gatilho)) {
    return { coletor: nome, ok: true, pulado: true, motivo: `cadência de ${CADENCIA_MINUTOS[nome]} min` }
  }
  const inicio = Date.now()
  const inicioIso = agora()
  let resultado

  try {
    resultado = await fn()
  } catch (err) {
    // Um coletor NUNCA deve derrubar o ciclo: se o World Bank cair, a coleta
    // de notícias precisa continuar.
    resultado = { ok: false, erro: String(err?.message || err).slice(0, 200) }
  }

  const duracao = Date.now() - inicio

  // Coletor opcional sem chave não executou nada: registrá-lo como "Coleta
  // concluída — 0 item(ns)" a cada ciclo enchia a trilha de auditoria com
  // execuções que não aconteceram.
  if (resultado?.ignorado) return { coletor: nome, duracaoMs: duracao, ...resultado }

  await run(
    `INSERT INTO collector_runs
       (collector, started_at, finished_at, duration_ms, ok, items_found, items_new, error, trigger)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nome, inicioIso, agora(), duracao,
      // `ok` PRECISA ser explícito. Enquanto a regra foi `=== false ? 0 : 1`,
      // qualquer coletor que esquecesse o campo era gravado como sucesso —
      // e foi assim que a falha de TODAS as fontes de notícia entrou na
      // trilha de auditoria como execução boa. Otimismo por omissão não cabe
      // num painel cuja função é ser conferível: quem não declara que deu
      // certo, não deu.
      resultado.ok === true ? 1 : 0,
      resultado.encontrados ?? resultado.gravados ?? 0,
      resultado.novos ?? resultado.gravados ?? 0,
      resultado.erro || null,
      gatilho,
    ]
  )
  await aparar(nome)

  return { coletor: nome, duracaoMs: duracao, ...resultado }
}

// Quantas execuções guardar POR COLETOR.
//
// Sem teto, `collector_runs` cresce para sempre. O painel de auditoria mostra
// as últimas dezenas; o resto é peso.
//
// 700 por coletor cobrem ~7 dias do coletor mais frequente (a cada 15 min),
// folga suficiente para investigar uma falha depois do fim de semana.
const EXECUCOES_POR_COLETOR = 700

/** Apara o histórico, preservando as execuções recentes de cada coletor. */
async function aparar(nome) {
  await run(
    `DELETE FROM collector_runs
      WHERE collector = ?
        AND id NOT IN (
          SELECT id FROM collector_runs WHERE collector = ?
          ORDER BY id DESC LIMIT ?
        )`,
    [nome, nome, EXECUCOES_POR_COLETOR]
  )
}

/**
 * Ciclo completo. Devolve o que cada coletor fez.
 *
 * `somente` restringe o ciclo a um grupo de coletores (pelos nomes de
 * `CADENCIA_MINUTOS`): quem está fora da lista devolve `pulado` e NÃO entra no
 * histórico de execuções — não rodou, então não há o que registrar. A ordem de
 * dependência abaixo é a mesma com ou sem filtro.
 */
export async function coletarTudo(gatilho = 'agendado', { somente } = {}) {
  const inicio = Date.now()
  const grupo = Array.isArray(somente) ? new Set(somente) : null
  const rodar = (nome, fn) => (grupo && !grupo.has(nome)
    ? Promise.resolve({ coletor: nome, ok: true, pulado: true, motivo: 'fora do grupo' })
    : registrar(nome, fn, gatilho))

  // Em paralelo porque são serviços independentes: uma API lenta não deve
  // atrasar as outras.
  //
  // Eram SEIS promessas e QUATRO variáveis. `comex` e `bcb` rodavam, gravavam
  // no banco e entravam no histórico de execuções — mas seus resultados caíam
  // no chão, porque a desestruturação parava na quarta posição. O efeito: a
  // resposta de POST /system/collect e o resumo de boot não mencionavam dois
  // dos seis coletores, e quem lesse a resposta concluiria que eles não
  // rodaram. A coleta funcionava; o relatório dela é que mentia por omissão.
  // ── COLETORES INDEPENDENTES, EM PARALELO ──
  //
  // Cada um busca de um servico diferente e nao depende de nenhum outro.
  const [noticias, legislativo, indicadores, comex, bcb, agregadores, ransomware] = await Promise.all([
    rodar('rss', coletarTodas),
    rodar('camara', coletarCamara),
    rodar('worldbank', coletarWorldBank),
    rodar('comex', coletarComex),
    rodar('bcb', coletarBcb),
    rodar('agregadores', coletarAgregadores),
    rodar('ransomware', coletarRansomware),
  ])

  // ── DEPOIS, O QUE DEPENDE DO QUE ACABOU DE ENTRAR ──
  //
  // `coletarAtores` decide QUAIS grupos buscar lendo as vitimas brasileiras do
  // banco. Rodando em paralelo com `coletarRansomware`, ele consultava a tabela
  // ANTES de ela ser preenchida — e numa partida a frio, quando o banco nasce
  // vazio, achava zero grupos e terminava em 47ms sem gravar nada.
  //
  // O efeito em producao: o disco do Railway e efemero, entao toda publicacao
  // recria o banco; a tela de Grupos ficava sem perfil ate o ciclo seguinte,
  // meia hora depois. A causa nao era o tamanho do lote — era a ordem.
  //
  // A dependencia agora esta expressa na estrutura: quem depende de dado
  // recem-inserido roda depois de quem o insere. Custa alguns segundos a mais
  // de coleta e elimina a corrida.
  const atores = await rodar('atores', coletarAtores)

  // ── PAÍSES E TEATROS DO QUE ACABOU DE ENTRAR ──
  //
  // Depende de `rss` e `agregadores`, que gravam os artigos: rodando junto
  // deles no `Promise.all`, a derivação acharia o acervo de antes da coleta e
  // os artigos novos ficariam sem país até o ciclo seguinte — no mapa, a
  // matéria mais recente seria justamente a que não aparece. Roda antes de
  // `correlacoes` para o ciclo terminar com as duas derivações sobre o mesmo
  // acervo.
  const geografia = await rodar('geografia', derivarGeografia)

  // ── POR ULTIMO, O QUE DEPENDE DE TODOS ──
  //
  // A correlacao cruza artigos com vitimas e com perfis de ator. Precisa dos
  // tres ja gravados, entao roda depois de todos — inclusive depois de
  // `atores`, que e quem traz os perfis.
  //
  // Nao busca nada fora: e derivacao pura sobre o que acabou de entrar. Por
  // isso nao tem tratamento de rede nem retentativa, e por isso e barato o
  // suficiente para rodar a cada ciclo.
  const correlacoes = await rodar('correlacoes', calcularCorrelacoes)

  // Depois, e só se a Câmara respondeu: enriquecer exige uma requisição por
  // proposição, então roda em lote pequeno e fora do caminho crítico.
  let situacoes = { atualizadas: 0, pendentes: 0 }
  if (legislativo.ok !== false && !legislativo.pulado) {
    try {
      situacoes = await enriquecerSituacoes(12)
    } catch { /* melhor sem situação do que sem coleta */ }
  }

  // Por último, os avisos: dependem das matérias e dos incidentes que acabaram
  // de entrar. Falha aqui não pode derrubar o resultado da coleta.
  let notificacoes = { criadas: 0 }
  try {
    notificacoes = await gerarNotificacoes({ noticias, legislativo, indicadores, comex, bcb, agregadores, ransomware, atores, geografia, correlacoes })
  } catch (err) {
    console.error('[coleta] notificações falharam:', err?.message || err)
  }

  return {
    gatilho,
    duracaoMs: Date.now() - inicio,
    concluidoEm: agora(),
    noticias,
    legislativo: { ...legislativo, situacoesAtualizadas: situacoes.atualizadas },
    indicadores,
    // `cambio` saiu: o BCB entrega dólar e euro, e a AwesomeAPI recusava o IP
    // do Railway. A chave permanece no retorno apontando para o BCB, para não
    // quebrar quem já lia `r.cambio`.
    cambio: bcb,
    comex,
    bcb,
    agregadores,
    ransomware,
    atores,
    geografia,
    correlacoes,
    notificacoes,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENDADOR
// ─────────────────────────────────────────────────────────────────────────────
let temporizador = null
let ativo = false
let ultimaExecucao = null
let proximaExecucao = null

/**
 * Temporizador encadeado: o próximo ciclo é agendado quando o atual TERMINA.
 *
 * Com `setInterval` o relógio contava do início, então uma coleta de 3 minutos
 * deixava só 12 até a seguinte e "próxima coleta" na tela mostrava o horário
 * errado. Encadeado, o intervalo é sempre entre o fim de um e o começo do outro,
 * e não há como dois ciclos do agendador se sobreporem. O arrendamento em banco
 * (`iniciarColeta`) vale para a coleta disparada à mão ou pelo pg_cron no meio
 * de um ciclo, inclusive vinda de outra instância.
 */
export function iniciarAgendador() {
  const minutos = config.coleta.intervaloMinutos
  if (!minutos) return { ativo: false, motivo: 'COLLECT_INTERVAL_MINUTES=0' }
  if (ativo) return { ativo: true, intervaloMinutos: minutos, proximaExecucao }

  const intervalo = minutos * 60_000
  ativo = true

  const agendar = () => {
    if (!ativo) return
    proximaExecucao = new Date(Date.now() + intervalo).toISOString()
    temporizador = setTimeout(ciclo, intervalo)
    // `unref` permite ao processo encerrar sem esperar o temporizador.
    temporizador.unref?.()
  }

  const ciclo = async () => {
    temporizador = null
    try {
      const coleta = await iniciarColeta('agendado')
      if (coleta) await coleta.concluido
    } catch (err) {
      console.error('[coleta] ciclo falhou:', err?.message || err)
    }
    agendar()
  }

  agendar()
  return { ativo: true, intervaloMinutos: minutos, proximaExecucao }
}

export function pararAgendador() {
  ativo = false
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
  proximaExecucao = null
}

// Validade do arrendamento da coleta. Folga sobre o ciclo medido (59 s a frio)
// e abaixo do intervalo do cron: se a função morrer sem liberar, o próximo
// ciclo retoma sozinho em vez de ficar trancado.
const VALIDADE_COLETA_MS = 360_000

/**
 * Toma o arrendamento `'coleta'` e inicia o ciclo.
 *
 * Devolve `null` se outro ciclo detém o arrendamento; senão `{ concluido }`, com
 * a promessa do ciclo. É um objeto, e não a promessa direta, porque uma função
 * `async` achata promessas: devolver a promessa do ciclo faria `await
 * iniciarColeta()` esperar o ciclo inteiro, e a rota do cron precisa responder
 * 202 antes disso.
 *
 * O arrendamento é liberado no `finally`, mesmo se o ciclo lançar; falha ao
 * liberar é registrada e não derruba o resultado (o vencimento cobre o resto).
 * `ciclo` existe para teste.
 */
export async function iniciarColeta(gatilho, { somente, ciclo = coletarTudo } = {}) {
  const token = await tomarArrendamento('coleta', VALIDADE_COLETA_MS)
  if (!token) return null
  const concluido = (async () => {
    try {
      ultimaExecucao = await ciclo(gatilho, { somente })
      return ultimaExecucao
    } finally {
      await liberarArrendamento('coleta', token).catch((err) => {
        console.error('[coleta] falha ao liberar o arrendamento:', err?.message || err)
      })
    }
  })()
  return { concluido }
}

/** Coleta sob demanda, com o mesmo arrendamento do agendador e do cron. */
export async function coletarAgora(gatilho = 'manual') {
  const coleta = await iniciarColeta(gatilho)
  if (!coleta) {
    return { jaEmAndamento: true, mensagem: 'Já existe uma coleta em andamento.' }
  }
  return coleta.concluido
}

/** `emAndamento` reflete o arrendamento no banco: vale entre instâncias. */
export const estadoDoAgendador = async () => ({
  ativo,
  emAndamento: await arrendamentoTomado('coleta'),
  intervaloMinutos: config.coleta.intervaloMinutos,
  proximaExecucao,
  ultimaExecucao: ultimaExecucao?.concluidoEm || null,
})

export { semearFontes, coletarFonte, coletarTodas }
export default { coletarTudo, coletarAgora, iniciarColeta, iniciarAgendador, pararAgendador, estadoDoAgendador }
