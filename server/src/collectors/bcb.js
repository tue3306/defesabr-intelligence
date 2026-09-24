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

// `frequencia` diz de quanto em quanto tempo o BANCO CENTRAL publica um valor
// novo — não de quanto em quanto tempo a plataforma consulta. A tela usa isso
// para escrever "diário" ou "mensal" ao lado do número, em vez de um selo
// "ao vivo" que valia igual para o dólar de ontem e para a inflação de agosto.
//
// `acumuladoNoMes` marca as séries cujo valor do mês corrente é PARCIAL: a
// Selic acumulada em 23 de setembro soma 16 dias úteis, não 21. Comparada com
// o mês cheio anterior, ela "cai" todo mês até o fim do mês — uma queda que
// não aconteceu.
export const SERIES_BCB = [
  // O SGS recusa mais de 20 valores por chamada nas séries diárias — pedir 30
  // devolve HTTP 400 com a explicação no corpo, não uma lista truncada.
  { codigo: 1, id: 'usd', label: 'Dólar (venda)', unidade: 'R$', ultimos: 20, frequencia: 'diaria',
    descricao: 'Cotação de venda do dólar comercial pela PTAX — a taxa oficial de referência, calculada pelo Banco Central a cada dia útil.' },
  { codigo: 433, id: 'ipca', label: 'IPCA — variação mensal', unidade: '%', ultimos: 13, frequencia: 'mensal',
    descricao: 'Inflação oficial do Brasil no mês, medida pelo IBGE. Negativo quer dizer que os preços caíram.' },
  { codigo: 4390, id: 'selic', label: 'Selic — acumulada no mês', unidade: '%', ultimos: 13, frequencia: 'mensal',
    acumuladoNoMes: true,
    descricao: 'Quanto a taxa básica de juros rendeu dentro de cada mês. O mês corrente ainda está incompleto.' },
  { codigo: 189, id: 'igpm', label: 'IGP-M — variação mensal', unidade: '%', ultimos: 13, frequencia: 'mensal',
    descricao: 'Índice de preços da FGV, usado para reajustar aluguéis e contratos.' },
  // Euro acrescentado com o widget de câmbio: ele exibia USD e EUR vindos
  // da AwesomeAPI pelo NAVEGADOR, com queda para cotação escrita à mão. O
  // dólar já vinha daqui; o euro faltava, e sem ele a linha do EUR ficaria
  // vazia para sempre. Série 21619 do SGS, conferida ao vivo.
  { codigo: 21619, id: 'eur', label: 'Euro (venda)', unidade: 'R$', ultimos: 20, frequencia: 'diaria',
    descricao: 'Cotação de venda do euro pela PTAX — a taxa oficial de referência, calculada pelo Banco Central a cada dia útil.' },
  // ── Acrescentadas em setembro de 2026, conferidas contra a API do SGS ──
  //
  // A "Selic (mês)" era o único juro da tela, e é justamente o que ninguém
  // conhece: o número que sai no jornal é a META do Copom, em % ao ano.
  // `desde` troca "os últimos N valores" por "de N dias atrás até hoje": os
  // últimos 20 valores da 432 são TODOS do futuro (ver a nota em coletarBcb).
  { codigo: 432, id: 'selicMeta', label: 'Selic — meta do Copom', unidade: '% a.a.', desde: 400,
    frequencia: 'diaria', degrau: true,
    descricao: 'A taxa básica de juros definida pelo Copom, em % ao ano. Muda só nas reuniões do comitê.' },
  { codigo: 4189, id: 'selicAno', label: 'Selic — efetiva no mês, anualizada', unidade: '% a.a.', ultimos: 13,
    frequencia: 'mensal', acumuladoNoMes: true,
    descricao: 'A Selic que de fato vigorou em cada mês, convertida para % ao ano.' },
  { codigo: 13522, id: 'ipca12', label: 'IPCA — acumulado em 12 meses', unidade: '%', ultimos: 13,
    frequencia: 'mensal',
    descricao: 'Inflação dos últimos doze meses somados — o número comparado com a meta de inflação.' },
  { codigo: 13621, id: 'reservas', label: 'Reservas internacionais', unidade: 'US$ mi', ultimos: 20,
    frequencia: 'diaria',
    descricao: 'Dólares e outros ativos em moeda forte guardados pelo Banco Central, em milhões de US$.' },
]

const dataBr = (d) => d.toISOString().slice(0, 10).split('-').reverse().join('/')

const url = (s) => {
  if (s.desde) {
    const hoje = new Date()
    const inicio = new Date(hoje.getTime() - s.desde * 86_400_000)
    return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.codigo}/dados`
      + `?formato=json&dataInicial=${dataBr(inicio)}&dataFinal=${dataBr(hoje)}`
  }
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.codigo}/dados/ultimos/${s.ultimos}?formato=json`
}

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
      const linhas = await buscarJson(url(s))
      if (!Array.isArray(linhas) || !linhas.length) {
        falhas.push(`${s.id}: série vazia`)
        continue
      }

      // A meta da Selic (432) vem PREENCHIDA ATÉ A PRÓXIMA REUNIÃO do Copom:
      // em setembro a API já devolve 2, 3 e 4 de novembro, repetindo a taxa
      // vigente. Gravar isso faria "o último valor" ser uma data do futuro.
      const hoje = new Date().toISOString().slice(0, 10)

      transacao(() => {
        for (const l of linhas) {
          const valor = Number(String(l.valor).replace(',', '.'))
          if (!Number.isFinite(valor)) continue
          if (paraIso(l.data) > hoje) continue
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
