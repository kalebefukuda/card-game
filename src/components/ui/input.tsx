import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Campo alto (48px) porque o jogo e digitado no celular, com uma mao.
 * O texto e 16px de proposito: abaixo disso o iOS da zoom ao focar.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4',
        'text-base font-semibold text-[var(--ink)] placeholder:font-medium placeholder:text-[var(--ink-soft)]',
        'transition-colors outline-none focus:border-[var(--prompt)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
