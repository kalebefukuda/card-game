import { handle, RouteContext } from '@/lib/apiHandler'
import { getGameState } from '@/lib/gameState'
import { resolveExpiredRound } from '@/lib/game'

export async function GET(req: Request, { params }: RouteContext) {
  const { code } = await params
  const playerId = new URL(req.url).searchParams.get('playerId')

  return handle(async () => {
    /*
     * O prazo e conferido aqui, no caminho do polling, e nao dentro de
     * getGameState: montar a tela e leitura, e leitura que escreve fica
     * imprevisivel. Como todo jogador pede o estado a cada 1,5s, a rodada
     * vencida e resolvida sem precisar de cron.
     */
    await resolveExpiredRound(code)
    return getGameState(code, playerId)
  })
}
