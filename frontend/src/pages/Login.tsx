import { Link } from 'react-router'
import { ShinyButton } from '@/components/ui/shiny-button'
import { MagicCard } from '@/components/ui/magic-card'
import { Logo } from '@/components/common/Logo'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

/**
 * Login page component.
 */
export function Login() {
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
        <MagicCard className="p-6">
          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-input" />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <ShinyButton type="submit" className="w-full">
              Sign in
            </ShinyButton>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="text-primary hover:underline">
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
