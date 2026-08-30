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
 * Carta do jogo. A pergunta e azul e a resposta e branca — no baralho fisico
 * seriam preta e branca, mas em tela o azul separa melhor sem pesar a pagina.
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
        'group relative flex aspect-[3/4] w-full flex-col justify-between rounded-2xl p-4 text-left',
        'transition-[transform,box-shadow,border-color] duration-[120ms] ease-out',
        isPrompt
          ? 'border-b-[5px] border-[var(--prompt-edge)] bg-[var(--prompt)] text-white'
          : 'border-2 border-b-[5px] border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]',
        interactive && 'hover:-translate-y-1 hover:border-[var(--brand)]',
        interactive && 'active:translate-y-[2px] active:border-b-2',
        selected &&
          'border-[var(--brand)] ring-4 ring-[var(--brand-soft)] ring-offset-0',
        disabled && !selected && 'opacity-45',
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

      <span className="mt-2 flex items-center gap-1.5 opacity-70">
        <Mascot size={18} />
        <span className="text-[7px] font-extrabold tracking-[0.16em] uppercase">
          Cards Just Cards
        </span>
      </span>

      {badge && (
        <span className="absolute -top-2 -right-2 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase">
          {badge}
        </span>
      )}
    </button>
  )
}
