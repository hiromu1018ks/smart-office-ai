import { NavLink } from 'react-router'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import * as LucideIcons from 'lucide-react'
import { Logo } from '@/components/common/Logo'

interface MobileSidebarProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Dynamic icon component that renders lucide-react icons by name.
 */
function NavIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
  if (!IconComponent) return null
  return <IconComponent className={className} />
}

/**
 * Mobile sidebar drawer component.
 */
export function MobileSidebar({ open = false, onOpenChange }: MobileSidebarProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 h-full w-64 max-w-none rounded-none border-r p-0 animate-in slide-in-from-left"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Logo />
          <button
            onClick={() => onOpenChange?.(false)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => onOpenChange?.(false)}
              className={({ isActive: isLinkActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isLinkActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <NavIcon iconName={item.icon} className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="rounded-lg bg-accent p-3 text-sm">
            <p className="font-medium">Smart Office AI</p>
            <p className="text-muted-foreground">Version 0.1.0</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
