import { GameStatus, RoundPhase } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { GameError, fillPrompt } from '@/lib/game'

export type PlayerView = {
  id: string
  name: string
  isHost: boolean
  score: number
  hasSubmitted: boolean
  hasVoted: boolean
}

export type SubmissionView = { id: string; card: string; isMine: boolean }

export type RevealView = {
  id: string
  card: string
  filled: string
  playerName: string
  votes: number
  isWinner: boolean
  isMine: boolean
}

export type GameState = {
  code: string
  status: GameStatus
  targetScore: number
  players: PlayerView[]
  you: {
    id: string
    name: string
    isHost: boolean
    score: number
    hand: string[]
  } | null
  round: {
    number: number
    prompt: string
    phase: RoundPhase
    submittedCount: number
    votedCount: number
    submissions: SubmissionView[]
    reveal: RevealView[]
    yourVoteId: string | null
  } | null
  champions: { name: string; score: number }[]
}

/**
 * Monta a visao do jogo para UM jogador.
 *
 * O que cada jogador pode ver depende da fase: durante SUBMITTING ninguem ve
 * carta de ninguem, durante VOTING as cartas aparecem sem autoria, e so no
 * REVEAL as autorias e os votos sao expostos.
 */
export async function getGameState(
  code: string,
  playerId: string | null
): Promise<GameState> {
  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { joinedAt: 'asc' } },
      rounds: {
        orderBy: { number: 'desc' },
        take: 1,
        include: {
          submissions: { include: { player: true, votes: true } },
          votes: true,
        },
      },
    },
  })
  if (!game) throw new GameError('Sala não encontrada', 404)

  const me = game.players.find((p) => p.id === playerId) ?? null
  const round = game.rounds[0] ?? null

  const players: PlayerView[] = game.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    score: p.score,
    hasSubmitted: !!round?.submissions.some((s) => s.playerId === p.id),
    hasVoted: !!round?.votes.some((v) => v.voterId === p.id),
  }))

  let roundView: GameState['round'] = null
  if (round) {
    const isVoting = round.phase === RoundPhase.VOTING
    const isReveal = round.phase === RoundPhase.REVEAL
    const best = Math.max(0, ...round.submissions.map((s) => s.votes.length))

    roundView = {
      number: round.number,
      prompt: round.prompt,
      phase: round.phase,
      submittedCount: round.submissions.length,
      votedCount: round.votes.length,
      // Ordem estavel por id: embaralhar a cada poll faria as cartas dancarem na tela.
      submissions: isVoting
        ? [...round.submissions]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((s) => ({
              id: s.id,
              card: s.card,
              isMine: s.playerId === me?.id,
            }))
        : [],
      reveal: isReveal
        ? [...round.submissions]
            .sort((a, b) => b.votes.length - a.votes.length)
            .map((s) => ({
              id: s.id,
              card: s.card,
              filled: fillPrompt(round.prompt, s.card),
              playerName: s.player.name,
              votes: s.votes.length,
              isWinner: best > 0 && s.votes.length === best,
              isMine: s.playerId === me?.id,
            }))
        : [],
      yourVoteId:
        round.votes.find((v) => v.voterId === me?.id)?.submissionId ?? null,
    }
  }

  const topScore = Math.max(0, ...game.players.map((p) => p.score))

  return {
    code: game.code,
    status: game.status,
    targetScore: game.targetScore,
    players,
    you: me
      ? {
          id: me.id,
          name: me.name,
          isHost: me.isHost,
          score: me.score,
          hand: me.hand,
        }
      : null,
    round: roundView,
    champions:
      game.status === GameStatus.FINISHED
        ? game.players
            .filter((p) => p.score === topScore)
            .map((p) => ({ name: p.name, score: p.score }))
        : [],
  }
}
