import { handle, RouteContext } from '@/lib/apiHandler'
import { startGame } from '@/lib/game'
import { getGameState } from '@/lib/gameState'

export async function POST(req: Request, { params }: RouteContext) {
  const { code } = await params
  const { playerId } = await req.json()
  return handle(async () => {
    await startGame(code, playerId)
    return getGameState(code, playerId)
  })
}
