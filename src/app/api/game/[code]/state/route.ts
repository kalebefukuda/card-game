import { handle, RouteContext } from '@/lib/apiHandler'
import { getGameState } from '@/lib/gameState'

export async function GET(req: Request, { params }: RouteContext) {
  const { code } = await params
  const playerId = new URL(req.url).searchParams.get('playerId')
  return handle(() => getGameState(code, playerId))
}
