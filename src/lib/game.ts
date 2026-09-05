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
import { MIN_PLAYERS, SOUND_HAND_SIZE, IMAGE_HAND_SIZE } from '@/lib/constants'
import { getSoundLibrary } from '@/lib/soundLibrary'
import { getImageLibrary } from '@/lib/imageLibrary'

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

/**
 * Carrega a partida enxergando SO quem ainda esta na mesa.
 *
 * O filtro mora aqui, e nao em cada regra, de proposito: a engine compara o
 * numero de jogadas e votos com o numero de jogadores em uma duzia de lugares,
 * e bastava esquecer um para a rodada ficar esperando para sempre por alguem
 * que fechou a aba. Quem saiu continua no banco — o placar e o historico
 * precisam dele —, mas nao conta mais para nada que a rodada espere.
 */
async function loadGame(code: string) {
  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } },
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

/**
 * Passa a rodada para a votacao, uma vez so.
 *
 * Condicionar a fase atual evita renovar o prazo duas vezes quando o ultimo
 * jogador e o prazo vencido chegam ao mesmo ponto ao mesmo tempo.
 */
async function abrirVotacao(roundId: string, turnSeconds: number) {
  await prisma.round.updateMany({
    where: { id: roundId, phase: RoundPhase.SUBMITTING },
    // Prazo novo: votar tem o seu proprio tempo, contado do zero.
    data: { phase: RoundPhase.VOTING, deadline: deadlineFor(turnSeconds) },
  })
}

/** Quando a fase vence, ou null se o prazo esta desligado. */
function deadlineFor(turnSeconds: number) {
  return turnSeconds > 0 ? new Date(Date.now() + turnSeconds * 1000) : null
}

/** Menor multiplo comum, para saber onde as duas cadencias se encontram. */
function mmc(a: number, b: number) {
  const mdc = (x: number, y: number): number => (y === 0 ? x : mdc(y, x % y))
  return (a * b) / mdc(a, b)
}

type Cadencias = { soundEvery: number; imageEvery: number }

/**
 * De que tipo e a rodada numero N.
 *
 * Som e imagem tem cadencias independentes, entao podem cair na mesma rodada —
 * e com as duas ligadas na mesma frequencia, que e o caso mais provavel, TODA
 * rodada de imagem colidiria com uma de som. Dar prioridade fixa a um dos dois
 * faria o outro simplesmente nunca acontecer, sem erro nenhum aparecer: o host
 * ligaria a rodada de imagem e ela nao viria. Por isso a colisao alterna,
 * contando quantas ja houve ate aqui.
 */
function roundKind(cadencias: Cadencias, number: number): RoundKind {
  const { soundEvery, imageEvery } = cadencias
  const som = soundEvery > 0 && number % soundEvery === 0
  const imagem = imageEvery > 0 && number % imageEvery === 0

  if (som && imagem) {
    const encontro = mmc(soundEvery, imageEvery)
    return Math.floor(number / encontro) % 2 === 1
      ? RoundKind.SOUND
      : RoundKind.IMAGE
  }
  if (som) return RoundKind.SOUND
  if (imagem) return RoundKind.IMAGE
  return RoundKind.TEXT
}

/**
 * Reparte a biblioteca de sons entre os jogadores, sem repetir entre eles.
 *
 * Sorteada de novo a cada rodada de som. A primeira versao distribuia uma vez
 * na partida inteira, porque com 10 sons na biblioteca gastar um por rodada
 * esgotaria em duas — mas o efeito foi os mesmos tres sons aparecerem em todas
 * as rodadas, e a repeticao ficou obvia jogando. Com a biblioteca maior, cabe
 * sortear de novo, e e o que faz a rodada de som surpreender.
 */
async function dealSpecialHands(kind: RoundKind, playerCount: number) {
  if (kind === RoundKind.TEXT) return []

  const som = kind === RoundKind.SOUND

  /*
   * Mesma fonte que o gameState usa para montar a tela. Consultar o banco aqui
   * e o cache la deixava os dois discordarem: uma carta recem-semeada podia ser
   * distribuida e depois sumir da mao, porque o cache ainda nao a conhecia.
   */
  const library = som
    ? [...(await getSoundLibrary()).values()]
    : [...(await getImageLibrary()).values()]

  if (library.length < playerCount) {
    const oque = som ? 'som(ns)' : 'imagem(ns)'
    const acao = som
      ? 'Suba mais sons ou desligue a rodada de som.'
      : 'Suba mais imagens ou desligue a rodada de imagem.'
    throw new GameError(
      `A biblioteca tem ${library.length} ${oque} e a sala tem ${playerCount} ` +
        `jogadores. ${acao}`,
      409
    )
  }

  // Cabe menos que o ideal? Reparte o que da, em vez de repetir carta na mesa.
  const perPlayer = Math.min(
    som ? SOUND_HAND_SIZE : IMAGE_HAND_SIZE,
    Math.floor(library.length / playerCount)
  )
  const pool = shuffle(library.map((c) => c.id))

  return Array.from({ length: playerCount }, (_, i) =>
    pool.slice(i * perPlayer, (i + 1) * perPlayer)
  )
}

