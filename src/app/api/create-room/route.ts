import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRoomCode } from '@/lib/utils'

export async function POST(req: Request) {
  const { name } = await req.json()

  const code = generateRoomCode()

  const game = await prisma.game.create({
    data: {
      code,
      players: {
        create: {
          name,
          isHost: true,
        },
      },
    },
  })

  return NextResponse.json({ code })
}
