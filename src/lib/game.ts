import { GameStatus, RoundPhase } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { answerCards } from '@/data/answerCards'
import { promptCards } from '@/data/promptCards'
import { HAND_SIZE, MIN_PLAYERS } from '@/lib/constants'

export {
  HAND_SIZE,
  MIN_PLAYERS,
  MAX_PLAYERS,
  DEFAULT_TARGET_SCORE,
} from '@/lib/constants'

/** Erro de regra de jogo: vira resposta HTTP com status proprio. */
export class GameError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Preenche a lacuna da carta-pergunta com a resposta jogada.
 * Perguntas sem lacuna ("O que e esse cheiro?") ficam intactas.
 */
export function fillPrompt(prompt: string, answer: string) {
  // Pergunta direta ("O que e esse cheiro?") nao tem onde encaixar a resposta:
  // mostramos so a carta jogada, ja que a pergunta esta visivel na tela.
  if (!prompt.includes('_')) return answer
  const clean = answer.replace(/\.$/, '')
  return prompt.replace(/_+/, clean)
}

/** Tira `count` cartas do topo do baralho, reembaralhando a fonte se acabar. */
function draw(deck: string[], count: number, source: readonly string[]) {
  let remaining = [...deck]
  const drawn: string[] = []
  while (drawn.length < count) {
    if (remaining.length === 0) remaining = shuffle(source)
    drawn.push(remaining.shift() as string)
  }
  return { drawn, remaining }
}

async function loadGame(code: string) {
  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { joinedAt: 'asc' } },
      rounds: { orderBy: { number: 'desc' }, take: 1 },
    },
  })
  if (!game) throw new GameError('Sala nao encontrada', 404)
  return game
}

function requirePlayer<T extends { id: string }>(
  players: T[],
  playerId: string | null | undefined
): T {
  const player = players.find((p) => p.id === playerId)
  if (!player) throw new GameError('Você não está nesta sala', 403)
  return player
}

/** Host inicia a partida: embaralha, distribui as maos e abre a rodada 1. */
export async function startGame(code: string, playerId: string) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)

  if (!player.isHost) throw new GameError('Só o host pode iniciar a partida', 403)
  if (game.status !== GameStatus.LOBBY)
    throw new GameError('A partida já começou', 409)
  if (game.players.length < MIN_PLAYERS)
    throw new GameError(`São necessários pelo menos ${MIN_PLAYERS} jogadores`, 409)

  const promptDeck = shuffle(promptCards)
  let answerDeck = shuffle(answerCards)

  const hands = game.players.map((p) => {
    const { drawn, remaining } = draw(answerDeck, HAND_SIZE, answerCards)
    answerDeck = remaining
    return { playerId: p.id, hand: drawn }
  })

  const prompt = promptDeck.shift() as string

  await prisma.$transaction([
    ...hands.map((h) =>
      prisma.player.update({
        where: { id: h.playerId },
        data: { hand: h.hand, score: 0 },
      })
    ),
    prisma.game.update({
      where: { id: game.id },
      data: { status: GameStatus.IN_PROGRESS, promptDeck, answerDeck },
    }),
    prisma.round.create({
      data: { gameId: game.id, number: 1, prompt, phase: RoundPhase.SUBMITTING },
    }),
  ])
}

/** Jogador joga uma carta da mao. Quando todos jogaram, a rodada vai pra votacao. */
export async function submitCard(code: string, playerId: string, card: string) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)
  const round = game.rounds[0]

  if (game.status !== GameStatus.IN_PROGRESS || !round)
    throw new GameError('A partida não está em andamento', 409)
  if (round.phase !== RoundPhase.SUBMITTING)
    throw new GameError('A fase de jogar cartas já terminou', 409)
  if (!player.hand.includes(card))
    throw new GameError('Essa carta não está na sua mão', 400)

  const alreadyPlayed = await prisma.submission.findUnique({
    where: { roundId_playerId: { roundId: round.id, playerId: player.id } },
  })
  if (alreadyPlayed) throw new GameError('Você já jogou nesta rodada', 409)

  // Tira a carta da mao apenas na primeira ocorrencia (pode haver duplicatas).
  const hand = [...player.hand]
  hand.splice(hand.indexOf(card), 1)

  await prisma.$transaction([
    prisma.submission.create({
      data: { roundId: round.id, playerId: player.id, card },
    }),
    prisma.player.update({ where: { id: player.id }, data: { hand } }),
  ])

  const submissionCount = await prisma.submission.count({
    where: { roundId: round.id },
  })
  if (submissionCount >= game.players.length) {
    await prisma.round.update({
      where: { id: round.id },
      data: { phase: RoundPhase.VOTING },
    })
  }
}