/** Em que campo do jogador a mao daquele tipo de rodada e guardada. */
function handFieldFor(kind: RoundKind, hand: string[]) {
  if (kind === RoundKind.SOUND) return { soundHand: hand }
  if (kind === RoundKind.IMAGE) return { imageHand: hand }
  return {}
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

  const primeiroKind = roundKind(game, 1)
  const especiais = await dealSpecialHands(primeiroKind, game.players.length)

  const hands = game.players.map((p, i) => {
    const { drawn, remaining } = draw(answerDeck, game.handSize, answerCards)
    answerDeck = remaining
    return {
      playerId: p.id,
      hand: drawn,
      especial: handFieldFor(primeiroKind, especiais[i] ?? []),
    }
  })

  const prompt = promptDeck.shift() as string

  await prisma.$transaction([
    ...hands.map((h) =>
      prisma.player.update({
        where: { id: h.playerId },
        // Mao de som/imagem zerada a cada partida: sobra de partida anterior
        // apareceria como carta que o jogador nao ganhou nesta.
        data: {
          hand: h.hand,
          soundHand: [],
          imageHand: [],
          score: 0,
          ...h.especial,
        },
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
        kind: primeiroKind,
        phase: RoundPhase.SUBMITTING,
        deadline: deadlineFor(game.turnSeconds),
      },
    }),
  ])
}

