import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Campo alto (48px) porque o jogo e digitado no celular, com uma mao.
 * Texto de 16px de proposito: abaixo disso o iOS da zoom ao focar.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-[var(--radius)] px-4',
        'border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]',
        'text-base font-semibold text-[var(--ink)]',
        'placeholder:font-medium placeholder:text-[var(--ink-soft)]',
        'outline-none focus:shadow-hard-sm',
        'transition-shadow duration-[120ms] ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
