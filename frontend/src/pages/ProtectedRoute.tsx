import { useEffect, useState, useRef } from 'react'
import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

// Storage key must match api.ts
const TOKEN_STORAGE_KEY = 'soai-token'

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
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const isCheckingRef = useRef(false)

  // Check authentication on mount (only once)
  useEffect(() => {
    const checkAuthOnMount = async () => {
      // Prevent duplicate calls
      if (isCheckingRef.current) {
        return
      }

      isCheckingRef.current = true
      try {
        await checkAuth()
      } finally {
        setHasCheckedAuth(true)
        isCheckingRef.current = false
      }
    }

    // Only run if we haven't checked yet
    if (!hasCheckedAuth && !isCheckingRef.current) {
      checkAuthOnMount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if we have a token in localStorage (for initial load)
  const hasTokenInStorage = typeof window !== 'undefined' &&
    !!localStorage.getItem(TOKEN_STORAGE_KEY)

  // Simplified loading condition:
  // - Show loading while store is checking auth
  // - OR if we have a token but haven't verified it yet (prevents flash of login)
  const shouldShowLoading = isLoading || (hasTokenInStorage && !hasCheckedAuth)

  if (shouldShowLoading) {
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
