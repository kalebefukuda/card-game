'use client'

import { cn } from '@/lib/utils'

type GameCardProps = {
  text: string
  variant?: 'answer' | 'prompt'
  selected?: boolean
  disabled?: boolean
  badge?: string
  onClick?: () => void
}

/**
 * Carta do jogo. Preta = pergunta, branca = resposta, seguindo o baralho fisico.
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
        'group relative flex aspect-[2/3] w-full flex-col justify-between rounded-md border-2 p-3 text-left transition',
        isPrompt
          ? 'border-black bg-black text-white'
          : 'border-black bg-white text-black',
        interactive &&
          'cursor-pointer hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] focus-visible:-translate-y-1 focus-visible:shadow-[4px_4px_0_0_#000] focus-visible:outline-none',
        selected && 'ring-4 ring-black ring-offset-2',
        disabled && !selected && 'opacity-40',
        !interactive && 'cursor-default'
      )}
    >
      <span className="text-sm leading-snug font-medium">{text}</span>

      <span className="mt-2 flex items-center gap-1">
        <span className="relative h-4 w-5 shrink-0">
          <span
            className={cn(
              'absolute left-0 h-4 w-3 rotate-[-12deg] border',
              isPrompt ? 'border-white bg-black' : 'border-black bg-white'
            )}
          />
          <span
            className={cn(
              'absolute left-1.5 h-4 w-3 rotate-[8deg] border',
              isPrompt ? 'border-white bg-white' : 'border-black bg-black'
            )}
          />
        </span>
        <span className="text-[8px] tracking-wide uppercase opacity-70">
          Cards Just Cards
        </span>
      </span>

      {badge && (
        <span className="absolute -top-2 -right-2 rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
          {badge}
        </span>
      )}
    </button>
  )
}