/** Jogador vota numa carta (nunca na propria). Quando todos votaram, apura. */
export async function castVote(
  code: string,
  playerId: string,
  submissionId: string
) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)
  const round = game.rounds[0]

  if (!round || round.phase !== RoundPhase.VOTING)
    throw new GameError('A votação não está aberta', 409)

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  })
  if (!submission || submission.roundId !== round.id)
    throw new GameError('Carta inválida', 400)
  if (submission.playerId === player.id)
    throw new GameError('Você não pode votar na própria carta', 400)

  const alreadyVoted = await prisma.vote.findUnique({
    where: { roundId_voterId: { roundId: round.id, voterId: player.id } },
  })
  if (alreadyVoted) throw new GameError('Você já votou nesta rodada', 409)

  await prisma.vote.create({
    data: { roundId: round.id, voterId: player.id, submissionId },
  })

  const voteCount = await prisma.vote.count({ where: { roundId: round.id } })
  if (voteCount >= game.players.length) await tallyRound(round.id, game.id)
}

/** Apura a rodada: pontua os mais votados e revela as autorias. */
async function tallyRound(roundId: string, gameId: string) {
  const submissions = await prisma.submission.findMany({
    where: { roundId },
    include: { votes: true },
  })

  const best = Math.max(...submissions.map((s) => s.votes.length))
  // Empate pontua todos os empatados: mantem a partida andando sem desempate arbitrario.
  const winners = submissions.filter((s) => s.votes.length === best && best > 0)

  await prisma.$transaction([
    ...winners.map((w) =>
      prisma.player.update({
        where: { id: w.playerId },
        data: { score: { increment: 1 } },
      })
    ),
    prisma.round.update({
      where: { id: roundId },
      data: { phase: RoundPhase.REVEAL, winnerId: winners[0]?.playerId ?? null },
    }),
  ])

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true },
  })
  if (game && game.players.some((p) => p.score >= game.targetScore)) {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: GameStatus.FINISHED },
    })
  }
}

/** Host abre a proxima rodada: recompoe as maos e sorteia nova pergunta. */
export async function nextRound(code: string, playerId: string) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)
  const round = game.rounds[0]

  if (!player.isHost)
    throw new GameError('Só o host pode avançar a rodada', 403)
  if (game.status === GameStatus.FINISHED)
    throw new GameError('A partida já acabou', 409)
  if (!round || round.phase !== RoundPhase.REVEAL)
    throw new GameError('A rodada ainda não terminou', 409)

  let answerDeck = [...game.answerDeck]
  const refills = game.players.map((p) => {
    const missing = HAND_SIZE - p.hand.length
    if (missing <= 0) return null
    const { drawn, remaining } = draw(answerDeck, missing, answerCards)
    answerDeck = remaining
    return { playerId: p.id, hand: [...p.hand, ...drawn] }
  })

  let promptDeck = [...game.promptDeck]
  if (promptDeck.length === 0) promptDeck = shuffle(promptCards)
  const prompt = promptDeck.shift() as string

  await prisma.$transaction([
    ...refills
      .filter((r) => r !== null)
      .map((r) =>
        prisma.player.update({ where: { id: r.playerId }, data: { hand: r.hand } })
      ),
    prisma.game.update({
      where: { id: game.id },
      data: { promptDeck, answerDeck },
    }),
    prisma.round.create({
      data: {
        gameId: game.id,
        number: round.number + 1,
        prompt,
        phase: RoundPhase.SUBMITTING,
      },
    }),
  ])
}
