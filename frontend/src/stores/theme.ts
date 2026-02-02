import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  getResolvedTheme: () => 'light' | 'dark'
}

/**
 * Theme store for managing light/dark mode state.
 * Persists to localStorage with key 'soai-theme'.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark mode for office apps
      setTheme: (theme: Theme) => set({ theme }),
      getResolvedTheme: (): 'light' | 'dark' => {
        const { theme } = get()
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        }
        // theme is 'light' | 'dark' here (not 'system')
        return theme
      },
    }),
    {
      name: 'soai-theme',
      // Only persist theme, not getResolvedTheme (computed function)
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
