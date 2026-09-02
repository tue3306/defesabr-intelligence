import { run, transacao, agora } from '../db/index.js'
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

    const resposta = await buscarJson(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })

    const linhas = resposta?.data?.list || []
    if (!linhas.length) {
      return { coletor: 'comex', ok: false, erro: 'Comex Stat devolveu lista vazia', duracaoMs: Date.now() - inicio }
    }

    let gravados = 0
    transacao(() => {
      for (const l of linhas) {
        const valor = Number(l.metricFOB)
        if (!Number.isFinite(valor) || valor <= 0) continue
        run(
          `INSERT INTO indicators (provider, code, country, period, value, unit)
           VALUES ('comexstat', ?, ?, ?, ?, 'US$ FOB')
           ON CONFLICT (provider, code, country, period)
           DO UPDATE SET value = excluded.value,
                         fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
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
    return {
      coletor: 'comex',
      ok: false,
      erro: String(err?.message || err).slice(0, 200),
      duracaoMs: Date.now() - inicio,
    }
  }
}

export default { coletarComex, CAPITULOS_DEFESA }
