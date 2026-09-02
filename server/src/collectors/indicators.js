import { all, get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'

// -----------------------------------------------------------------------------
// INDICADORES — World Bank Open Data e câmbio (AwesomeAPI)
//
// Duas naturezas opostas de dado, e a interface precisa tratá-las diferente:
//
//   World Bank ... publica com DEFASAGEM de um a dois anos. Por isso `period`
//                  guarda o ANO do dado, e não a data da coleta. Exibir o valor
//                  de 2023 como se fosse de hoje seria falso.
//   Câmbio ....... muda ao longo do dia. Aqui o que importa é a HORA da coleta.
// -----------------------------------------------------------------------------

export const INDICADORES_WB = [
  { code: 'MS.MIL.XPND.GD.ZS', label: 'Gasto militar (% do PIB)', unit: '%' },
  { code: 'MS.MIL.XPND.CD', label: 'Gasto militar (US$ correntes)', unit: 'US$' },
  { code: 'MS.MIL.TOTL.P1', label: 'Efetivo das forças armadas', unit: 'pessoas' },
  { code: 'NY.GDP.MKTP.CD', label: 'PIB (US$ correntes)', unit: 'US$' },
]

/** Vizinhos usados na comparação regional — mesma série, mesmo método. */
// Dois recortes, um pedido só à API: a vizinhança para medir o esforço
// regional, e as grandes potências para situar o Brasil no mundo. `grupo`
// separa os dois na resposta — a tela de comparação internacional mostrava a
// primeira lista com dado real e a segunda com números escritos à mão.
export const PAISES_COMPARACAO = [
  { iso: 'BRA', nome: 'Brasil', bandeira: '🇧🇷', grupo: 'ambos' },
  { iso: 'ARG', nome: 'Argentina', bandeira: '🇦🇷', grupo: 'vizinhanca' },
  { iso: 'CHL', nome: 'Chile', bandeira: '🇨🇱', grupo: 'vizinhanca' },
  { iso: 'COL', nome: 'Colômbia', bandeira: '🇨🇴', grupo: 'vizinhanca' },
  { iso: 'PER', nome: 'Peru', bandeira: '🇵🇪', grupo: 'vizinhanca' },
  { iso: 'URY', nome: 'Uruguai', bandeira: '🇺🇾', grupo: 'vizinhanca' },

  { iso: 'USA', nome: 'Estados Unidos', bandeira: '🇺🇸', grupo: 'potencias' },
  { iso: 'CHN', nome: 'China', bandeira: '🇨🇳', grupo: 'potencias' },
  { iso: 'RUS', nome: 'Rússia', bandeira: '🇷🇺', grupo: 'potencias' },
  { iso: 'FRA', nome: 'França', bandeira: '🇫🇷', grupo: 'potencias' },
  { iso: 'GBR', nome: 'Reino Unido', bandeira: '🇬🇧', grupo: 'potencias' },
  { iso: 'DEU', nome: 'Alemanha', bandeira: '🇩🇪', grupo: 'potencias' },
  { iso: 'IND', nome: 'Índia', bandeira: '🇮🇳', grupo: 'potencias' },
]

const ROTULOS = Object.fromEntries(INDICADORES_WB.map((i) => [i.code, i]))
export const rotuloIndicador = (code) => ROTULOS[code] || { label: code, unit: '' }

export async function coletarWorldBank() {
  const inicio = Date.now()
  const paises = PAISES_COMPARACAO.map((p) => p.iso).join(';')
  let gravados = 0
  const falhas = []

  for (const ind of INDICADORES_WB) {
    try {
      // date=2010:ano dá série histórica suficiente para um gráfico com
      // tendência, sem baixar meio século de dados a cada execução.
      const ano = new Date().getUTCFullYear()
      const url = `https://api.worldbank.org/v2/country/${paises}/indicator/${ind.code}`
        + `?format=json&per_page=600&date=2010:${ano}`

      const resposta = await buscarJson(url)
      // O World Bank devolve [metadados, dados]. Se `dados` vier nulo, o
      // indicador existe mas não tem série para esses países.
      const linhas = Array.isArray(resposta) && Array.isArray(resposta[1]) ? resposta[1] : []

      transacao(() => {
        for (const l of linhas) {
          if (l?.value == null) continue   // ano sem dado publicado: não inventa
          run(
            `INSERT INTO indicators (provider, code, country, period, value, unit)
             VALUES ('worldbank', ?, ?, ?, ?, ?)
             ON CONFLICT (provider, code, country, period)
             DO UPDATE SET value = excluded.value,
                           fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
            [ind.code, l.countryiso3code || l.country?.id, String(l.date), Number(l.value), ind.unit]
          )
          gravados += 1
        }
      })
    } catch (err) {
      falhas.push(`${ind.code}: ${String(err?.message || err).slice(0, 80)}`)
    }
  }

  const ok = falhas.length < INDICADORES_WB.length
  return {
    ok,
    gravados,
    indicadores: INDICADORES_WB.length,
    falhas: falhas.length,
    erro: ok ? null : `todas as séries falharam — ${falhas[0] || 'sem detalhe'}`,
    duracaoMs: Date.now() - inicio,
  }
}

export async function coletarCambio() {
  const inicio = Date.now()
  try {
    const dados = await buscarJson('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')
    const pares = [
      ['USD', dados?.USDBRL],
      ['EUR', dados?.EURBRL],
    ]
    let gravados = 0

    transacao(() => {
      for (const [moeda, d] of pares) {
        if (!d?.bid) continue
        // O período aqui é o INSTANTE, não o ano: câmbio de ontem é outro dado,
        // não uma revisão do de hoje.
        run(
          `INSERT INTO indicators (provider, code, country, period, value, unit)
           VALUES ('awesomeapi', ?, 'BRA', ?, ?, 'BRL')
           ON CONFLICT (provider, code, country, period)
           DO UPDATE SET value = excluded.value`,
          [`${moeda}BRL`, new Date().toISOString().slice(0, 13), Number(d.bid)]
        )
        gravados += 1
      }
    })

    return { ok: true, gravados, duracaoMs: Date.now() - inicio }
  } catch (err) {
    return {
      ok: false, gravados: 0,
      erro: String(err?.message || err).slice(0, 180),
      duracaoMs: Date.now() - inicio,
    }
  }
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export const serie = (code, pais = 'BRA') => all(
  `SELECT period, value FROM indicators
   WHERE provider = 'worldbank' AND code = ? AND country = ?
   ORDER BY period ASC`,
  [code, pais]
)

export const ultimoValor = (code, pais = 'BRA') => get(
  `SELECT period, value, unit, fetched_at FROM indicators
   WHERE provider = 'worldbank' AND code = ? AND country = ? AND value IS NOT NULL
   ORDER BY period DESC LIMIT 1`,
  [code, pais]
)

export function ultimoCambio() {
  const pegar = (code) => get(
    `SELECT value, period, fetched_at FROM indicators
     WHERE provider = 'awesomeapi' AND code = ? ORDER BY period DESC LIMIT 1`,
    [code]
  )
  return { usd: pegar('USDBRL') || null, eur: pegar('EURBRL') || null }
}

export default { coletarWorldBank, coletarCambio, serie, ultimoValor, ultimoCambio }
