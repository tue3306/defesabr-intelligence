import { useEffect, useState } from 'react'
import { apiOnline, viaPonte } from '../services/apiBridge'
import { newsVolume14d, newsCategoriesKeys } from '../data/mockData'

// -----------------------------------------------------------------------------
// VOLUME DE NOTÍCIAS POR DIA E CATEGORIA
//
// O gráfico de barras empilhadas da landing, do painel e da apresentação vinha
// de `newsVolume14d` — um array gerado por `Math.random()` em mockData. Era o
// gráfico mais visível do produto e o mais desconectado dele: mostrava
// atividade que nunca existiu, com categorias que ninguém coletou.
//
// Agora o servidor devolve a contagem real por dia e categoria, e este hook a
// põe no formato que o Recharts empilha: uma linha por dia, uma chave por
// categoria.
//
//   [{ date: '02/09', 'Forças Armadas': 3, Fronteiras: 1 }, …]
//
// Se a API estiver fora, devolve a série local e diz isso em `aoVivo`, para a
// tela poder marcar o selo corretamente em vez de apresentar demonstração como
// dado coletado.
// -----------------------------------------------------------------------------

/** Dia ISO (2026-09-02) → rótulo curto do eixo (02/09). */
function rotulo(iso) {
  const [, mes, dia] = String(iso).split('-')
  return dia && mes ? `${dia}/${mes}` : iso
}

export function useNewsVolume(dias = 14) {
  const [estado, setEstado] = useState({
    data: newsVolume14d,
    keys: newsCategoriesKeys,
    aoVivo: false,
    carregando: true,
  })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const d = await viaPonte('GET /news/volume', { days: dias })
        const linhas = d?.porDiaCategoria || []
        if (!vivo || !linhas.length) return

        // Uma linha por dia, com uma coluna por categoria presente naquele dia.
        // As categorias ausentes ficam em zero: o Recharts precisa da chave em
        // todas as linhas, senão a pilha some no meio da série.
        const categorias = [...new Set(linhas.map((l) => l.categoria).filter(Boolean))]
        const porDia = new Map()
        for (const l of linhas) {
          if (!porDia.has(l.dia)) {
            porDia.set(l.dia, Object.fromEntries([['date', rotulo(l.dia)], ...categorias.map((c) => [c, 0])]))
          }
          if (l.categoria) porDia.get(l.dia)[l.categoria] = l.total
        }

        setEstado({
          data: [...porDia.values()],
          keys: categorias,
          aoVivo: true,
          carregando: false,
        })
      } catch {
        // Mantém a série local; `aoVivo` segue falso e a tela marca demonstração.
      } finally {
        if (vivo) setEstado((e) => ({ ...e, carregando: false }))
      }
    })()
    return () => { vivo = false }
  }, [dias])

  return estado
}

export default useNewsVolume
