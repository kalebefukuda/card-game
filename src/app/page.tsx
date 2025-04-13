'use client'

import Image from "next/image"
import { ArrowRight, Ellipsis, Gamepad, LogOut, Search, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { useState } from 'react'


export default function Home() {
  const [name, setName] = useState('') 
  const [code, setCode] = useState('')
  const router = useRouter()

  

  const handleCreateRoom = async () => {
    if (!name) return alert('Informe seu nome')
    const res = await fetch('/api/create-room', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    router.push(`/lobby/${data.code}?name=${name}`)
  }
  
  const handleJoinRoom = async () => {
    if (!name || !code) return alert('Informe nome e código')
  
    const res = await fetch('/api/join-room', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    })
  
    if (!res.ok) {
      const error = await res.json()
      alert(error.error || 'Erro ao entrar na sala')
      return
    }
  
    router.push(`/lobby/${code.toUpperCase()}?name=${name}`)
  }
  

  return (

    <div className="min-h-screen bg-white">
      <header className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10">
            <div className="absolute w-8 h-10 bg-white border-2 border-black rotate-[-10deg]"></div>
            <div className="absolute w-8 h-10 bg-black border-2 border-black rotate-[5deg]"></div>
          </div>
          <span className="font-bold text-lg">Cards Just Cards</span>
        </div>

        <Input
  placeholder="Seu nome"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="mb-4 border-2 border-black"
/>


        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold">Kalebe</div>
            <div className="text-xs text-gray-600">kalebefelixdeoliveira@gmail.com</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            <Image
              src="/placeholder.svg?height=40&width=40"
              alt="Perfil"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 mt-8 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2 space-y-4">
        <Button
          onClick={handleCreateRoom}
          className="w-full h-14 bg-black text-white hover:bg-black/90 rounded-sm flex items-center justify-center gap-2"
        >
          <Gamepad />
          <span className="font-medium">NOVA PARTIDA</span>
        </Button>

          <Button
            variant="outline"
            className="w-full h-14 bg-white text-black border-2 border-black hover:bg-gray-100 rounded-sm flex items-center justify-center gap-2"
          >
            <span className="material-icons"><Search /></span>
            <span className="font-medium">ENCONTRAR PARTIDAS</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 bg-white text-black border-2 border-black hover:bg-gray-100 rounded-sm flex items-center justify-center gap-2"
          >
            <span className="material-icons"><WalletCards /></span>
            <span className="font-medium">VER CARTAS</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 bg-white text-black border-2 border-black hover:bg-gray-100 rounded-sm flex items-center justify-center gap-2"
          >
            <span className="material-icons"><Ellipsis /></span>
            <span className="font-medium">MAIS OPÇÕES</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 bg-white text-black border-2 border-black hover:bg-gray-100 rounded-sm flex items-center justify-center gap-2"
          >
            <span className="material-icons"><LogOut /></span>
            <span className="font-medium">SAIR</span>
          </Button>
        </div>

        <div className="w-full md:w-1/2">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Entre em uma partida</h2>
            <p className="text-sm mb-4">
              Peça para seu amigo enviar o código da partida para que você possa entrar na partida.
            </p>

            <div className="flex">
              <Input
                placeholder="Código da partida"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-r-none border-2 border-black focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
              onClick={handleJoinRoom}
              className="bg-black text-white hover:bg-black/90 rounded-l-none px-6">
              ENTRAR <ArrowRight className="ml-1" />
            </Button>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
