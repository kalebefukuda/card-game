'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mascot } from '@/components/brand/Mascot'
import { Logo } from '@/components/brand/Logo'
import { loadName, saveName, savePlayerId } from '@/lib/session'
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '@/lib/constants'

export default function Home() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => setName(loadName()), [])

  const needName = () => {
    if (name.trim()) return false
    setError('Primeiro me diz como te chamar.')
    return true
  }

  const createRoom = async () => {
    if (needName()) return
    setBusy('create')
    setError(null)
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Não consegui criar a sala.')
      saveName(name.trim())
      savePlayerId(data.code, data.playerId)
      router.push(`/game/${data.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sem conexão com o servidor.')
      setBusy(null)
    }
  }

  const joinRoom = async () => {
    if (needName()) return
    if (code.trim().length < ROOM_CODE_LENGTH) {
      return setError(`O código tem ${ROOM_CODE_LENGTH} caracteres.`)
    }
    setBusy('join')
    setError(null)
    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Não consegui entrar na sala.')
      saveName(name.trim())
      savePlayerId(data.code, data.playerId)
      router.push(`/game/${data.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sem conexão com o servidor.')
      setBusy(null)
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-lg items-center justify-between px-5 pt-6">
        <Logo />
      </header>

      <main className="animate-rise mx-auto max-w-lg px-5 pt-10 pb-16">
        <div className="flex flex-col items-center text-center">
          <Mascot size={104} mood="happy" title="Tico, o mascote" />
          <h1 className="mt-5 text-[2rem] leading-[1.1] font-extrabold tracking-[-0.035em]">
            Quem tem o pior senso de humor da mesa?
          </h1>
          <p className="mt-3 max-w-[42ch] font-semibold text-[var(--ink-soft)]">
            Cada rodada tem uma frase pela metade. Jogue a resposta mais
            absurda, vote na melhor e some pontos.
          </p>
        </div>

        <div className="mt-9 space-y-3">
          <label htmlFor="name" className="kicker text-[var(--ink-soft)]">
            Seu nome
          </label>
          <Input
            id="name"
            placeholder="Como a mesa vai te chamar"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
        </div>

        <Button
          size="lg"
          onClick={createRoom}
          disabled={busy !== null}
          className="mt-4 w-full"
        >
          {busy === 'create' ? (
            <Loader2 className="animate-spin" />
          ) : (
            'Criar partida'
          )}
        </Button>

        <div className="mt-10 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-extrabold">Já tem um código?</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">
            Peça para quem criou a partida e digite aqui.
          </p>

          <div className="mt-4 flex gap-2">
            <Input
              aria-label="Código da partida"
              placeholder="ABC123"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              className="roomcode text-center uppercase"
            />
            <Button
              variant="info"
              onClick={joinRoom}
              disabled={busy !== null}
              aria-label="Entrar na partida"
              className="shrink-0 px-5"
            >
              {busy === 'join' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArrowRight />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[var(--danger)]/10 px-4 py-3 text-center text-sm font-bold text-[var(--danger)]"
          >
            {error}
          </p>
        )}

        <Button
          variant="ghost"
          onClick={() => router.push('/see-cards')}
          className="mt-8 w-full"
        >
          <WalletCards /> Ver o baralho
        </Button>
      </main>
    </div>
  )
}
