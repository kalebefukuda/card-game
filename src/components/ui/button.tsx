import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Botao com "pisada": a borda inferior grossa some no :active e o botao desce
 * junto, entao o clique tem peso fisico. E o unico movimento do tema — 120ms,
 * sem bounce. O alvo minimo e 48px porque o jogo e usado no celular.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2',
    'rounded-2xl font-extrabold tracking-[0.02em] whitespace-nowrap uppercase',
    'transition-[transform,background-color,border-color] duration-[120ms] ease-out',
    'active:translate-y-[3px] active:border-b-0',
    'disabled:pointer-events-none disabled:opacity-40',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'border-b-[3px] border-[var(--brand-edge)] bg-[var(--brand)] text-white hover:brightness-[1.04]',
        secondary:
          'border-2 border-b-[5px] border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--canvas)] active:border-b-2',
        info: 'border-b-[3px] border-[var(--prompt-edge)] bg-[var(--prompt)] text-white hover:brightness-[1.04]',
        ghost:
          'text-[var(--ink-soft)] hover:bg-black/5 hover:text-[var(--ink)] active:translate-y-0',
      },
      size: {
        default: 'h-12 px-5 text-sm',
        lg: 'h-14 px-6 text-base',
        sm: 'h-10 px-4 text-xs',
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
