import { useEffect, useState } from 'react'
import { apiOnline, viaPonte } from '../services/apiBridge'
import {
  militarySpendingBR, southAmericaSpending, militaryPctGdpComparison,
  categoryRadar, alertIndex, activeRegions,
} from '../data/mockData'

// -----------------------------------------------------------------------------
// SÉRIES REAIS PARA OS GRÁFICOS
//
// O servidor já coletava do World Bank e do próprio acervo tudo o que estes
// gráficos mostram — e as telas continuavam lendo arrays escritos à mão em
// `mockData.js`. Gasto militar, comparação sul-americana, distribuição por
// categoria e índice de alerta: os quatro tinham dado real disponível e
// exibiam número inventado.
//
// Cada hook aqui faz a mesma coisa: pede à API, converte para o formato que o
// componente de gráfico já consome, e devolve `aoVivo` dizendo qual das duas
// origens está em tela. Nenhum gráfico precisou ser reescrito.
//
// Quando a API está fora, cai no acervo local — a tela nunca quebra, e o selo
// para de dizer "ao vivo".
// -----------------------------------------------------------------------------

/** Executa `fn` uma vez, só se a API responder. Padrão comum aos hooks abaixo. */
function useDaApi(fn, deps = []) {
  const [estado, setEstado] = useState({ dados: null, aoVivo: false, carregando: true })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const r = await fn()
        if (vivo && r != null) setEstado({ dados: r, aoVivo: true, carregando: false })
      } catch {
        // Silêncio proposital: o chamador já tem o acervo local como padrão.
      } finally {
        if (vivo) setEstado((e) => ({ ...e, carregando: false }))
      }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return estado
}

/**
 * Gasto militar do Brasil, série histórica do World Bank.
 *
 * O gráfico tem três modos: `usd`, `pctGdp` e `dual`. O modo `dual` sobrepõe
 * gasto em REAIS com percentual do PIB — e o World Bank não publica em reais.
 * Converter os dólares de 2010 pelo câmbio de hoje produziria uma série
 * historicamente falsa (o dólar saiu de R$ 1,76 para mais de R$ 5 no período),
 * então `brl` fica ausente e as telas que usavam `dual` passam a `usd`.
 * Perde-se uma curva; ganha-se uma série que corresponde ao mundo.
 */
export function useGastoMilitar() {
  const { dados, aoVivo, carregando } = useDaApi(async () => {
    const d = await viaPonte('GET /economy/indicators', {})
    const porCodigo = Object.fromEntries((d?.indicators || []).map((i) => [i.code, i]))
    const usd = porCodigo['MS.MIL.XPND.CD']?.series || []
    const pib = porCodigo['MS.MIL.XPND.GD.ZS']?.series || []
    if (!usd.length && !pib.length) return null

    const pctPorAno = Object.fromEntries(pib.map((p) => [String(p.period), p.value]))
    const linhas = usd
      .map((p) => ({
        year: Number(p.period),
        // O World Bank publica em dólares correntes; o eixo do gráfico é em bilhões.
        usd: p.value == null ? null : Math.round((p.value / 1e9) * 10) / 10,
        pctGdp: pctPorAno[String(p.period)] == null
          ? null
          : Math.round(pctPorAno[String(p.period)] * 100) / 100,
      }))
      .filter((l) => Number.isFinite(l.year))
      .sort((a, b) => a.year - b.year)

    return linhas.length ? linhas : null
  })

  return { data: dados || militarySpendingBR, aoVivo, carregando }
}

/**
 * Gasto em defesa como % do PIB, World Bank.
 *
 * `grupo` escolhe o recorte: `vizinhanca` para os sul-americanos, `potencias`
 * para as maiores forças do mundo. O Brasil entra nos dois — é a referência
 * dos dois gráficos, e o servidor o marca como `ambos`.
 */
export function useComparacaoPIB(grupo = 'vizinhanca') {
  const { dados, aoVivo, carregando } = useDaApi(async () => {
    const d = await viaPonte('GET /economy/comparison', {})
    const itens = (d?.items || [])
      .filter((i) => i.value != null)
      .filter((i) => !i.grupo || i.grupo === grupo || i.grupo === 'ambos')
      .map((i) => ({
        country: i.country,
        // O gráfico destaca por código de duas letras; a API usa ISO-3.
        code: ISO3_PARA_ISO2[i.code] || i.code,
        pctGdp: Math.round(i.value * 100) / 100,
        period: i.period,
      }))
      .sort((a, b) => b.pctGdp - a.pctGdp)
    return itens.length > 1 ? itens : null
  }, [grupo])

  return {
    data: dados || (grupo === 'potencias' ? militaryPctGdpComparison : southAmericaSpending),
    aoVivo,
    carregando,
  }
}

