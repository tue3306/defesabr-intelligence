import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Bell } from 'lucide-react'
import { createElement } from 'react'
import { useNewsStore } from '../store/newsStore'

// Fila de alertas demonstrativos que chegam "ao vivo" para simular um feed
// de inteligência em tempo real. Os níveis usam as chaves de enum (sem acento).
const LIVE_FEED = [
  { title: 'Movimentação naval atípica no Atlântico Sul', level: 'ALTO' },
  { title: 'Novo edital de aquisição de blindados publicado', level: 'MEDIO' },
  { title: 'Tentativa de intrusão em rede governamental contida', level: 'CRITICO' },
  { title: 'Exercício conjunto Brasil–Argentina anunciado', level: 'BAIXO' },
  { title: 'Atualização do orçamento de defesa em discussão', level: 'MEDIO' },
  { title: 'Drone não identificado sobre área restrita', level: 'ALTO' },
  { title: 'Acordo de cooperação cibernética assinado', level: 'BAIXO' },
  { title: 'Alerta de desinformação em fontes monitoradas', level: 'MEDIO' },
]

const INTERVAL_MS = 45000 // 45s entre alertas

// Emite notificações periódicas para demonstrar atualização em tempo real.
export function useLiveNotifications() {
  const addNotification = useNewsStore((s) => s.addNotification)
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const item = LIVE_FEED[indexRef.current % LIVE_FEED.length]
      indexRef.current += 1
      addNotification(item)
      toast(item.title, {
        icon: createElement(Bell, { size: 16, className: 'text-brand-400' }),
        duration: 3500,
      })
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [addNotification])
}
