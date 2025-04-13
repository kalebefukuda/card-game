import { Server as NetServer } from 'http'
import { Server as IOServer } from 'socket.io'
import { NextApiRequest } from 'next'
import { NextApiResponseWithSocket } from '@/types/socket'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('🔧 Criando servidor Socket.IO...')

    const io = new IOServer(res.socket.server, {
      path: '/api/socket',
    })

    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('🟢 Novo cliente conectado:', socket.id)

      socket.on('join-room', (roomCode) => {
        console.log(`👥 ${socket.id} entrou na sala ${roomCode}`)
        socket.join(roomCode)
        socket.to(roomCode).emit('player-joined')
      })

      socket.on('disconnect', () => {
        console.log('🔴 Cliente desconectado:', socket.id)
      })
    })
  }

  res.end()
}
