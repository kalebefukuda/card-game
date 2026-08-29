import { handle, RouteContext } from '@/lib/apiHandler'
import { submitCard } from '@/lib/game'
import { getGameState } from '@/lib/gameState'

export async function POST(req: Request, { params }: RouteContext) {
  const { code } = await params
  const { playerId, card } = await req.json()
  return handle(async () => {
    await submitCard(code, playerId, card)
    return getGameState(code, playerId)
  })
}
