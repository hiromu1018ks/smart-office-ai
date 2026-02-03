import { useEffect } from 'react'
import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Route wrapper for authenticated pages.
 * Redirects to login if not authenticated.
 *
 * Checks authentication status on mount and shows loading state
 * while verifying the token.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  // Check authentication on mount (only once)
  useEffect(() => {
    checkAuth()
    // checkAuth is stable from Zustand store, only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render protected content
  return <>{children}</>
}
