import { prisma } from '@/lib/prisma'
import { generateRoomCode } from '@/lib/utils'
import { handle } from '@/lib/apiHandler'
import { GameError, DEFAULT_TARGET_SCORE } from '@/lib/game'
import { normalizeName } from '@/lib/validation'

export async function POST(req: Request) {
  return handle(async () => {
    const { name } = await req.json()
    const playerName = normalizeName(name)

    // Colisao de codigo e improvavel (36^6), mas nao impossivel: tenta de novo.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode()
      const existing = await prisma.game.findUnique({ where: { code } })
      if (existing) continue

      const game = await prisma.game.create({
        data: {
          code,
          targetScore: DEFAULT_TARGET_SCORE,
          players: { create: { name: playerName, isHost: true } },
        },
        include: { players: true },
      })

      return { code: game.code, playerId: game.players[0].id }
    }

    throw new GameError('Não foi possível gerar um código de sala', 500)
  })
}
