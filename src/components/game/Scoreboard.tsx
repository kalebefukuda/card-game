'use client'

import { Check, Crown, Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState } from '@/lib/gameState'

/** Placar: quem esta na sala, quantos pontos tem e se ja jogou/votou. */
export function Scoreboard({
  state,
  youId,
}: {
  state: GameState
  youId?: string
}) {
  const phase = state.round?.phase
  const inRound = state.status === 'IN_PROGRESS'
  const leader = Math.max(...state.players.map((p) => p.score), 0)

  const statusFor = (player: GameState['players'][number]) => {
    if (!inRound || !phase) return null
    if (phase === 'SUBMITTING')
      return player.hasSubmitted
        ? { icon: Check, label: 'jogou', done: true }
        : { icon: Hourglass, label: 'escolhendo', done: false }
    if (phase === 'VOTING')
      return player.hasVoted
        ? { icon: Check, label: 'votou', done: true }
        : { icon: Hourglass, label: 'votando', done: false }
    return null
  }

  return (
    <aside className="overflow-hidden rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)]">
      <h2 className="kicker bg-[var(--canvas)] px-4 py-2.5 text-[var(--ink-soft)]">
        Placar · até {state.targetScore} pts
      </h2>

      <ul>
        {state.players.map((player) => {
          const status = statusFor(player)
          const Icon = status?.icon
          const isLeader = leader > 0 && player.score === leader

          return (
            <li
              key={player.id}
              className={cn(
                'flex items-center gap-2 border-t border-[var(--line)] px-4 py-2.5 first:border-t-0',
                player.id === youId && 'bg-[var(--brand-soft)]/40'
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate font-bold">{player.name}</span>
                {player.isHost && (
                  <Crown
                    size={14}
                    className="shrink-0 text-[var(--gold)]"
                    aria-label="host"
                  />
                )}
                {player.id === youId && (
                  <span className="kicker shrink-0 text-[9px] text-[var(--ink-soft)]">
                    você
                  </span>
                )}
              </span>

              {Icon && (
                <span
                  title={status.label}
                  className={cn(
                    'shrink-0',
                    status.done
                      ? 'text-[var(--brand)]'
                      : 'animate-pulse text-[var(--ink-soft)]'
                  )}
                >
                  <Icon size={15} />
                </span>
              )}

              <span
                className={cn(
                  'w-7 shrink-0 text-right font-extrabold tabular-nums',
                  isLeader ? 'text-[var(--brand-edge)]' : 'text-[var(--ink)]'
                )}
              >
                {player.score}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
