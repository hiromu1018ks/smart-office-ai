import { Bell, Menu } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { SearchBar } from '@/components/common/SearchBar'
import { UserMenu } from '@/components/common/UserMenu'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  onMobileMenuClick?: () => void
  showMobileMenuButton?: boolean
}

/**
 * Application header component.
 * Contains logo, search bar, theme toggle, notifications, and user menu.
 */
export function Header({
  className,
  onMobileMenuClick,
  showMobileMenuButton = false,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6',
        className
      )}
    >
      {showMobileMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      )}

      <Logo />

      <div className="ml-auto flex items-center gap-2">
        <SearchBar className="hidden lg:flex" />

        <div className="flex items-center gap-1">
          <AnimatedThemeToggler />

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
            <span className="absolute right-1 top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </Button>

          <UserMenu
            user={{
              name: 'Demo User',
              email: 'demo@example.com',
            }}
          />
        </div>
      </div>
    </header>
  )
}
