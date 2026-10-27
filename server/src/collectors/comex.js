import { run, get, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'

// -----------------------------------------------------------------------------
// EXPORTAÇÕES DA INDÚSTRIA DE DEFESA — Comex Stat (MDIC)
//
// A tela de Indústria & Exportações mostrava números escritos à mão. O governo
// publica o dado real: o Comex Stat expõe toda a balança comercial brasileira
// por capítulo da NCM, país e período.
//
// Dois capítulos interessam a defesa:
//
//   88  Aeronaves e aparelhos espaciais, e suas partes
//   93  Armas e munições; suas partes e acessórios
//
// A ressalva é importante e viaja com o dado: o capítulo 88 inclui aviação
// CIVIL. A maior parte do que o Brasil exporta ali são jatos comerciais da
// Embraer, não caças. Chamar isso de "exportação de defesa" seria inflar o
// número em uma ordem de grandeza — a interface diz o que está somando.
// -----------------------------------------------------------------------------

const URL = 'https://api-comexstat.mdic.gov.br/general'

export const CAPITULOS_DEFESA = [
  { codigo: 88, nome: 'Aeronaves e partes', nota: 'Inclui aviação civil — a maior parte é Embraer comercial.' },
  { codigo: 93, nome: 'Armas e munições', nota: 'Uso militar e civil (caça, tiro esportivo).' },
]

/**
 * Coleta exportações dos capítulos de defesa, por país e ano.
 *
 * O Comex Stat responde a POST com um corpo JSON descrevendo a consulta. Não
 * há chave de API nem cota declarada; a resposta traz o período de referência,
 * que gravamos junto para a tela poder dizer até quando o dado vai.
 */
export async function coletarComex() {
  const inicio = Date.now()
  const ano = new Date().getUTCFullYear()

  // O MDIC publica UMA VEZ POR MÊS. Buscar a cada ciclo, como as demais
  // fontes, não traz nada novo e rende HTTP 429 — foi o que aconteceu em
  // teste, e o efeito é a tela de Indústria ficar vazia até a próxima janela.
  //
  // Se já há dado recente no banco, a coleta é pulada. Educação com quem
  // publica de graça, e menos uma forma de o painel ficar sem número.
  const recente = (await get(
    `SELECT COUNT(*) AS n FROM indicators
     WHERE provider = 'comexstat'
       AND fetched_at >= iso_agora('-12 hours')`,
  ))?.n ?? 0

  if (recente > 0) {
    return {
      coletor: 'comex',
      ok: true,
      // `encontrados` é "itens que a FONTE devolveu", e aqui a fonte nem foi
      // consultada. Mandar a contagem do acervo fazia a trilha de auditoria
      // registrar "536 encontrados" para uma execução sem requisição alguma —
      // numa tela cuja função declarada é ser conferível.
      encontrados: 0,
      novos: 0,
      pulado: true,
      jaNoAcervo: recente,
      motivo: 'dado do Comex Stat tem menos de 12 horas; a fonte publica mensalmente',
      duracaoMs: Date.now() - inicio,
    }
  }

  try {
    const corpo = {
      flow: 'export',
      monthDetail: false,
      // Três anos dão tendência sem baixar a série inteira a cada execução.
      period: { from: `${ano - 2}-01`, to: `${ano}-12` },
      filters: [{ filter: 'chapter', values: CAPITULOS_DEFESA.map((c) => c.codigo) }],
      details: ['chapter', 'country'],
      metrics: ['metricFOB'],
    }

    // Uma segunda tentativa, depois de uma pausa, quando a fonte limita ou
    // oscila. Duas tentativas resolvem o transitório sem virar insistência.
    let resposta
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        resposta = await buscarJson(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
          // O fetcher passou a repetir falha transitória por conta própria.
          // Aqui isso viraria repetição dupla — quatro chamadas ao Comex, que
          // já responde 429 com facilidade. Este laço trata o caso com espera
          // de 3s, mais adequada, e por isso fica no comando.
          tentativas: 1,
        })
        break
      } catch (err) {
        const limitado = /429|50[0-9]/.test(String(err?.message || ''))
        if (tentativa === 2 || !limitado) throw err
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    const linhas = resposta?.data?.list || []
    if (!linhas.length) {
      return { coletor: 'comex', ok: false, erro: 'Comex Stat devolveu lista vazia', duracaoMs: Date.now() - inicio }
    }

    let gravados = 0
    await transacao(async () => {
      for (const l of linhas) {
        const valor = Number(l.metricFOB)
        if (!Number.isFinite(valor) || valor <= 0) continue
        await run(
          `INSERT INTO indicators (provider, code, country, period, value, unit)
           VALUES ('comexstat', ?, ?, ?, ?, 'US$ FOB')
           ON CONFLICT (provider, code, country, period)
           DO UPDATE SET value = excluded.value,
                         fetched_at = iso_agora()`,
          // O código guarda o capítulo; o "país" aqui é o DESTINO da exportação.
          [`NCM-${l.chapterCode}`, String(l.country || '').trim(), String(l.year), valor]
        )
        gravados += 1
      }
    })

    return {
      coletor: 'comex',
      ok: true,
      encontrados: linhas.length,
      gravados,
      novos: gravados,
      duracaoMs: Date.now() - inicio,
    }
  } catch (err) {
    // 5xx é a API do MDIC fora do ar — em out/2026 o Comex Stat inteiro entrou
    // em manutenção (503 em todos os endpoints, o site redirecionando para
    // comexstat_manutencao.html). A tela de Indústria ficava vazia por isso.
    const foraDoAr = err?.status >= 500
    const motivoComex = foraDoAr
      ? `Comex Stat (MDIC) fora do ar: HTTP ${err.status}`
      : String(err?.message || err).slice(0, 120)

    // Fonte reserva: os mesmos números, reportados pelo Brasil à ONU.
    try {
      const reserva = await coletarComtrade()
      return {
        coletor: 'comex',
        ok: true,
        encontrados: reserva.gravados,
        gravados: reserva.gravados,
        novos: reserva.gravados,
        fonte: 'UN Comtrade',
        nota: `${motivoComex}; exportações anuais (${reserva.anos.join(', ')}) vieram da UN Comtrade.`,
        duracaoMs: Date.now() - inicio,
      }
    } catch (errReserva) {
      return {
        coletor: 'comex',
        ok: false,
        erro: `${motivoComex}. Fonte reserva (UN Comtrade) também falhou: `
          + `${String(errReserva?.message || errReserva).slice(0, 80)}. Nova tentativa no próximo ciclo.`,
        duracaoMs: Date.now() - inicio,
      }
    }
  }
}

