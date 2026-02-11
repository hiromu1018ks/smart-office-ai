import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ShinyButton } from '@/components/ui/shiny-button'
import { MagicCard } from '@/components/ui/magic-card'
import { Logo } from '@/components/common/Logo'
import { useAuthStore } from '@/stores/authStore'
import { isTOTPRequiredError } from '@/lib/api'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

/**
 * Login page component.
 *
 * Handles user authentication with email/password and optional TOTP.
 * Displays error messages and loading states from auth store.
 */
export function Login() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // Check if TOTP is required (based on error message)
  const isTotpRequired = error != null && isTOTPRequiredError(error)

  /**
   * Handle form submission.
   * Validates input and calls auth store login action.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Clear any previous errors
    clearError()

    // Call login with credentials
    try {
      await login({
        email,
        password,
        totp_code: isTotpRequired ? totpCode || undefined : undefined,
      })

      // Clear sensitive form data immediately after login attempt
      setPassword('')
      setTotpCode('')

      // Navigate to dashboard on successful login
      navigate('/')
    } catch {
      // Error is handled by auth store
      // Clear password on failure too
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <Logo className="justify-center" iconClassName="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to {APP_NAME} to continue
          </p>
        </div>

        {/* Login Form */}
        <MagicCard className="p-6" data-testid="login-form">
          {/* Error Display */}
          {error && (
            <div
              role="alert"
              data-testid="login-error"
              className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} data-testid="login-form-element">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                data-testid="login-email"
                placeholder="name@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                data-testid="login-password"
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* TOTP Input (shown when required) */}
            {isTotpRequired && (
              <div className="space-y-2">
                <label htmlFor="totp" className="text-sm font-medium">
                  Two-Factor Authentication
                </label>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <input
                  id="totp"
                  type="password"
                  name="totp"
                  data-testid="login-totp"
                  placeholder="123456"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={totpCode}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '')
                    setTotpCode(value)
                  }}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                data-testid="login-forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <ShinyButton
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="login-submit"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </ShinyButton>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" data-testid="login-signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </MagicCard>

        {/* App Info */}
        <p className="text-center text-xs text-muted-foreground">
          {APP_DESCRIPTION}
        </p>
      </div>
    </div>
  )
}
