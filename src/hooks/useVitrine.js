import { useEffect, useState } from 'react'
import { apiOnline, viaPonte } from '../services/apiBridge'

// -----------------------------------------------------------------------------
// NÚMEROS DA VITRINE
//
// A landing anunciava "8 módulos · 12 países · 5 perspectivas · 7 fontes" — uma
// lista fixa que envelheceu no dia seguinte a ser escrita: as fontes viraram
// 15, os países reconhecidos viraram 36. Números de vitrine que ninguém
// atualiza são a forma mais barata de perder credibilidade, porque qualquer
// visitante confere o primeiro e desconfia do resto da página.
//
// Aqui eles vêm do acervo, no instante em que a página abre. Quando a API não
// responde, cada campo fica `null` e a tela mostra "—" — ausência declarada,
// não número plausível.
// -----------------------------------------------------------------------------

export function useVitrine() {
  const [estado, setEstado] = useState({
    fontes: null,
    fontesOk: null,
    coletados: null,
    aprovados: null,
    proposicoes: null,
    paises: null,
    aoVivo: false,
    carregando: true,
  })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return

        // Quatro consultas em paralelo: são independentes, e serializá-las
        // atrasaria a primeira dobra da landing sem motivo.
        const [fontes, noticias, legis, paises] = await Promise.all([
          viaPonte('GET /intel/sources', {}).catch(() => null),
          viaPonte('GET /news/volume', { days: 365 }).catch(() => null),
          viaPonte('GET /strategic/legislative', {}).catch(() => null),
          viaPonte('GET /news/countries', { days: 365 }).catch(() => null),
        ])
        if (!vivo) return

        const lista = fontes?.items || []
        setEstado({
          fontes: lista.length || null,
          fontesOk: lista.filter((f) => f.last_status === 'ok').length,
          coletados: noticias?.filtro?.coletados ?? null,
          aprovados: noticias?.filtro?.aprovados ?? null,
          proposicoes: legis?.items?.length ?? null,
          paises: paises?.items?.length ?? null,
          aoVivo: true,
          carregando: false,
        })
      } catch {
        // Mantém tudo nulo: a tela já sabe exibir ausência.
      } finally {
        if (vivo) setEstado((e) => ({ ...e, carregando: false }))
      }
    })()
    return () => { vivo = false }
  }, [])

  return estado
}

export default useVitrine
