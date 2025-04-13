import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Código não enviado' }, { status: 400 })
  }

  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  })

  if (!game) {
    return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ players: game.players })
}
