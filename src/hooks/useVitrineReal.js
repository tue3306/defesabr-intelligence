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
//
// ─────────────────────────────────────────────────────────────────────────────
// ESTE MÓDULO ABSORVEU O `useVitrine`, QUE PEDIA AS MESMAS COISAS DE NOVO
//
// Havia dois hooks de vitrine, e a página inicial montava OS DOIS. Cada um
// disparava `/intel/sources/summary`, `/news/volume?days=365`,
// `/strategic/legislative` e `/news/countries?days=365`. Medido no navegador:
// quatro consultas repetidas em toda visita — e duas delas não são baratas, já
// que o Radar avalia a regra de domínio sobre cada proposição coletada e o mapa
// roda o detector de países sobre o acervo inteiro da janela.
//
// O desperdício de rede era o menor dos problemas. O grave é que a mesma tela
// passava a ter DUAS fontes de verdade para o mesmo número: a seção "O que já
// está monitorado agora" lia de um hook e a primeira dobra lia do outro, com
// tratamentos de ausência diferentes (`|| null` contra `?? null`, que discordam
// quando a contagem é zero). Dois números que deviam ser o mesmo podiam
// aparecer diferentes na mesma página, e nada na tela explicaria por quê.
//
// A faixa de indicadores (`Ticker`) era o caso mais caro: ela vive no layout,
// monta em TODA página, e pedia as quatro consultas para exibir UM número.
// Agora usa `useAcervoAprovado`, que pede só a que interessa.
//
// E a memória curta abaixo fecha o resto: dois componentes que peçam o mesmo
// agregado no mesmo minuto compartilham uma requisição só — a mesma técnica que
// `apiOnline()` já usa para a sonda de saúde.
// ─────────────────────────────────────────────────────────────────────────────
// -----------------------------------------------------------------------------

/**
 * Memória curta compartilhada entre componentes.
 *
 * 60 segundos: a coleta roda a cada 15 minutos, então nada aqui muda dentro de
 * um minuto — e é tempo suficiente para que tudo o que monta na mesma pintura
 * divida uma requisição em vez de abrir a sua.
 */
const TTL_MS = 60_000
const memoria = new Map()

function memoizar(chave, buscar) {
  const reg = memoria.get(chave)
  if (reg?.em && Date.now() - reg.em < TTL_MS) return Promise.resolve(reg.valor)
  if (reg?.emVoo) return reg.emVoo

  const emVoo = buscar()
    .then((valor) => {
      memoria.set(chave, { em: Date.now(), valor })
      return valor
    })
    .catch(() => {
      // Falha não vira cache: a próxima montagem tenta de novo. Devolve `null`
      // para a tela mostrar ausência em vez de derrubar a vitrine inteira.
      memoria.delete(chave)
      return null
    })

  memoria.set(chave, { em: 0, emVoo })
  return emVoo
}

const agregados = {
  fontes: () => memoizar('fontes', () => viaPonte('GET /intel/sources/summary', {})),
  acervo: () => memoizar('acervo', () => viaPonte('GET /news/volume', { days: 365 })),
  ciber: () => memoizar('ciber', () => viaPonte('GET /cyber/ransomware', { days: 3650 })),
  legis: () => memoizar('legis', () => viaPonte('GET /strategic/legislative', {})),
  // O ESCOPO ENTRA NA CHAVE. `/news/countries?escopo=mundo` conta o acervo que
  // fala do mundo inteiro, não só o que passou no filtro de defesa do Brasil —
  // é outra resposta para a mesma janela. Com a chave antiga (`paises:90`), o
  // mapa da área Mundo e o do Mapa estratégico se serviriam um do outro por um
  // minuto, e o número de um país mudaria de tela para tela sem motivo. No
  // escopo `brasil` o parâmetro nem viaja: a consulta é a mesma de antes.
  paises: (dias = 365, escopo = 'brasil') => memoizar(
    `paises:${escopo}:${dias}`,
    () => viaPonte('GET /news/countries', { days: dias, escopo: escopo === 'brasil' ? undefined : escopo }),
  ),
}

/**
 * Cobertura por país, pela mesma memória curta da vitrine.
 *
 * O mapa-múndi da página inicial pedia `/news/countries?days=365` por conta
 * própria, ao lado da vitrine, que pedia a mesma coisa — duas varreduras do
 * detector de países sobre o acervo inteiro para pintar uma tela só. A janela
 * entra na chave porque o mapa alterna entre 90 dias e 1 ano; o escopo, porque
 * a área Mundo & Conflitos pede a contagem do acervo mundial.
 */
export const coberturaPorPais = (dias = 365, escopo = 'brasil') => agregados.paises(dias, escopo)

const INICIAL = {
  fontes: null,
  fontesOk: null,
  artigos: null,
  coletados: null,
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
        // primeira dobra sem motivo. Cada uma isola a sua falha dentro da
        // memória compartilhada — uma fonte fora do ar apaga o seu número, não
        // a vitrine inteira.
        const [fontes, ciber, acervo, legis, paises] = await Promise.all([
          agregados.fontes(), agregados.ciber(), agregados.acervo(),
          agregados.legis(), agregados.paises(),
        ])
        if (!vivo) return

        setEstado({
          fontes: fontes?.total ?? null,
          fontesOk: fontes?.ok ?? null,
          artigos: acervo?.filtro?.aprovados ?? null,
          // Quantas passaram pelo filtro, de quantas entraram. As duas juntas
          // são o que a vitrine afirma ("333 de 786 coletadas"); separá-las em
          // dois hooks foi o que criou duas verdades para o mesmo número.
          coletados: acervo?.filtro?.coletados ?? null,
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

/**
 * Só quantas matérias o filtro aprovou nos últimos 12 meses.
 *
 * Para quem precisa de UM número e não da vitrine inteira — a faixa de
 * indicadores, que monta em toda página. Uma consulta, compartilhada com a
 * vitrine quando as duas estão na mesma tela.
 */
export function useAcervoAprovado() {
  const [estado, setEstado] = useState({ aprovados: null, coletados: null, carregando: true })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        if (!(await apiOnline())) return
        const acervo = await agregados.acervo()
        if (!vivo) return
        setEstado({
          aprovados: acervo?.filtro?.aprovados ?? null,
          coletados: acervo?.filtro?.coletados ?? null,
          carregando: false,
        })
      } finally {
        if (vivo) setEstado((e) => ({ ...e, carregando: false }))
      }
    })()
    return () => { vivo = false }
  }, [])

  return estado
}

export default useVitrineReal
