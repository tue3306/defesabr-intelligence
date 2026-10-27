import { Languages } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { IDIOMAS, useT } from '../../i18n'

/** Botão PT/EN do topo. Alterna entre os dois idiomas com um toque. */
export default function SeletorIdioma({ className = '' }) {
  const t = useT()
  const idioma = useSettingsStore((s) => s.idioma)
  const setIdioma = useSettingsStore((s) => s.setIdioma)
  const proximo = IDIOMAS.find((i) => i.id !== idioma) || IDIOMAS[0]
  const atual = IDIOMAS.find((i) => i.id === idioma) || IDIOMAS[0]
  return (
    <button
      type="button"
      onClick={() => setIdioma(proximo.id)}
      className={`inline-flex items-center gap-1 rounded-lg p-2 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
      aria-label={`${t('Mudar idioma')}: ${proximo.rotulo}`}
      title={`${t('Mudar idioma')}: ${proximo.rotulo}`}
      lang={proximo.id === 'en' ? 'en' : 'pt-BR'}
    >
      <Languages size={18} aria-hidden="true" />
      {atual.curto}
    </button>
  )
}
