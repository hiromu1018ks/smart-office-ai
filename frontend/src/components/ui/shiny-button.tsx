import { motion, type MotionStyle } from 'motion/react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ShinyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart'> {
  children: React.ReactNode
  className?: string
}

// CSS custom property type for motion animations
type CSSCustomProperties = {
  '--x': string
} & MotionStyle

export const ShinyButton = forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative cursor-pointer rounded-lg border px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow dark:bg-[radial-gradient(circle_at_50%_0%,var(--primary)/10%_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_var(--primary)/10%]',
          className
        )}
        initial={{ '--x': '100%', scale: 0.98 } as CSSCustomProperties}
        animate={{ '--x': '-100%', scale: 1 } as CSSCustomProperties}
        whileTap={{ scale: 0.95 }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'loop',
          repeatDelay: 1,
          type: 'spring',
          stiffness: 20,
          damping: 15,
          mass: 2,
          scale: {
            type: 'spring',
            stiffness: 200,
            damping: 5,
            mass: 0.5,
          },
        }}
        {...props}
      >
        <span
          className="relative block size-full text-sm tracking-wide text-[rgb(0,0,0,65%)] uppercase dark:font-light dark:text-[rgb(255,255,255,90%)]"
          style={{
            maskImage:
              'linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))',
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: 'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
            WebkitMask:
              'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
            backgroundImage:
              'linear-gradient(-75deg,var(--primary)/10% calc(var(--x)+20%),var(--primary)/50% calc(var(--x)+25%),var(--primary)/10% calc(var(--x)+100%))',
          }}
          className="absolute inset-0 z-10 block rounded-[inherit] p-px"
        />
      </motion.button>
    )
  }
)

ShinyButton.displayName = 'ShinyButton'
