import { Navigate } from 'react-router'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Route wrapper for authenticated pages.
 * Redirects to login if not authenticated.
 *
 * NOTE: This is a stub implementation. Real authentication check
 * will be implemented in Step 7 (認証フロントエンド).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TODO: Check actual authentication status from auth store
  // For now, allow access for development
  const isAuthenticated = true // true for development

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
