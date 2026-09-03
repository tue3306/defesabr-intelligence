import { run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'

// -----------------------------------------------------------------------------
// INDICADORES DO BANCO CENTRAL — API SGS
//
// A tela de Economia mostrava IPCA, Selic e câmbio escritos à mão em
// `economyData.js`. O Banco Central publica todos, atualizados diariamente,
// numa API aberta e sem chave.
//
// A vantagem sobre o World Bank aqui é a ATUALIDADE: o World Bank publica com
// um a dois anos de defasagem — bom para série histórica, inútil para dizer a
// que taxa o dólar fechou hoje. O SGS entrega o dado do dia.
//
// Os códigos são os do próprio SGS. Ficam explícitos porque um número solto
// como "433" não diz nada a quem lê o código depois.
// -----------------------------------------------------------------------------

export const SERIES_BCB = [
  // O SGS recusa mais de 20 valores por chamada nas séries diárias — pedir 30
  // devolve HTTP 400 com a explicação no corpo, não uma lista truncada.
  { codigo: 1, id: 'usd', label: 'Dólar (venda)', unidade: 'R$', ultimos: 20 },
  { codigo: 433, id: 'ipca', label: 'IPCA — variação mensal', unidade: '%', ultimos: 13 },
  { codigo: 4390, id: 'selic', label: 'Selic — taxa mensal', unidade: '%', ultimos: 13 },
  { codigo: 189, id: 'igpm', label: 'IGP-M — variação mensal', unidade: '%', ultimos: 13 },
  // Euro acrescentado com o widget de câmbio: ele exibia USD e EUR vindos
  // da AwesomeAPI pelo NAVEGADOR, com queda para cotação escrita à mão. O
  // dólar já vinha daqui; o euro faltava, e sem ele a linha do EUR ficaria
  // vazia para sempre. Série 21619 do SGS, conferida ao vivo.
  { codigo: 21619, id: 'eur', label: 'Euro (venda)', unidade: 'R$', ultimos: 20 },
]

const url = (codigo, n) =>
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${n}?formato=json`

/**
 * Data brasileira (dd/mm/aaaa) → ISO (aaaa-mm-dd).
 *
 * O SGS devolve no formato brasileiro. Guardar assim faria a ordenação por
 * período comparar "01/12/2025" com "02/01/2026" como texto e concluir que
 * dezembro vem depois de janeiro.
 */
function paraIso(br) {
  const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(br || '')
}

export async function coletarBcb() {
  const inicio = Date.now()
  let gravados = 0
  const falhas = []

  for (const s of SERIES_BCB) {
    try {
      const linhas = await buscarJson(url(s.codigo, s.ultimos))
      if (!Array.isArray(linhas) || !linhas.length) {
        falhas.push(`${s.id}: série vazia`)
        continue
      }

      transacao(() => {
        for (const l of linhas) {
          const valor = Number(String(l.valor).replace(',', '.'))
          if (!Number.isFinite(valor)) continue
          run(
            `INSERT INTO indicators (provider, code, country, period, value, unit)
             VALUES ('bcb', ?, 'BRA', ?, ?, ?)
             ON CONFLICT (provider, code, country, period)
             DO UPDATE SET value = excluded.value,
                           fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
            [s.id, paraIso(l.data), valor, s.unidade]
          )
          gravados += 1
        }
      })
    } catch (err) {
      falhas.push(`${s.id}: ${String(err?.message || err).slice(0, 80)}`)
    }
  }

  return {
    coletor: 'bcb',
    // Uma série que falha não derruba a coleta: as outras três seguem valendo,
    // e o erro fica registrado para o painel de saúde mostrar.
    ok: gravados > 0,
    encontrados: gravados,
    gravados,
    novos: gravados,
    erro: falhas.length ? falhas.join(' · ').slice(0, 200) : null,
    duracaoMs: Date.now() - inicio,
  }
}

export default { coletarBcb, SERIES_BCB }
