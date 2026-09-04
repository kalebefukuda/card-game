import { handle, RouteContext } from '@/lib/apiHandler'
import { submitCard } from '@/lib/game'
import { getGameState } from '@/lib/gameState'

export async function POST(req: Request, { params }: RouteContext) {
  const { code } = await params
  // `card` em rodada de texto, `soundCardId` em rodada de som. A engine escolhe
  // qual dos dois exigir, a partir do tipo da rodada aberta.
  const { playerId, card, soundCardId } = await req.json()
  return handle(async () => {
    await submitCard(code, playerId, { card, soundCardId })
    return getGameState(code, playerId)
  })
}
