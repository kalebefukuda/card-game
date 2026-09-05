'use client'

import { Check, Crown, Hourglass, Skull } from 'lucide-react'
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

  const statusFor = (player: GameState['players'][number]) => {
    // Quem saiu nao esta escolhendo nem votando: a lapide substitui o status.
    if (player.hasLeft) return null
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
    <aside className="overflow-hidden rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]">
      <h2 className="kicker border-b-[length:var(--border-w)] border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-[var(--paper)]">
        Placar · {objetivo(state)}
      </h2>

      <ul>
        {state.players.map((player) => {
          const status = statusFor(player)
          const Icon = status?.icon

          return (
            <li
              key={player.id}
              className={cn(
                'flex items-center gap-2 border-t border-[var(--line-soft)] px-4 py-2.5 first:border-t-0',
                player.id === youId && 'bg-black/5',
                player.hasLeft && 'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.05)_6px,rgba(0,0,0,0.05)_12px)]'
              )}
            >
              {/*
               * A lapide vai embaixo do nome, e nao ao lado: na coluna estreita
               * do placar as duas coisas na mesma linha espremiam o nome ate
               * "D…", e um placar que nao diz quem quitou nao serve para nada.
               */}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  {player.hasLeft && (
                    <Skull size={14} className="shrink-0" aria-hidden />
                  )}
                  <span
                    className={cn(
                      'truncate font-bold',
                      player.hasLeft && 'text-[var(--ink-soft)] line-through'
                    )}
                  >
                    {player.name}
                  </span>
                  {player.isHost && !player.hasLeft && (
                    <Crown size={14} className="shrink-0" aria-label="host" />
                  )}
                  {player.id === youId && !player.hasLeft && (
                    <span className="kicker shrink-0 text-[9px] text-[var(--ink-soft)]">
                      você
                    </span>
                  )}
                </span>

                {player.hasLeft && (
                  <span className="kicker text-[9px] text-[var(--ink-soft)]">
                    vacilão quitou
                  </span>
                )}
              </span>

              {Icon && (
                <span
                  title={status.label}
                  className={cn(
                    'shrink-0',
                    status.done
                      ? 'text-[var(--ink)]'
                      : 'animate-pulse text-[var(--ink-soft)]'
                  )}
                >
                  <Icon size={15} />
                </span>
              )}

              <span
                className={cn(
                  'w-7 shrink-0 text-right font-bold tabular-nums',
                  player.hasLeft && 'text-[var(--ink-soft)]'
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

/** O que a partida cobra para acabar, em uma expressao curta. */
function objetivo(state: GameState) {
  if (state.deckMode === 'DEPLETE') return `${state.handSize} rodadas`
  if (state.endCondition === 'ROUND_LIMIT') return `${state.roundLimit} rodadas`
  return `até ${state.targetScore} pts`
}
