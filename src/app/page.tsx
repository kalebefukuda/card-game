'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Gamepad, Loader2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { savePlayerId, loadName, saveName } from '@/lib/session'
import { MAX_NAME_LENGTH } from '@/lib/constants'

export default function Home() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Reaproveita o ultimo nome usado, pra nao redigitar a cada partida.
  useEffect(() => setName(loadName()), [])

  const enterRoom = async (
    kind: 'create' | 'join',
    url: string,
    body: Record<string, string>
  ) => {
    if (!name.trim()) return setError('Informe seu nome')
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível entrar na sala')
        return
      }
      saveName(name.trim())
      savePlayerId(data.code, data.playerId)
      router.push(`/game/${data.code}`)
    } catch {
      setError('Sem conexão com o servidor')
    } finally {
      setBusy(null)
    }
  }

  const createRoom = () => enterRoom('create', '/api/create-room', {})

  const joinRoom = () => {
    if (!code.trim()) return setError('Informe o código da partida')
    return enterRoom('join', '/api/join-room', { code })
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center gap-2 p-4">
        <span className="relative h-10 w-11 shrink-0">
          <span className="absolute left-0 h-9 w-7 rotate-[-12deg] border-2 border-black bg-white" />
          <span className="absolute left-3 h-9 w-7 rotate-[8deg] border-2 border-black bg-black" />
        </span>
        <span className="text-lg font-bold">Cards Just Cards</span>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-bold tracking-widest uppercase">
            Seu nome
          </label>
          <Input
            id="name"
            placeholder="Como a mesa vai te chamar"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            className="h-12 max-w-md border-2 border-black focus-visible:ring-0"
          />
        </div>

        {error && (
          <p role="alert" className="border-2 border-black bg-black px-4 py-2 text-sm font-medium text-white">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-full space-y-4 md:w-1/2">
            <Button
              onClick={createRoom}
              disabled={busy !== null}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-black text-white hover:bg-black/90"
            >
              {busy === 'create' ? <Loader2 className="animate-spin" /> : <Gamepad />}
              <span className="font-medium">NOVA PARTIDA</span>
            </Button>

            <Button
              onClick={() => router.push('/see-cards')}
              variant="outline"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-sm border-2 border-black bg-white text-black hover:bg-gray-100"
            >
              <WalletCards />
              <span className="font-medium">VER CARTAS</span>
            </Button>
          </div>

          <div className="w-full md:w-1/2">
            <h2 className="mb-2 text-2xl font-bold">Entre em uma partida</h2>
            <p className="mb-4 text-sm">
              Peça para seu amigo enviar o código da partida para que você possa
              entrar.
            </p>

            <div className="flex">
              <Input
                placeholder="Código da partida"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                className="rounded-r-none border-2 border-black font-mono tracking-[0.2em] uppercase focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={joinRoom}
                disabled={busy !== null}
                className="rounded-l-none bg-black px-6 text-white hover:bg-black/90"
              >
                {busy === 'join' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    ENTRAR <ArrowRight className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
