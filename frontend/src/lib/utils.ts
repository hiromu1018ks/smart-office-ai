import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes.
 * Uses clsx for conditional class joining and tailwind-merge
 * to resolve Tailwind class conflicts.
 *
 * @param inputs - Class values to merge (strings, arrays, objects)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', someCondition && 'font-bold') // => 'text-red-500 font-bold' (when true)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
