import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Botao brutalista: borda preta e sombra dura deslocada. No :active a sombra
 * some e o botao anda ate o lugar dela, entao o clique tem peso sem bounce.
 * Alvo minimo de 48px porque o jogo e usado no celular.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2',
    'border-[length:var(--border-w)] border-[var(--ink)] rounded-[var(--radius)]',
    'font-bold tracking-[0.06em] uppercase whitespace-nowrap',
    'transition-[transform,box-shadow,background-color] duration-[120ms] ease-out',
    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
    'disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--ink)] text-[var(--paper)] shadow-hard-sm hover:bg-[var(--ink)]/85',
        secondary:
          'bg-[var(--paper)] text-[var(--ink)] shadow-hard-sm hover:bg-black/5',
        ghost:
          'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] active:translate-x-0 active:translate-y-0',
      },
      size: {
        default: 'h-12 px-5 text-xs',
        lg: 'h-14 px-6 text-sm',
        sm: 'h-10 px-4 text-[11px]',
        icon: 'size-12',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
