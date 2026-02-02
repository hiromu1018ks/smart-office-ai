import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

/**
 * Search input component with icon.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="search"
          className={cn(
            'flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          placeholder="Search..."
          {...props}
        />
      </div>
    )
  }
)

SearchBar.displayName = 'SearchBar'
