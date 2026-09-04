import { useEffect, useState } from 'react'
import { viaPonte, apiOnline } from '../services/apiBridge'

// -----------------------------------------------------------------------------
// OS NÚMEROS DA VITRINE, MEDIDOS
//
// A home dizia "clipping diário, análise de cenários, mapas de risco e dados ao
// vivo — para empresas, instituições, pesquisadores e estudantes". É uma frase
// que serve para qualquer produto de qualquer setor, e por isso não serve para
// nenhum: quem lê não descobre o que a plataforma faz nem por que pagaria.
//
// Enquanto isso, a plataforma passou a ter coisas que ninguém mais tem prontas
// — 545 organizações brasileiras com vazamento divulgado desde 2017, o recorte
// dos órgãos públicos atacados, as vulnerabilidades cruzadas com quem ataca o
// Brasil — e nada disso aparecia na primeira dobra.
//
// Este hook busca esses números NA PRÓPRIA API, sem sessão. Todos vêm de
// endpoints públicos que devolvem agregados; nenhum é escrito à mão, e por
// isso nenhum envelhece. Quando a API não responde, cada campo fica `null` e a
// interface mostra ausência — nunca um valor plausível.
// -----------------------------------------------------------------------------

const INICIAL = {
  fontes: null,
  fontesOk: null,
  artigos: null,
  vitimasBr: null,
  vitimasEstado: null,
  gruposContraBrasil: null,
  proposicoes: null,
  paises: null,
  carregando: true,
  aoVivo: false,
}

export function useVitrineReal() {
  const [estado, setEstado] = useState(INICIAL)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return

        // Cinco consultas independentes, em paralelo: serializá-las atrasaria a
        // primeira dobra sem motivo. Cada `.catch` isola a sua — uma fonte fora
        // do ar apaga o seu número, não a vitrine inteira.
        const [fontes, ciber, acervo, legis, paises] = await Promise.all([
          viaPonte('GET /intel/sources/summary', {}).catch(() => null),
          viaPonte('GET /cyber/ransomware', { days: 3650 }).catch(() => null),
          viaPonte('GET /news/volume', { days: 365 }).catch(() => null),
          viaPonte('GET /strategic/legislative', {}).catch(() => null),
          viaPonte('GET /news/countries', { days: 365 }).catch(() => null),
        ])
        if (!vivo) return

        setEstado({
          fontes: fontes?.total ?? null,
          fontesOk: fontes?.ok ?? null,
          artigos: acervo?.filtro?.aprovados ?? null,
          vitimasBr: ciber?.brasil?.totalHistorico ?? null,
          // Sem sessão o painel devolve os agregados e esvazia as listas — por
          // isso o recorte do Estado vem da contagem, não do tamanho do array.
          vitimasEstado: ciber?.brasil?.porCriticidade
            ?.find((c) => c.nivel === 'CRITICO')?.total ?? null,
          // O total, nao o tamanho do ranking: `porGrupo` vem com LIMIT 10.
          gruposContraBrasil: ciber?.brasil?.gruposTotal ?? null,
          proposicoes: legis?.items?.length ?? null,
          paises: paises?.items?.length ?? null,
          carregando: false,
          aoVivo: true,
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

export default useVitrineReal