/** Jogador joga uma carta da mao. Quando todos jogaram, a rodada vai pra votacao. */
export async function submitCard(
  code: string,
  playerId: string,
  input: { card?: string; soundCardId?: string; imageCardId?: string }
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
    // A mao nao e consumida: ela e sorteada de novo a cada rodada especial.
    await prisma.submission.create({
      data: {
        roundId: round.id,
        playerId: player.id,
        card: sound.name,
        soundCardId,
      },
    })
  } else if (round.kind === RoundKind.IMAGE) {
    const { imageCardId } = input
    if (!imageCardId) throw new GameError('Escolha uma carta de imagem', 400)
    if (!player.imageHand.includes(imageCardId))
      throw new GameError('Essa imagem não está na sua mão', 400)

    const image = await prisma.imageCard.findUnique({
      where: { id: imageCardId },
    })
    if (!image) throw new GameError('Imagem não encontrada', 404)

    await prisma.submission.create({
      data: {
        roundId: round.id,
        playerId: player.id,
        card: image.name,
        imageCardId,
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
    await abrirVotacao(round.id, game.turnSeconds)
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

  const best = Math.max(0, ...submissions.map((s) => s.votes.length))
  // Empate pontua todos os empatados: mantem a partida andando sem desempate arbitrario.
  const winners = submissions.filter((s) => s.votes.length === best && best > 0)

  /*
   * Fecha a fase antes de pontuar, e so quem conseguiu fechar pontua.
   *
   * O updateMany condicionado a fase e a trava: dois jogadores votando no mesmo
   * instante — ou dois polls resolvendo o mesmo prazo vencido — chegam aqui
   * juntos, e sem isto o vencedor levaria dois pontos pela mesma rodada.
   */
  const fechou = await prisma.round.updateMany({
    where: { id: roundId, phase: { not: RoundPhase.REVEAL } },
    data: {
      phase: RoundPhase.REVEAL,
      winnerId: winners[0]?.playerId ?? null,
      // Prazo zerado: a revelacao espera o host, sem contagem na tela.
      deadline: null,
    },
  })
  if (fechou.count === 0) return

  await prisma.$transaction(
    winners.map((w) =>
      prisma.player.update({
        where: { id: w.playerId },
        data: { score: { increment: 1 } },
      })
    )
  )

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

/** Sorteia um item, ou null se a lista esta vazia. */
function sorteia<T>(itens: readonly T[]): T | null {
  if (itens.length === 0) return null
  return itens[Math.floor(Math.random() * itens.length)]
}

/**
 * Executa a escrita ignorando violacao de unicidade.
 *
 * Tres jogadores fazendo poll no mesmo instante disparam esta resolucao ao
 * mesmo tempo. As restricoes @@unique de Submission e Vote garantem que so a
 * primeira grava; as outras batem em P2002, que aqui e resultado esperado e nao
 * erro. Sem isto, um prazo vencido geraria excecao para dois dos tres.
 */
async function ignorandoDuplicata(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code !== 'P2002') throw e
  }
}

/**
 * Resolve a rodada quando o prazo vence.
 *
 * Roda no caminho do polling, nao num cron: o estado ja e pedido a cada 1,5s
 * por jogador, entao o prazo e conferido de graça. Consequencia aceita — se
 * todos fecharem a aba, nada resolve; mas aí nao ha ninguem esperando.
 *
 * Quem nao jogou recebe uma carta sorteada da propria mao. Quem nao votou
 * recebe um voto sorteado entre as cartas dos OUTROS: votar na propria seria
 * transformar o prazo em jeito de pontuar sem participar.
 */
export async function resolveExpiredRound(code: string) {
  const game = await loadGame(code)
  const round = game.rounds[0]

  if (game.status !== GameStatus.IN_PROGRESS || !round) return
  if (!round.deadline || round.deadline.getTime() > Date.now()) return

  if (round.phase === RoundPhase.SUBMITTING) {
    const jogadas = await prisma.submission.findMany({
      where: { roundId: round.id },
      select: { playerId: true },
    })
    const jogaram = new Set(jogadas.map((j) => j.playerId))

    for (const p of game.players) {
      if (jogaram.has(p.id)) continue

      if (round.kind === RoundKind.SOUND) {
        const escolhido = sorteia(p.soundHand)
        if (!escolhido) continue
        const som = await prisma.soundCard.findUnique({ where: { id: escolhido } })
        if (!som) continue
        await ignorandoDuplicata(() =>
          prisma.submission.create({
            data: {
              roundId: round.id,
              playerId: p.id,
              card: som.name,
              soundCardId: escolhido,
            },
          })
        )
      } else if (round.kind === RoundKind.IMAGE) {
        const escolhida = sorteia(p.imageHand)
        if (!escolhida) continue
        const img = await prisma.imageCard.findUnique({
          where: { id: escolhida },
        })
        if (!img) continue
        await ignorandoDuplicata(() =>
          prisma.submission.create({
            data: {
              roundId: round.id,
              playerId: p.id,
              card: img.name,
              imageCardId: escolhida,
            },
          })
        )
      } else {
        const carta = sorteia(p.hand)
        if (!carta) continue
        const mao = [...p.hand]
        mao.splice(mao.indexOf(carta), 1)
        await ignorandoDuplicata(() =>
          prisma.$transaction([
            prisma.submission.create({
              data: { roundId: round.id, playerId: p.id, card: carta },
            }),
            prisma.player.update({ where: { id: p.id }, data: { hand: mao } }),
          ])
        )
      }
    }

    /*
     * Passada a resolucao, quem nao tem jogada e porque nao tinha o que jogar
     * — carta de som apagada do acervo entre o sorteio e o prazo, por exemplo.
     * Esperar por essa pessoa deixaria a rodada parada para sempre, com o
     * prazo vencido e ninguem conseguindo agir. Duas cartas na mesa ja dao uma
     * votacao; menos que isso vai direto para a apuracao, sem vencedor.
     */
    const total = await prisma.submission.count({ where: { roundId: round.id } })
    if (total >= 2) await abrirVotacao(round.id, game.turnSeconds)
    else await tallyRound(round.id, game.id)
    return
  }

  if (round.phase === RoundPhase.VOTING) {
    const [votos, jogadas] = await Promise.all([
      prisma.vote.findMany({
        where: { roundId: round.id },
        select: { voterId: true },
      }),
      prisma.submission.findMany({
        where: { roundId: round.id },
        select: { id: true, playerId: true },
      }),
    ])
    const votaram = new Set(votos.map((v) => v.voterId))

    for (const p of game.players) {
      if (votaram.has(p.id)) continue
      const alvo = sorteia(jogadas.filter((j) => j.playerId !== p.id))
      if (!alvo) continue
      await ignorandoDuplicata(() =>
        prisma.vote.create({
          data: { roundId: round.id, voterId: p.id, submissionId: alvo.id },
        })
      )
    }

    // Chegando aqui todo mundo votou ou nao tinha em quem votar: apura.
    await tallyRound(round.id, game.id)
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

  const numero = round.number + 1
  const kind = roundKind(game, numero)

  let answerDeck = [...game.answerDeck]
  const refills = game.players.map((p) => {
    // DEPLETE nao repoe nada: a mao inicial e todo o estoque da partida.
    if (game.deckMode === DeckMode.DEPLETE) return null

    // FRESH troca a mao inteira; o que sobrou nao volta pro baralho de
    // proposito, senao a carta descartada reaparece na rodada seguinte.
    const { drawn, remaining } = draw(answerDeck, game.handSize, answerCards)
    answerDeck = remaining
    return { playerId: p.id, hand: drawn }
  })

  // Mao especial sorteada de novo, e so quando a rodada que abre pede uma.
  const especiais = await dealSpecialHands(kind, game.players.length)

  let promptDeck = [...game.promptDeck]
  if (promptDeck.length === 0) promptDeck = shuffle(promptCards)
  const prompt = promptDeck.shift() as string

  await prisma.$transaction([
    ...game.players.map((p, i) => {
      const refill = refills[i]
      return prisma.player.update({
        where: { id: p.id },
        data: {
          ...(refill ? { hand: refill.hand } : {}),
          ...(especiais.length ? handFieldFor(kind, especiais[i] ?? []) : {}),
        },
      })
    }),
    prisma.game.update({
      where: { id: game.id },
      data: { promptDeck, answerDeck },
    }),
    prisma.round.create({
      data: {
        gameId: game.id,
        number: numero,
        prompt,
        kind,
        phase: RoundPhase.SUBMITTING,
        deadline: deadlineFor(game.turnSeconds),
      },
    }),
  ])
}

/**
 * Jogador sai da partida.
 *
 * Sair do host encerra para todos: sem ele ninguem puxa a proxima rodada, e
 * hoje os outros ficavam presos numa sala morta esperando algo que nunca vem.
 * A partida vira ABANDONED e nao FINISHED porque nao houve campeao — ela foi
 * interrompida, e o placar final nao significa vitoria de ninguem.
 *
 * Jogador comum sair nao encerra nada: ele volta pelo mesmo link e a
 * reconexao ja existente o devolve ao lugar.
 */
/**
 * Jogador sai da partida.
 *
 * Antes so o host saia de verdade: quem nao era host apenas navegava para
 * fora e continuava fantasma na mesa, com os outros esperando uma jogada que
 * nunca vinha. Agora sair marca `leftAt`, e a mesa segue sem ele.
 *
 * No lobby a linha e apagada: nao havia partida, entao nao ha historico a
 * preservar nem lapide a mostrar. Em partida a linha fica.
 *
 * Nao devolve nada: a rota responde com o estado da partida, e e de la que a
 * tela tira o que mudou — o status e a lapide de quem saiu.
 */
export async function leaveGame(code: string, playerId: string) {
  const game = await loadGame(code)
  const player = requirePlayer(game.players, playerId)
  const acabou =
    game.status === GameStatus.FINISHED || game.status === GameStatus.ABANDONED

  // Partida encerrada: sair e so navegar, nao ha nada para interromper.
  if (acabou) return

  if (player.isHost) {
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: { leftAt: new Date() },
      }),
      prisma.game.update({
        where: { id: game.id },
        data: { status: GameStatus.ABANDONED },
      }),
    ])
    return
  }

  if (game.status === GameStatus.LOBBY) {
    await prisma.player.delete({ where: { id: player.id } })
    return
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { leftAt: new Date() },
  })

  /*
   * Com menos de MIN_PLAYERS a partida nao tem como continuar: ninguem vota na
   * propria carta, entao com dois jogadores toda rodada empata e ninguem
   * pontua. Melhor encerrar com essa razao visivel do que deixar a mesa girar
   * em falso.
   */
  const restantes = game.players.length - 1
  if (restantes < MIN_PLAYERS) {
    await prisma.game.update({
      where: { id: game.id },
      data: { status: GameStatus.ABANDONED },
    })
    return
  }

  /*
   * A saida pode ter completado a fase: os que ficaram talvez ja tivessem
   * jogado ou votado, e so faltava ele. Sem esta conferencia a rodada esperaria
   * ate o prazo vencer por alguem que nao esta mais aqui.
   */
  await advanceIfComplete(code)
}

/**
 * Fecha a fase se todos os que ficaram ja agiram.
 *
 * Usado depois de alguem sair: o alvo de "todos jogaram" acabou de diminuir, e
 * a condicao pode ter passado a valer sem ninguem clicar em nada.
 */
async function advanceIfComplete(code: string) {
  const game = await loadGame(code)
  const round = game.rounds[0]
  if (game.status !== GameStatus.IN_PROGRESS || !round) return

  if (round.phase === RoundPhase.SUBMITTING) {
    const jogadas = await prisma.submission.count({ where: { roundId: round.id } })
    if (jogadas >= game.players.length && jogadas >= 2) {
      await abrirVotacao(round.id, game.turnSeconds)
    }
    return
  }

  if (round.phase === RoundPhase.VOTING) {
    const votos = await prisma.vote.count({ where: { roundId: round.id } })
    if (votos >= game.players.length) await tallyRound(round.id, game.id)
  }
}
