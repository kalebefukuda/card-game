import {
  DeckMode,
  EndCondition,
  GameStatus,
  RoundKind,
  RoundPhase,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { answerCards } from '@/data/answerCards'
import { promptCards } from '@/data/promptCards'
import { MIN_PLAYERS, SOUND_HAND_SIZE } from '@/lib/constants'
import { getSoundLibrary } from '@/lib/soundLibrary'

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

/** Uma rodada a cada `soundEvery` e de som. 0 desliga. */
function roundKind(soundEvery: number, number: number): RoundKind {
  return soundEvery > 0 && number % soundEvery === 0
    ? RoundKind.SOUND
    : RoundKind.TEXT
}

/**
 * Reparte a biblioteca de sons entre os jogadores, sem repetir entre eles.
 *
 * A mao de som nao e consumida ao longo da partida: com uma biblioteca de
 * poucas dezenas, gastar uma carta por rodada esgotaria em duas ou tres. Os
 * seus sons sao seus a partida inteira e voce escolhe o melhor para cada
 * pergunta — o que tambem garante que dois jogadores nunca tenham o mesmo som.
 */
async function dealSoundHands(soundEvery: number, playerCount: number) {
  if (soundEvery <= 0) return []

  /*
   * Mesma fonte que o gameState usa para montar a tela. Consultar o banco aqui
   * e o cache la deixava os dois discordarem: uma carta recem-semeada podia ser
   * distribuida e depois sumir da mao, porque o cache ainda nao a conhecia.
   */
  const library = [...(await getSoundLibrary()).values()]

  if (library.length < playerCount) {
    throw new GameError(
      `A biblioteca tem ${library.length} som(ns) e a sala tem ${playerCount} ` +
        'jogadores. Suba mais sons ou desligue a rodada de som.',
      409
    )
  }

  // Cabe menos que o ideal? Reparte o que da, em vez de repetir som na mesa.
  const perPlayer = Math.min(
    SOUND_HAND_SIZE,
    Math.floor(library.length / playerCount)
  )
  const pool = shuffle(library.map((s) => s.id))

  return Array.from({ length: playerCount }, (_, i) =>
    pool.slice(i * perPlayer, (i + 1) * perPlayer)
  )
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

  const soundHands = await dealSoundHands(game.soundEvery, game.players.length)

  const hands = game.players.map((p, i) => {
    const { drawn, remaining } = draw(answerDeck, game.handSize, answerCards)
    answerDeck = remaining
    return { playerId: p.id, hand: drawn, soundHand: soundHands[i] ?? [] }
  })

  const prompt = promptDeck.shift() as string

  await prisma.$transaction([
    ...hands.map((h) =>
      prisma.player.update({
        where: { id: h.playerId },
        data: { hand: h.hand, soundHand: h.soundHand, score: 0 },
      })
    ),
    prisma.game.update({
      where: { id: game.id },
      data: { status: GameStatus.IN_PROGRESS, promptDeck, answerDeck },
    }),
    prisma.round.create({
      data: {
        gameId: game.id,
        number: 1,
        prompt,
        kind: roundKind(game.soundEvery, 1),
        phase: RoundPhase.SUBMITTING,
      },
    }),
  ])
}

/** Jogador joga uma carta da mao. Quando todos jogaram, a rodada vai pra votacao. */
export async function submitCard(
  code: string,
  playerId: string,
  input: { card?: string; soundCardId?: string }
) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)
  const round = game.rounds[0]

  if (game.status !== GameStatus.IN_PROGRESS || !round)
    throw new GameError('A partida não está em andamento', 409)
  if (round.phase !== RoundPhase.SUBMITTING)
    throw new GameError('A fase de jogar cartas já terminou', 409)

  const alreadyPlayed = await prisma.submission.findUnique({
    where: { roundId_playerId: { roundId: round.id, playerId: player.id } },
  })
  if (alreadyPlayed) throw new GameError('Você já jogou nesta rodada', 409)

  if (round.kind === RoundKind.SOUND) {
    const { soundCardId } = input
    if (!soundCardId) throw new GameError('Escolha uma carta de som', 400)
    if (!player.soundHand.includes(soundCardId))
      throw new GameError('Esse som não está na sua mão', 400)

    const sound = await prisma.soundCard.findUnique({
      where: { id: soundCardId },
    })
    if (!sound) throw new GameError('Som não encontrado', 404)

    // O nome vai junto para o historico sobreviver caso o som saia do acervo.
    // A mao de som nao e consumida — ver dealSoundHands.
    await prisma.submission.create({
      data: {
        roundId: round.id,
        playerId: player.id,
        card: sound.name,
        soundCardId,
      },
    })
  } else {
    const { card } = input
    if (!card) throw new GameError('Escolha uma carta', 400)
    if (!player.hand.includes(card))
      throw new GameError('Essa carta não está na sua mão', 400)

    // Tira a carta da mao apenas na primeira ocorrencia (pode haver duplicatas).
    const hand = [...player.hand]
    hand.splice(hand.indexOf(card), 1)

    await prisma.$transaction([
      prisma.submission.create({
        data: { roundId: round.id, playerId: player.id, card },
      }),
      prisma.player.update({ where: { id: player.id }, data: { hand } }),
    ])
  }

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
  const round = await prisma.round.findUnique({ where: { id: roundId } })

  if (game && round && isGameOver(game, game.players, round.number)) {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: GameStatus.FINISHED },
    })
  }
}

/**
 * Decide se a partida acabou. Concentrado numa funcao so porque as tres regras
 * podem disparar na mesma apuracao, e espalhar isso pelo codigo e o jeito de
 * uma delas ser esquecida.
 */
function isGameOver(
  game: {
    endCondition: EndCondition
    targetScore: number
    roundLimit: number
    deckMode: DeckMode
  },
  players: { score: number; hand: string[] }[],
  roundNumber: number
) {
  // Em DEPLETE, ficar sem cartas encerra sempre — inclusive quando ninguem
  // bateu a pontuacao. Todos esvaziam na mesma rodada, porque cada jogador
  // joga exatamente uma carta por rodada.
  if (
    game.deckMode === DeckMode.DEPLETE &&
    players.every((p) => p.hand.length === 0)
  ) {
    return true
  }

  if (game.endCondition === EndCondition.ROUND_LIMIT) {
    return roundNumber >= game.roundLimit
  }

  return players.some((p) => p.score >= game.targetScore)
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
    // DEPLETE nao repoe nada: a mao inicial e todo o estoque da partida.
    if (game.deckMode === DeckMode.DEPLETE) return null

    // FRESH troca a mao inteira; o que sobrou nao volta pro baralho de
    // proposito, senao a carta descartada reaparece na rodada seguinte.
    if (game.deckMode === DeckMode.FRESH) {
      const { drawn, remaining } = draw(answerDeck, game.handSize, answerCards)
      answerDeck = remaining
      return { playerId: p.id, hand: drawn }
    }

    const missing = game.handSize - p.hand.length
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
        kind: roundKind(game.soundEvery, round.number + 1),
        phase: RoundPhase.SUBMITTING,
      },
    }),
  ])
}
