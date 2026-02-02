import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import * as LucideIcons from 'lucide-react'
import { Logo } from '@/components/common/Logo'

interface SidebarProps {
  className?: string
  collapsed?: boolean
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
 * Desktop navigation sidebar component.
 */
export function Sidebar({ className, collapsed = false }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:bg-muted/40',
        collapsed && 'md:w-16',
        className
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Logo showText={!collapsed} />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive: isLinkActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isLinkActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <NavIcon iconName={item.icon} className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className={cn(
          'rounded-lg bg-accent p-3 text-sm',
          collapsed && 'hidden'
        )}>
          <p className="font-medium">Pro Tip</p>
          <p className="text-muted-foreground">Use keyboard shortcuts to navigate faster.</p>
        </div>
      </div>
    </aside>
  )
}
