'use client'

import { cn } from '@/lib/utils'
import { Mascot } from '@/components/brand/Mascot'

type GameCardProps = {
  text: string
  variant?: 'answer' | 'prompt'
  selected?: boolean
  disabled?: boolean
  badge?: string
  onClick?: () => void
}

/**
 * Carta do jogo, seguindo o baralho fisico: pergunta preta, resposta branca.
 * O Tico assina o rodape e se inverte sozinho na carta preta, porque e
 * desenhado em currentColor.
 * Vira <button> quando ha onClick, pra ficar acessivel via teclado.
 */
export function GameCard({
  text,
  variant = 'answer',
  selected = false,
  disabled = false,
  badge,
  onClick,
}: GameCardProps) {
  const isPrompt = variant === 'prompt'
  const interactive = !!onClick && !disabled

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'group relative flex aspect-[3/4] w-full flex-col justify-between p-4 text-left',
        'rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)]',
        'transition-[transform,box-shadow] duration-[120ms] ease-out',
        isPrompt
          ? 'bg-[var(--ink)] text-[var(--paper)] [--mascot-bg:var(--ink)]'
          : 'bg-[var(--paper)] text-[var(--ink)]',
        interactive && 'shadow-hard-sm hover:-translate-y-1 hover:shadow-hard',
        interactive && 'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        selected && 'translate-x-[3px] translate-y-[3px] shadow-none',
        disabled && !selected && 'opacity-40',
        !interactive && 'cursor-default'
      )}
    >
      <span
        className={cn(
          'font-bold text-balance',
          // Texto longo encolhe pra caber sem cortar a piada.
          text.length > 90
            ? 'text-[0.8rem] leading-snug'
            : 'text-[0.95rem] leading-snug'
        )}
      >
        {text}
      </span>

      <span className="mt-2 flex items-center gap-1.5">
        <Mascot size={26} variant="full" />
        <span className="text-[7px] font-bold tracking-[0.18em] uppercase">
          Cards Just Cards
        </span>
      </span>

      {badge && (
        <span
          className={cn(
            'absolute -top-2 -right-2 rounded-full px-2.5 py-1',
            'border-[length:var(--border-w)] border-[var(--ink)]',
            'text-[10px] font-bold tracking-wide uppercase',
            'bg-[var(--paper)] text-[var(--ink)]'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
