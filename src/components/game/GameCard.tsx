'use client'

import { cn } from '@/lib/utils'
import { Mark } from '@/components/brand/Mark'
import { playSound, type SoundName } from '@/lib/sound'

type GameCardProps = {
  text: string
  variant?: 'answer' | 'prompt'
  selected?: boolean
  disabled?: boolean
  badge?: string
  onClick?: () => void
  /** Som do clique: 'card' ao jogar, 'vote' ao votar. */
  sound?: SoundName
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
  sound = 'card',
}: GameCardProps) {
  const isPrompt = variant === 'prompt'
  const interactive = !!onClick && !disabled

  return (
    <button
      type="button"
      onClick={
        onClick
          ? () => {
              playSound(sound)
              onClick()
            }
          : undefined
      }
      disabled={!interactive}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'group relative flex aspect-[3/4] w-full flex-col justify-between p-4 text-left',
        'rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)]',
        'transition-[transform,box-shadow] duration-[120ms] ease-out',
        isPrompt
          ? 'bg-[var(--ink)] text-[var(--paper)] [--mark-invert:1]'
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
        <Mark size={26} />
        <span className="text-[7px] font-bold tracking-[0.18em] uppercase">
          Meu Baralho
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
