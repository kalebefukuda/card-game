'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import socket from '@/lib/socket'

interface Player {
  id: string
  name: string
  isHost: boolean
}

export default function LobbyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = params.code as string
  const name = searchParams.get('name') || ''
  const [players, setPlayers] = useState<Player[]>([])

  const fetchPlayers = async () => {
    const res = await fetch(`/api/lobby?code=${code}`)
    const data = await res.json()
    setPlayers(data.players)
  }

  useEffect(() => {
    // Conecta e entra na sala do socket
    socket.connect()
    socket.emit('join-room', code)

    // Atualiza jogadores quando alguém novo entra
    socket.on('player-joined', fetchPlayers)

    fetchPlayers()

    return () => {
      socket.disconnect()
      socket.off('player-joined')
    }
  }, [code])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">Sala: {code}</h1>
      <p className="mb-2 text-gray-600">Você é <strong>{name}</strong></p>

      <div className="mb-4">
        <h2 className="text-xl mb-2">Jogadores na sala:</h2>
        <ul className="list-disc">
          {players.map((player) => (
            <li key={player.id}>
              {player.name} {player.isHost && '(Host)'}
            </li>
          ))}
        </ul>
      </div>

      {players.length >= 2 && players.find(p => p.name === name)?.isHost ? (
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Iniciar jogo
        </button>
      ) : (
        <p className="text-gray-500">Aguardando jogadores ou host iniciar...</p>
      )}
    </main>
  )
}
