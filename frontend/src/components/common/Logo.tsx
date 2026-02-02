import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

interface LogoProps {
  className?: string
  iconClassName?: string
  showText?: boolean
}

/**
 * Application logo component.
 */
export function Logo({
  className,
  iconClassName,
  showText = true,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground',
          iconClassName
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      {showText && (
        <span className="font-semibold text-lg">{APP_NAME}</span>
      )}
    </div>
  )
}
