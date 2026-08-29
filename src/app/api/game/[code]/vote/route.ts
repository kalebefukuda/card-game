import { handle, RouteContext } from '@/lib/apiHandler'
import { castVote } from '@/lib/game'
import { getGameState } from '@/lib/gameState'

export async function POST(req: Request, { params }: RouteContext) {
  const { code } = await params
  const { playerId, submissionId } = await req.json()
  return handle(async () => {
    await castVote(code, playerId, submissionId)
    return getGameState(code, playerId)
  })
}
