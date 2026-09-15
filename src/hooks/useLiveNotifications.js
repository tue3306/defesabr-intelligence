import { useEffect, useRef, createElement } from 'react'
import toast from 'react-hot-toast'
import { Bell, Landmark, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useNotificationStore } from '../store/notificationStore'

// -----------------------------------------------------------------------------
// NOTIFICAÇÕES AO VIVO
//
// Os avisos nascem no servidor, ao fim de cada coleta. Este hook só mantém a
// lista da conta em dia enquanto a plataforma está aberta: busca ao entrar e a
// cada minuto — uma consulta ao banco, sem ida a fonte externa.
//
// A PRIMEIRA carga só registra o que já existia: abrir a plataforma não pode
// estourar uma pilha de avisos sobre o que chegou ontem. Esses ficam na central,
// com o contador do sino. Da segunda carga em diante, o que for NOVO também
// aparece como aviso na tela — se a pessoa não silenciou em Configurações.
// -----------------------------------------------------------------------------

const INTERVALO_MS = 60 * 1000
const MAX_AVISOS_POR_RODADA = 3

export function useLiveNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)
  const avisosLigados = useSettingsStore((s) => s.notificationsEnabled)
  const carregar = useNotificationStore((s) => s.carregar)
  const limpar = useNotificationStore((s) => s.limpar)

  // Lido por referência para que ligar/desligar os avisos não reinicie a consulta.
  const avisosRef = useRef(avisosLigados)
  avisosRef.current = avisosLigados

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      limpar()
      return undefined
    }

    let vivo = true
    let vistos = null // ids já conhecidos; null = primeira carga ainda não veio

    const consultar = async () => {
      const itens = await carregar()
      if (!vivo || !itens) return

      if (vistos === null) {
        vistos = new Set(itens.map((n) => n.id))
        return
      }

      const novos = itens.filter((n) => !vistos.has(n.id) && !n.read)
      itens.forEach((n) => vistos.add(n.id))
      if (!avisosRef.current) return

      for (const n of novos.slice(0, MAX_AVISOS_POR_RODADA)) {
        const estado = n.kind === 'incidente' && n.title.startsWith('Estado brasileiro')
        const icone = n.kind === 'sistema' ? AlertTriangle : estado ? Landmark : Bell
        toast(n.title, {
          icon: createElement(icone, {
            size: 16,
            className: n.level === 'CRITICO' ? 'text-red-600 dark:text-red-400' : 'text-brand-500 dark:text-brand-300',
          }),
          duration: n.level === 'CRITICO' ? 8000 : 5000,
        })
      }
    }

    consultar()
    const id = setInterval(consultar, INTERVALO_MS)
    return () => { vivo = false; clearInterval(id) }
  }, [isAuthenticated, userId, carregar, limpar])
}

export default useLiveNotifications
