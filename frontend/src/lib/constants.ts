/**
 * Navigation configuration for the application.
 */
export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/chat', label: 'Chat', icon: 'message-square' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/tasks', label: 'Tasks', icon: 'check-square' },
  { href: '/files', label: 'Files', icon: 'folder' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

/**
 * Application metadata.
 */
export const APP_NAME = 'Smart Office AI'
export const APP_DESCRIPTION = 'AI-powered office suite for self-hosting'

/**
 * Theme storage key for localStorage.
 */
export const THEME_STORAGE_KEY = 'soai-theme'

/**
 * Responsive breakpoints.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const
