import { redirect } from 'next/navigation'

/** Rota antiga do lobby: a partida inteira agora vive em /game/[code]. */
export default async function LegacyLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  redirect(`/game/${code.toUpperCase()}`)
}
