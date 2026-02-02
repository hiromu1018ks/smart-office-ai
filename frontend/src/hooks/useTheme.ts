import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme'

/**
 * Custom hook for managing theme.
 * Automatically applies theme classes to document element.
 *
 * @returns Object containing theme, resolvedTheme, and setTheme function
 */
export function useTheme() {
  const { theme, setTheme, getResolvedTheme } = useThemeStore()
  const resolvedTheme = getResolvedTheme()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  return {
    theme,
    setTheme,
    resolvedTheme,
  }
}
