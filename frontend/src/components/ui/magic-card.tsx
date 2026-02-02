import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
}

/**
 * Card component with spotlight effect that follows the mouse cursor.
 */
export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = '#262626',
  gradientOpacity = 0.8,
  ...props
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!cardRef.current || !isHovered) return

    const card = cardRef.current
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    card.addEventListener('mousemove', handleMouseMove)
    return () => card.removeEventListener('mousemove', handleMouseMove)
  }, [isHovered])

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-background',
        className
      )}
      {...props}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-1 opacity-50 transition-opacity"
          style={{
            background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 40%)`,
            opacity: gradientOpacity,
          }}
        />
      )}
      {children}
    </div>
  )
}