/** Atalho para o recorte da vizinhança, que é o uso mais comum. */
export const useComparacaoSulAmericana = () => useComparacaoPIB('vizinhanca')

const ISO3_PARA_ISO2 = {
  BRA: 'BR', ARG: 'AR', CHL: 'CL', COL: 'CO', PER: 'PE',
  URY: 'UY', BOL: 'BO', ECU: 'EC', PRY: 'PY', VEN: 'VE',
}

/**
 * Distribuição por categoria — período atual contra o anterior.
 *
 * O radar comparava "semana atual" e "semana anterior" com números fixos.
 * Aqui as duas séries saem do acervo: conta-se a janela recente e a janela
 * imediatamente anterior, para o gráfico mostrar movimento real de pauta.
 */
export function useRadarCategorias(dias = 30) {
  const { dados, aoVivo, carregando } = useDaApi(async () => {
    const [atual, dobro] = await Promise.all([
      viaPonte('GET /news/volume', { days: dias }),
      viaPonte('GET /news/volume', { days: dias * 2 }),
    ])
    const catAtual = Object.fromEntries((atual?.porCategoria || []).map((c) => [c.nome, c.total]))
    const catDobro = Object.fromEntries((dobro?.porCategoria || []).map((c) => [c.nome, c.total]))
    const categorias = [...new Set([...Object.keys(catAtual), ...Object.keys(catDobro)])].filter(Boolean)
    if (!categorias.length) return null

    return categorias.map((c) => ({
      category: c,
      atual: catAtual[c] || 0,
      // O período anterior é a diferença entre a janela dupla e a recente.
      anterior: Math.max(0, (catDobro[c] || 0) - (catAtual[c] || 0)),
    }))
  }, [dias])

  return { data: dados || categoryRadar, aoVivo, carregando }
}

/**
 * Regiões estratégicas — quantas notícias do acervo citam cada uma.
 *
 * A tabela dizia "Eventos de segurança registrados no período" com 128, 96, 74
 * — números que não vinham de lugar nenhum e, pior, chamados de EVENTOS. Um
 * evento de segurança é um acontecimento; o que o servidor sabe contar é
 * MENÇÃO em notícia. São coisas diferentes, e a diferença importa: dez
 * matérias sobre a mesma operação são dez menções e um evento.
 *
 * O rótulo muda junto com o dado.
 */
export function useRegioesEstrategicas(dias = 180) {
  const { dados, aoVivo, carregando } = useDaApi(async () => {
    const d = await viaPonte('GET /news/geo', { days: dias })
    const regs = (d?.regioes || []).filter((r) => r.total > 0)
    if (!regs.length) return null

    const soma = regs.reduce((a, r) => a + r.total, 0) || 1
    return regs.map((r) => ({
      region: r.nome,
      events: r.total,
      share: Math.round((r.total / soma) * 100),
      // Tendência exigiria comparar duas janelas e guardar histórico por
      // região. Sem isso, fica neutra em vez de receber uma seta decorativa.
      trend: 'flat',
    }))
  }, [dias])

  return { data: dados || activeRegions, aoVivo, carregando }
}

/**
 * Índice de alerta do período.
 *
 * Era a constante `alertIndex = 42`. O servidor calcula isto de verdade em
 * `nivelDeAlerta()`: média ponderada das urgências das notícias do período,
 * com o método declarado junto do número. Um índice sem método é um número que
 * ninguém pode contestar, e portanto não vale nada.
 */
export function useIndiceDeAlerta(dias = 7) {
  const { dados, aoVivo, carregando } = useDaApi(async () => {
    const d = await viaPonte('GET /clipping/latest', { days: dias })
    const a = d?.alert || d?.alerta
    return a?.score == null ? null : { score: a.score, level: a.level, basis: a.basis }
  }, [dias])

  return {
    value: dados?.score ?? alertIndex,
    level: dados?.level ?? null,
    basis: dados?.basis ?? null,
    aoVivo,
    carregando,
  }
}
