import { handle, RouteContext } from '@/lib/apiHandler'
import { submitCard } from '@/lib/game'
import { getGameState } from '@/lib/gameState'

export async function POST(req: Request, { params }: RouteContext) {
  const { code } = await params
  // `card` em rodada de texto, `soundCardId` em rodada de som, `imageCardId`
  // em rodada de imagem. A engine escolhe qual exigir, a partir do tipo da
  // rodada aberta.
  const { playerId, card, soundCardId, imageCardId } = await req.json()
  return handle(async () => {
    await submitCard(code, playerId, { card, soundCardId, imageCardId })
    return getGameState(code, playerId)
  })
}
