import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { name, code } = await req.json()

  if (!name || !code) {
    return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })
  }

  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })

  if (!game) {
    return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
  }

  if (game.players.length >= 4) {
    return NextResponse.json({ error: 'Sala cheia' }, { status: 403 })
  }

  const nameAlreadyUsed = game.players.some(p => p.name === name)
  if (nameAlreadyUsed) {
    return NextResponse.json({ error: 'Nome já utilizado na sala' }, { status: 409 })
  }

  await prisma.player.create({
    data: {
      name,
      gameId: game.id,
      isHost: false,
    },
  })

  return NextResponse.json({ success: true })
}
