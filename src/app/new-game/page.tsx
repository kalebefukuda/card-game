'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/Logo'
import { SoundControl } from '@/components/sound/SoundControl'
import {
  GameOptionsForm,
  DEFAULT_OPTIONS,
  optionsConflict,
  type GameOptionsValue,
} from '@/components/game/GameOptions'
import { loadName, savePlayerId } from '@/lib/session'

/**
 * Tela de criacao da partida.
 *
 * Os ajustes ja foram uma secao recolhida na home e depois um dialogo. Como
 * tela ganham o espaco que precisavam — cada opcao vem com uma linha dizendo o
 * que faz — e herdam o cabecalho do resto do app, com a marca levando de volta
 * ao inicio sem precisar de um botao "cancelar" proprio.
 *
 * O nome vem da home, salvo na sessao, e nao e repetido na tela: quem acabou
 * de digitar nao precisa ler de volta. Quem cai aqui sem nome (link direto,
 * sessao limpa) volta para a home, que e onde se digita o nome.
 */
export default function NovaPartida() {
  const [nome, setNome] = useState<string | null>(null)
  const [options, setOptions] = useState<GameOptionsValue>(DEFAULT_OPTIONS)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const salvo = loadName()
    if (!salvo) return router.replace('/')
    setNome(salvo)
  }, [router])

  const criar = async () => {
    if (conflito) return
    setCriando(true)
    setErro(null)
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, ...options }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Não consegui criar a sala.')
      savePlayerId(data.code, data.playerId)
      router.push(`/game/${data.code}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Sem conexão com o servidor.')
      setCriando(false)
    }
  }

  const conflito = optionsConflict(options)

  // Enquanto o nome nao chega, nada de conteudo: a alternativa e piscar a tela
  // inteira para quem vai ser mandado de volta para a home no instante seguinte.
  if (!nome) return null

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" aria-label="Voltar ao início">
            <Logo size={30} />
          </Link>
          <SoundControl />
        </div>
      </header>

      <main className="animate-rise mx-auto max-w-xl px-5 pt-8 pb-16">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Voltar ao início">
            <Button variant="secondary" size="icon">
              <ArrowLeft />
            </Button>
          </Link>
          <h1 className="text-3xl font-extrabold">Como vão jogar?</h1>
        </div>

        <div className="mt-8">
          <GameOptionsForm value={options} onChange={setOptions} />
        </div>

        {(conflito || erro) && (
          <p
            role="alert"
            className="mt-8 rounded-[var(--radius)] bg-black/[0.06] px-4 py-3 text-sm font-bold"
          >
            {conflito ?? erro}
          </p>
        )}

        <Button
          size="lg"
          onClick={criar}
          disabled={criando || conflito !== null}
          className="mt-8 w-full"
        >
          {criando ? <Loader2 className="animate-spin" /> : 'Criar partida'}
        </Button>
      </main>
    </div>
  )
}
