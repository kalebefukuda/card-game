'use client'

import { Check, Crown, Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState } from '@/lib/gameState'

/** Placar lateral: quem esta na sala, quantos pontos tem e se ja jogou/votou. */
export function Scoreboard({
  state,
  youId,
}: {
  state: GameState
  youId?: string
}) {
  const phase = state.round?.phase
  const inRound = state.status === 'IN_PROGRESS'

  const statusFor = (player: GameState['players'][number]) => {
    if (!inRound || !phase) return null
    if (phase === 'SUBMITTING')
      return player.hasSubmitted
        ? { icon: Check, label: 'jogou' }
        : { icon: Hourglass, label: 'escolhendo' }
    if (phase === 'VOTING')
      return player.hasVoted
        ? { icon: Check, label: 'votou' }
        : { icon: Hourglass, label: 'votando' }
    return null
  }

  return (
    <aside className="border-2 border-black">
      <h2 className="border-b-2 border-black bg-black px-3 py-2 text-xs font-bold tracking-widest text-white uppercase">
        Placar · até {state.targetScore} pts
      </h2>
      <ul>
        {state.players.map((player) => {
          const status = statusFor(player)
          const Icon = status?.icon
          return (
            <li
              key={player.id}
              className={cn(
                'flex items-center gap-2 border-b border-black/15 px-3 py-2 last:border-b-0',
                player.id === youId && 'bg-black/5'
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate font-medium">{player.name}</span>
                {player.isHost && (
                  <Crown size={14} className="shrink-0" aria-label="host" />
                )}
                {player.id === youId && (
                  <span className="shrink-0 text-[10px] tracking-wide uppercase opacity-60">
                    você
                  </span>
                )}
              </span>

              {Icon && (
                <span
                  title={status.label}
                  className={cn(
                    'shrink-0',
                    status.label === 'jogou' || status.label === 'votou'
                      ? 'opacity-100'
                      : 'animate-pulse opacity-40'
                  )}
                >
                  <Icon size={14} />
                </span>
              )}

              <span className="w-6 shrink-0 text-right font-bold tabular-nums">
                {player.score}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
