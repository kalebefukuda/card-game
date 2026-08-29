'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GameCard } from '@/components/game/GameCard'
import { Scoreboard } from '@/components/game/Scoreboard'
import { useGameState } from '@/hooks/useGameState'
import { loadPlayerId, savePlayerId, loadName, saveName } from '@/lib/session'
import { MAX_NAME_LENGTH, MIN_PLAYERS } from '@/lib/constants'

export default function GamePage() {
  const params = useParams<{ code: string }>()
  const roomCode = (params?.code ?? '').toUpperCase()
  const router = useRouter()

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPlayerId(loadPlayerId(roomCode))
    setReady(true)
  }, [roomCode])

  const { state, error, pending, loading, act, setError } = useGameState(
    roomCode,
    playerId
  )

  if (!ready || (loading && !state)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </main>
    )
  }

  // Sala inexistente: nao adianta pedir nome.
  if (!state && error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-medium">{error}</p>
        <Link href="/">
          <Button className="rounded-sm bg-black text-white">
            <ArrowLeft /> Voltar ao início
          </Button>
        </Link>
      </main>
    )
  }

  if (!state) return null

  // Entrou pelo link direto, sem identidade salva nesta sala.
  if (!state.you) {
    return (
      <JoinPrompt
        code={roomCode}
        error={error}
        onJoined={(id) => {
          savePlayerId(roomCode, id)
          setPlayerId(id)
          setError(null)
        }}
      />
    )
  }

  const you = state.you
  const round = state.round
  const isHost = you.isHost

  return (
    <div className="min-h-screen bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Cards Just Cards</span>
        </Link>

        <div className="flex items-center gap-3">
          {round && state.status === 'IN_PROGRESS' && (
            <span className="text-xs font-bold tracking-widest uppercase">
              Rodada {round.number}
            </span>
          )}
          <RoomCode code={roomCode} />
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="border-b-2 border-black bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {error}
        </p>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[1fr_260px]">
        <section className="order-2 md:order-1">
          {state.status === 'LOBBY' && (
            <Lobby
              state={state}
              isHost={isHost}
              pending={pending}
              onStart={() => act('start')}
            />
          )}

          {state.status === 'IN_PROGRESS' && round && (
            <Round
              state={state}
              pending={pending}
              isHost={isHost}
              onSubmit={(card) => act('submit', { card })}
              onVote={(submissionId) => act('vote', { submissionId })}
              onNext={() => act('next-round')}
            />
          )}

          {state.status === 'FINISHED' && (
            <Finished state={state} onHome={() => router.push('/')} />
          )}
        </section>

        <div className="order-1 md:order-2">
          <Scoreboard state={state} youId={you.id} />
        </div>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const link = `${window.location.origin}/game/${code}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem permissao de clipboard: o codigo continua visivel pra digitar.
    }
  }

  return (
    <button
      onClick={copy}
      title="Copiar link de convite"
      className="flex items-center gap-2 border-2 border-black px-3 py-1.5 font-mono text-lg font-bold tracking-[0.2em] transition hover:bg-black hover:text-white"
    >
      {code}
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  )
}

function JoinPrompt({
  code,
  error,
  onJoined,
}: {
  code: string
  error: string | null
  onJoined: (playerId: string) => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => setName(loadName()), [])

  const join = async () => {
    if (!name.trim()) return setLocalError('Informe seu nome')
    setBusy(true)
    setLocalError(null)
    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      })
      const data = await res.json()
      if (!res.ok) return setLocalError(data.error ?? 'Erro ao entrar na sala')
      saveName(name.trim())
      onJoined(data.playerId)
    } catch {
      setLocalError('Sem conexão com o servidor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-center text-2xl font-bold">
        Entrar na sala{' '}
        <span className="font-mono tracking-[0.2em]">{code}</span>
      </h1>

      <div className="flex w-full max-w-sm">
        <Input
          autoFocus
          placeholder="Seu nome"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          className="rounded-r-none border-2 border-black focus-visible:ring-0"
        />
        <Button
          onClick={join}
          disabled={busy}
          className="rounded-l-none bg-black px-6 text-white hover:bg-black/90"
        >
          {busy ? <Loader2 className="animate-spin" /> : 'ENTRAR'}
        </Button>
      </div>

      {(localError || error) && (
        <p role="alert" className="text-sm font-medium">
          {localError ?? error}
        </p>
      )}
    </main>
  )
}

function Lobby({
  state,
  isHost,
  pending,
  onStart,
}: {
  state: NonNullable<ReturnType<typeof useGameState>['state']>
  isHost: boolean
  pending: boolean
  onStart: () => void
}) {
  const missing = MIN_PLAYERS - state.players.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sala de espera</h1>
        <p className="mt-1 text-sm text-black/60">
          Compartilhe o código do topo com a galera. Primeiro a chegar em{' '}
          {state.targetScore} pontos vence.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {state.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 border-2 border-black px-3 py-2 font-medium"
          >
            <Check size={16} />
            {p.name}
            {p.isHost && (
              <span className="ml-auto text-[10px] tracking-widest uppercase opacity-60">
                host
              </span>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <div className="space-y-2">
          <Button
            onClick={onStart}
            disabled={missing > 0 || pending}
            className="h-14 w-full rounded-sm bg-black text-white hover:bg-black/90 disabled:opacity-40"
          >
            {pending ? <Loader2 className="animate-spin" /> : 'INICIAR PARTIDA'}
          </Button>
          {missing > 0 && (
            <p className="text-center text-sm text-black/60">
              Faltam {missing} {missing === 1 ? 'jogador' : 'jogadores'} para
              começar (mínimo de {MIN_PLAYERS}).
            </p>
          )}
        </div>
      ) : (
        <p className="border-2 border-dashed border-black/30 px-4 py-6 text-center text-sm text-black/60">
          Esperando o host iniciar a partida…
        </p>
      )}
    </div>
  )
}

function Round({
  state,
  pending,
  isHost,
  onSubmit,
  onVote,
  onNext,
}: {
  state: NonNullable<ReturnType<typeof useGameState>['state']>
  pending: boolean
  isHost: boolean
  onSubmit: (card: string) => void
  onVote: (submissionId: string) => void
  onNext: () => void
}) {
  const round = state.round!
  const you = state.you!
  const total = state.players.length
  const youSubmitted = state.players.find((p) => p.id === you.id)?.hasSubmitted

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-center">
        <div className="max-w-[200px]">
          <GameCard text={round.prompt} variant="prompt" />
        </div>

        <div className="space-y-1">
          {round.phase === 'SUBMITTING' && (
            <>
              <h1 className="text-2xl font-bold">
                {youSubmitted ? 'Carta jogada!' : 'Escolha sua carta'}
              </h1>
              <p className="text-sm text-black/60">
                {round.submittedCount} de {total} jogaram
                {youSubmitted && ' — esperando o resto da mesa…'}
              </p>
            </>
          )}

          {round.phase === 'VOTING' && (
            <>
              <h1 className="text-2xl font-bold">
                {round.yourVoteId ? 'Voto registrado!' : 'Vote na melhor'}
              </h1>
              <p className="text-sm text-black/60">
                {round.votedCount} de {total} votaram — você não pode votar na
                sua própria carta.
              </p>
            </>
          )}

          {round.phase === 'REVEAL' && (
            <>
              <h1 className="text-2xl font-bold">Resultado da rodada</h1>
              <p className="text-sm text-black/60">
                {isHost
                  ? 'Quando quiser, puxe a próxima rodada.'
                  : 'Esperando o host puxar a próxima rodada…'}
              </p>
            </>
          )}
        </div>
      </div>

      {round.phase === 'SUBMITTING' && !youSubmitted && (
        <CardGrid>
          {you.hand.map((card, i) => (
            <GameCard
              key={`${card}-${i}`}
              text={card}
              disabled={pending}
              onClick={() => onSubmit(card)}
            />
          ))}
        </CardGrid>
      )}

      {round.phase === 'VOTING' && (
        <CardGrid>
          {round.submissions.map((s) => (
            <GameCard
              key={s.id}
              text={s.card}
              badge={s.isMine ? 'sua' : undefined}
              selected={round.yourVoteId === s.id}
              disabled={s.isMine || !!round.yourVoteId || pending}
              onClick={s.isMine ? undefined : () => onVote(s.id)}
            />
          ))}
        </CardGrid>
      )}

      {round.phase === 'REVEAL' && (
        <>
          <ul className="space-y-2">
            {round.reveal.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-2 px-4 py-3 ${
                  r.isWinner ? 'border-black bg-black text-white' : 'border-black/20'
                }`}
              >
                {r.isWinner && <Trophy size={16} className="shrink-0" />}
                <span className="flex-1 font-medium">{r.filled}</span>
                <span className="text-sm opacity-70">
                  {r.playerName}
                  {r.isMine && ' (você)'}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {r.votes} {r.votes === 1 ? 'voto' : 'votos'}
                </span>
              </li>
            ))}
          </ul>

          {isHost && (
            <Button
              onClick={onNext}
              disabled={pending}
              className="h-14 w-full rounded-sm bg-black text-white hover:bg-black/90"
            >
              {pending ? <Loader2 className="animate-spin" /> : 'PRÓXIMA RODADA'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function Finished({
  state,
  onHome,
}: {
  state: NonNullable<ReturnType<typeof useGameState>['state']>
  onHome: () => void
}) {
  return (
    <div className="space-y-6 text-center">
      <Trophy size={48} className="mx-auto" />
      <div>
        <h1 className="text-3xl font-bold">
          {state.champions.length > 1 ? 'Empate!' : 'Temos um vencedor!'}
        </h1>
        <p className="mt-2 text-lg">
          {state.champions.map((c) => c.name).join(' e ')} —{' '}
          {state.champions[0]?.score} pontos
        </p>
      </div>
      <Button
        onClick={onHome}
        className="h-14 w-full rounded-sm bg-black text-white hover:bg-black/90"
      >
        VOLTAR AO INÍCIO
      </Button>
    </div>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  )
}
