import { GameStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { handle } from '@/lib/apiHandler'
import { GameError, MAX_PLAYERS } from '@/lib/game'
import { normalizeName, normalizeCode } from '@/lib/validation'

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json()
    const name = normalizeName(body.name)
    const code = normalizeCode(body.code)

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: true },
    })
    if (!game) throw new GameError('Sala não encontrada', 404)

    // Reconectar: mesmo nome na mesma sala devolve o jogador que ja existe,
    // pra quem fechou a aba conseguir voltar pra partida.
    const existing = game.players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      /*
       * Voltar apaga a lapide. Quem quitou e se arrependeu volta para a mesa
       * com o placar intacto — a saida marca quem nao esta jogando agora, nao
       * uma punicao permanente. So nao ressuscita partida ja encerrada.
       */
      if (
        existing.leftAt &&
        (game.status === GameStatus.LOBBY ||
          game.status === GameStatus.IN_PROGRESS)
      ) {
        await prisma.player.update({
          where: { id: existing.id },
          data: { leftAt: null },
        })
      }
      return { code: game.code, playerId: existing.id, rejoined: true }
    }

    if (game.status !== GameStatus.LOBBY)
      throw new GameError('Essa partida já começou', 409)
    if (game.players.length >= MAX_PLAYERS)
      throw new GameError(`Sala cheia (máximo de ${MAX_PLAYERS} jogadores)`, 403)

    const player = await prisma.player.create({
      data: { name, gameId: game.id, isHost: false },
    })

    return { code: game.code, playerId: player.id, rejoined: false }
  })
}
