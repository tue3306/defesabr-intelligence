import { useEffect } from 'react'
import { useSettingsStore, applyTheme } from '../store/settingsStore'

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)

  // Aplica o tema sempre que mudar
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
