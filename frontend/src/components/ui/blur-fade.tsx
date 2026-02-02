import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface BlurFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  yOffset?: number
  inView?: boolean
  blur?: string
}

/**
 * Blur fade in animation component.
 * Animates children with a blur and fade effect when in view.
 */
export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 500,
  yOffset = 20,
  inView: inViewProp = true,
  blur = '10px',
  ...props
}: BlurFadeProps) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || inViewProp) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [inViewProp])

  const shouldAnimate = inViewProp || inView

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: shouldAnimate ? 1 : 0,
        transform: shouldAnimate ? 'none' : `translateY(${yOffset}px)`,
        filter: shouldAnimate ? 'none' : `blur(${blur})`,
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms, filter ${duration}ms ease-out ${delay}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
