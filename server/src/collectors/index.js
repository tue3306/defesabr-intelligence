import { all, get, run, insert, agora } from '../db/index.js'
import config from '../config.js'
import { coletarTodas, coletarFonte, semearFontes } from './rss.js'
import { coletarCamara, enriquecerSituacoes } from './camara.js'
import { coletarWorldBank } from './indicators.js'
import { coletarAgregadores } from './newsapi.js'
import { coletarComex } from './comex.js'
import { coletarBcb } from './bcb.js'

// -----------------------------------------------------------------------------
// ORQUESTRAÇÃO DA COLETA
//
// Cada execução é REGISTRADA em `collector_runs`, com duração, itens novos e
// erro. Esse histórico é o que permite ao painel de status responder "isto
// funciona?" com evidência, em vez de com uma bolinha verde decorativa que
// alguém desenhou uma vez.
// -----------------------------------------------------------------------------

/** Envolve um coletor para que o resultado vire linha no histórico. */
async function registrar(nome, fn, gatilho = 'agendado') {
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
  run(
    `INSERT INTO collector_runs
       (collector, started_at, finished_at, duration_ms, ok, items_found, items_new, error, trigger)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nome, inicioIso, agora(), duracao,
      resultado.ok === false ? 0 : 1,
      resultado.encontrados ?? resultado.gravados ?? 0,
      resultado.novos ?? resultado.gravados ?? 0,
      resultado.erro || null,
      gatilho,
    ]
  )
  aparar(nome)

  return { coletor: nome, duracaoMs: duracao, ...resultado }
}

// Quantas execuções guardar POR COLETOR.
//
// Sem teto, `collector_runs` cresce para sempre: seis coletores a cada 30
// minutos são 288 linhas por dia, ~105 mil por ano. Num Railway sem volume
// isso se resolve sozinho porque o disco é efêmero — mas o README recomenda
// montar um volume justamente para o acervo persistir, e aí a tabela cresce
// com ele. O painel de auditoria mostra as últimas dezenas; o resto é peso.
//
// 300 por coletor cobrem ~6 dias de agendador a cada 30 min, que é folga
// suficiente para investigar qualquer falha depois do fim de semana.
const EXECUCOES_POR_COLETOR = 300

/** Apara o histórico, preservando as execuções recentes de cada coletor. */
function aparar(nome) {
  run(
    `DELETE FROM collector_runs
      WHERE collector = ?
        AND id NOT IN (
          SELECT id FROM collector_runs WHERE collector = ?
          ORDER BY id DESC LIMIT ?
        )`,
    [nome, nome, EXECUCOES_POR_COLETOR]
  )
}

/** Ciclo completo. Devolve o que cada coletor fez. */
export async function coletarTudo(gatilho = 'agendado') {
  const inicio = Date.now()

  // Em paralelo porque são serviços independentes: uma API lenta não deve
  // atrasar as outras.
  //
  // Eram SEIS promessas e QUATRO variáveis. `comex` e `bcb` rodavam, gravavam
  // no banco e entravam no histórico de execuções — mas seus resultados caíam
  // no chão, porque a desestruturação parava na quarta posição. O efeito: a
  // resposta de POST /system/collect e o resumo de boot não mencionavam dois
  // dos seis coletores, e quem lesse a resposta concluiria que eles não
  // rodaram. A coleta funcionava; o relatório dela é que mentia por omissão.
  const [noticias, legislativo, indicadores, comex, bcb, agregadores] = await Promise.all([
    registrar('rss', coletarTodas, gatilho),
    registrar('camara', coletarCamara, gatilho),
    registrar('worldbank', coletarWorldBank, gatilho),
    registrar('comex', coletarComex, gatilho),
    registrar('bcb', coletarBcb, gatilho),
    registrar('agregadores', coletarAgregadores, gatilho),
  ])

  // Depois, e só se a Câmara respondeu: enriquecer exige uma requisição por
  // proposição, então roda em lote pequeno e fora do caminho crítico.
  let situacoes = { atualizadas: 0, pendentes: 0 }
  if (legislativo.ok !== false) {
    try {
      situacoes = await enriquecerSituacoes(12)
    } catch { /* melhor sem situação do que sem coleta */ }
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENDADOR
// ─────────────────────────────────────────────────────────────────────────────
let temporizador = null
let emAndamento = false
let ultimaExecucao = null
let proximaExecucao = null

/**
 * `setInterval` em vez de node-cron: uma dependência a menos para um intervalo
 * fixo. Cron faria sentido se o horário importasse ("toda terça às 8h"), o que
 * não é o caso — o que importa é a frequência.
 */
export function iniciarAgendador() {
  const minutos = config.coleta.intervaloMinutos
  if (!minutos) return { ativo: false, motivo: 'COLLECT_INTERVAL_MINUTES=0' }

  const intervalo = minutos * 60_000

  const ciclo = async () => {
    // A trava evita sobreposição: se uma coleta demorar mais que o intervalo,
    // a próxima esperaria a atual em vez de rodar em cima dela.
    if (emAndamento) return
    emAndamento = true
    try {
      ultimaExecucao = await coletarTudo('agendado')
    } catch (err) {
      console.error('[coleta] ciclo falhou:', err?.message || err)
    } finally {
      emAndamento = false
      proximaExecucao = new Date(Date.now() + intervalo).toISOString()
    }
  }

  temporizador = setInterval(ciclo, intervalo)
  // `unref` permite ao processo encerrar sem esperar o temporizador — sem isso,
  // Ctrl+C ficaria pendurado até o próximo ciclo.
  temporizador.unref?.()
  proximaExecucao = new Date(Date.now() + intervalo).toISOString()

  return { ativo: true, intervaloMinutos: minutos, proximaExecucao }
}

export function pararAgendador() {
  if (temporizador) clearInterval(temporizador)
  temporizador = null
  proximaExecucao = null
}

/** Coleta sob demanda, com a mesma trava do agendador. */
export async function coletarAgora(gatilho = 'manual') {
  if (emAndamento) {
    return { jaEmAndamento: true, mensagem: 'Já existe uma coleta em andamento.' }
  }
  emAndamento = true
  try {
    ultimaExecucao = await coletarTudo(gatilho)
    return ultimaExecucao
  } finally {
    emAndamento = false
  }
}

export const estadoDoAgendador = () => ({
  ativo: !!temporizador,
  emAndamento,
  intervaloMinutos: config.coleta.intervaloMinutos,
  proximaExecucao,
  ultimaExecucao: ultimaExecucao?.concluidoEm || null,
})

export { semearFontes, coletarFonte, coletarTodas }
export default { coletarTudo, coletarAgora, iniciarAgendador, pararAgendador, estadoDoAgendador }
