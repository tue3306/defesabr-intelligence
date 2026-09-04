import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { createElement } from 'react'
import { Bell } from 'lucide-react'
import { useNewsStore } from '../store/newsStore'
import { useAuthStore } from '../store/authStore'
import { viaPonte, apiOnline } from '../services/apiBridge'

// -----------------------------------------------------------------------------
// NOTIFICAÇÕES DO QUE REALMENTE CHEGOU
//
// Este arquivo era uma lista de treze alertas escritos à mão que um
// `setInterval` disparava a cada 45 segundos, em rodízio: "Drone não
// identificado sobre área restrita", "Tentativa de intrusão em rede
// governamental contida", "Movimentação naval atípica no Atlântico Sul".
//
// Era a coisa mais perigosa do produto. Um gráfico com número inventado é uma
// afirmação discutível; um ALERTA inventado é um acontecimento — quem o vê
// surgir na tela conclui que algo aconteceu agora, e não tem como saber que
// não aconteceu. Numa apresentação, o alerta cairia na tela na frente de quem
// avalia, com nível "CRÍTICO", sobre um fato que nunca existiu.
//
// O que entra no lugar é modesto e verdadeiro: o servidor coleta a cada 30
// minutos, e este hook pergunta periodicamente se apareceu matéria nova de
// urgência ALTA ou CRÍTICA. Se apareceu, notifica com o título real e o link
// para a fonte. Se não apareceu — o caso comum — a tela fica quieta.
//
// Silêncio é a resposta certa quando não há novidade. A versão anterior nunca
// ficava quieta, e era exatamente esse o problema.
// -----------------------------------------------------------------------------

const INTERVALO_MS = 5 * 60 * 1000 // 5 min: a coleta roda a cada 30
const URGENCIAS_QUE_NOTIFICAM = new Set(['ALTO', 'CRITICO', 'CRÍTICO'])

export function useLiveNotifications() {
  const addNotification = useNewsStore((s) => s.addNotification)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Guids já anunciados. Sem isto, cada consulta reanunciaria as mesmas
  // matérias e o resultado seria o mesmo teatro de antes, com dado real.
  const jaVistos = useRef(new Set())
  const primeiraVez = useRef(true)

  useEffect(() => {
    if (!isAuthenticated) return
    let vivo = true

    const consultar = async () => {
      try {
        if (!(await apiOnline())) return

        // Duas origens, e a segunda é a que justifica este hook existir.
        //
        // Notícia de urgência alta é útil, mas chega depois — o jornalismo
        // publica quando já aconteceu. Um vazamento de órgão público aparece
        // no site do grupo de extorsão dias antes, e é o tipo de coisa que
        // alguém precisa saber no dia, não na semana seguinte.
        const [d, alertas] = await Promise.all([
          viaPonte('GET /news', { days: 2, limit: 30 }),
          viaPonte('GET /cyber/alertas', { hours: 48 }).catch(() => null),
        ])
        if (!vivo) return

        const doAcervo = (d?.items || []).filter(
          (n) => URGENCIAS_QUE_NOTIFICAM.has(String(n.urgency || '').toUpperCase())
        ).map((n) => ({
          chave: n.id ?? n.guid ?? n.title,
          title: n.title,
          level: String(n.urgency).toUpperCase() === 'CRITICO' ? 'CRITICO' : 'ALTO',
          url: n.url,
          source: n.source,
        }))

        const doCiber = (alertas?.items || []).map((v) => ({
          chave: `rw-${v.external_id}`,
          title: `Ransomware — ${v.victim}`,
          level: 'CRITICO',
          source: `${v.group} · ${v.criticality_reason}`,
        }))

        const novos = [...doCiber, ...doAcervo].filter((n) => !jaVistos.current.has(n.chave))
        novos.forEach((n) => jaVistos.current.add(n.chave))

        // A primeira consulta apenas MEMORIZA o que já estava no acervo. Sem
        // isso, abrir a plataforma dispararia uma saraivada de avisos sobre
        // matérias de ontem, como se tivessem acabado de chegar.
        if (primeiraVez.current) { primeiraVez.current = false; return }

        // No máximo três por rodada: se a coleta trouxer quinze de uma vez, o
        // usuário não precisa de quinze torradas empilhadas.
        for (const n of novos.slice(0, 3)) {
          addNotification({ title: n.title, level: n.level, url: n.url, source: n.source })
          toast(n.title, {
            icon: createElement(Bell, { size: 16, className: 'text-brand-400 dark:text-brand-300' }),
            duration: 5000,
          })
        }
      } catch {
        // API fora do ar não é motivo para avisar nada: a ausência de
        // notificação já é a informação correta.
      }
    }

    consultar()
    const id = setInterval(consultar, INTERVALO_MS)
    return () => { vivo = false; clearInterval(id) }
  }, [addNotification, isAuthenticated])
}

export default useLiveNotifications