// -----------------------------------------------------------------------------
// FONTE RESERVA — UN Comtrade (ONU)
//
// O Brasil reporta a sua balança comercial à ONU, e a UN Comtrade publica os
// mesmos totais do Comex Stat com um atraso: só ANOS FECHADOS, sem o mês
// corrente. Os capítulos são os mesmos — os dois primeiros dígitos da NCM são
// o capítulo do Sistema Harmonizado, a classificação que a ONU usa.
//
// O acesso `public/v1/preview` dispensa chave e devolve até 500 linhas: os
// dois capítulos por país num ano são ~190. A soma por país bate com o total
// "Mundo" (partnerCode 0), que fica de fora para não contar em dobro.
//
// Gravado com provider 'comtrade', separado do Comex Stat: a rota prefere o
// Comex quando ele tem dado e diz na tela de qual fonte o número veio.
// -----------------------------------------------------------------------------

const COMTRADE = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS'
const COMTRADE_PAISES = 'https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json'

const nomesPt = new Intl.DisplayNames(['pt-BR'], { type: 'region' })

/** Código numérico da ONU → nome do país em português (ou o nome da ONU). */
async function nomesDosParceiros() {
  const ref = await buscarJson(COMTRADE_PAISES)
  const mapa = new Map()
  for (const p of ref?.results || []) {
    let nome = p.text
    if (/^[A-Z]{2}$/.test(p.PartnerCodeIsoAlpha2 || '')) {
      try { nome = nomesPt.of(p.PartnerCodeIsoAlpha2) || nome } catch { /* fica o da ONU */ }
    }
    mapa.set(Number(p.id), nome)
  }
  return mapa
}

export async function coletarComtrade() {
  const ano = new Date().getUTCFullYear()
  const parceiros = await nomesDosParceiros()
  const linhasPorAno = []

  // Três anos fechados, do mais recente para trás. O ano anterior pode ainda
  // não estar publicado no começo do ano: vazio não é erro, é o atraso da ONU.
  for (const periodo of [ano - 1, ano - 2, ano - 3]) {
    const r = await buscarJson(
      `${COMTRADE}?reporterCode=76&period=${periodo}&flowCode=X&cmdCode=${CAPITULOS_DEFESA.map((c) => c.codigo).join(',')}`,
    )
    const linhas = (r?.data || []).filter((l) => l.partnerCode !== 0 && Number(l.primaryValue) > 0)
    if (linhas.length) linhasPorAno.push({ periodo, linhas })
    // O acesso público limita a taxa; uma pausa curta entre os anos basta.
    await new Promise((p) => setTimeout(p, 1500))
  }
  if (!linhasPorAno.length) throw new Error('UN Comtrade sem dado para os últimos três anos')

  let gravados = 0
  await transacao(async () => {
    for (const { periodo, linhas } of linhasPorAno) {
      for (const l of linhas) {
        await run(
          `INSERT INTO indicators (provider, code, country, period, value, unit)
           VALUES ('comtrade', ?, ?, ?, ?, 'US$ FOB')
           ON CONFLICT (provider, code, country, period)
           DO UPDATE SET value = excluded.value,
                         fetched_at = iso_agora()`,
          [`NCM-${l.cmdCode}`, parceiros.get(Number(l.partnerCode)) || `Parceiro ${l.partnerCode}`, String(periodo), Number(l.primaryValue)],
        )
        gravados += 1
      }
    }
  })
  return { gravados, anos: linhasPorAno.map((a) => a.periodo) }
}

export default { coletarComex, coletarComtrade, CAPITULOS_DEFESA }
