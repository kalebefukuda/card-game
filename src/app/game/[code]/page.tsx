'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GameCard } from '@/components/game/GameCard'
import { Scoreboard } from '@/components/game/Scoreboard'
import { Mascot } from '@/components/brand/Mascot'
import { Logo } from '@/components/brand/Logo'
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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Mascot size={72} />
        <Loader2 className="animate-spin text-[var(--ink-soft)]" />
      </main>
    )
  }

  // Sala inexistente: nao adianta pedir nome.
  if (!state && error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <Mascot size={88} mood="peek" />
        <div>
          <h1 className="text-2xl font-extrabold">{error}</h1>
          <p className="mt-2 font-semibold text-[var(--ink-soft)]">
            Confira o código com quem criou a partida — é fácil trocar 0 por O.
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary">
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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b-2 border-[var(--line)] bg-[var(--canvas)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Voltar ao início">
            <Logo size={30} compact />
          </Link>

          <div className="flex items-center gap-3">
            {round && state.status === 'IN_PROGRESS' && (
              <span className="kicker text-[var(--ink-soft)]">
                Rodada {round.number}
              </span>
            )}
            <RoomCode code={roomCode} />
          </div>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="bg-[var(--danger)] px-4 py-2.5 text-center text-sm font-bold text-white"
        >
          {error}
        </p>
      )}

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1fr_260px]">
        <section className="animate-rise">
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

        <div className="md:order-last">
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
      className="roomcode flex h-11 items-center gap-2 rounded-2xl border-2 border-b-[4px] border-[var(--line)] bg-[var(--surface)] px-3.5 text-base transition-colors hover:border-[var(--brand)] active:translate-y-[2px] active:border-b-2"
    >
      {code}
      {copied ? (
        <Check size={15} className="text-[var(--brand)]" />
      ) : (
        <Copy size={15} className="text-[var(--ink-soft)]" />
      )}
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
    <main className="animate-rise mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-5 px-6 text-center">
      <Mascot size={92} mood="happy" />
      <div>
        <h1 className="text-2xl font-extrabold">Entrar na partida</h1>
        <p className="roomcode mt-1 text-lg text-[var(--ink-soft)]">{code}</p>
      </div>

      <div className="w-full space-y-3">
        <Input
          autoFocus
          placeholder="Seu nome"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <Button size="lg" onClick={join} disabled={busy} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : 'Entrar'}
        </Button>
      </div>

      {(localError || error) && (
        <p
          role="alert"
          className="w-full rounded-2xl bg-[var(--danger)]/10 px-4 py-3 text-sm font-bold text-[var(--danger)]"
        >
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
        <h1 className="text-3xl font-extrabold">Sala de espera</h1>
        <p className="mt-1.5 font-semibold text-[var(--ink-soft)]">
          Toque no código lá em cima para copiar o convite. Primeiro a chegar em{' '}
          {state.targetScore} pontos vence.
        </p>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {state.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2.5 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-bold"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white">
              <Check size={15} strokeWidth={3} />
            </span>
            <span className="truncate">{p.name}</span>
            {p.isHost && (
              <span className="kicker ml-auto shrink-0 text-[var(--ink-soft)]">
                host
              </span>
            )}
          </li>
        ))}

        {missing > 0 &&
          Array.from({ length: missing }).map((_, i) => (
            <li
              key={`empty-${i}`}
              className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-[var(--line)] px-4 py-3 font-semibold text-[var(--ink-soft)]"
            >
              <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-[var(--line)]" />
              Esperando alguém…
            </li>
          ))}
      </ul>

      {isHost ? (
        <div className="space-y-2">
          <Button
            size="lg"
            onClick={onStart}
            disabled={missing > 0 || pending}
            className="w-full"
          >
            {pending ? <Loader2 className="animate-spin" /> : 'Começar partida'}
          </Button>
          {missing > 0 && (
            <p className="text-center text-sm font-semibold text-[var(--ink-soft)]">
              {missing === 1
                ? 'Falta 1 jogador para começar'
                : `Faltam ${missing} jogadores para começar`}{' '}
              (mínimo de {MIN_PLAYERS}).
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--line)] px-5 py-5 text-left">
          <Mascot size={40} />
          <p className="font-semibold text-[var(--ink-soft)]">
            Esperando o host começar a partida…
          </p>
        </div>
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
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="mx-auto w-[160px] sm:mx-0 sm:w-full">
          <GameCard text={round.prompt} variant="prompt" />
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          {round.phase === 'SUBMITTING' && (
            <>
              <h1 className="text-2xl font-extrabold">
                {youSubmitted ? 'Carta jogada!' : 'Escolha sua carta'}
              </h1>
              <p className="font-semibold text-[var(--ink-soft)]">
                {round.submittedCount} de {total} jogaram
                {youSubmitted && ' — esperando o resto da mesa…'}
              </p>
            </>
          )}

          {round.phase === 'VOTING' && (
            <>
              <h1 className="text-2xl font-extrabold">
                {round.yourVoteId ? 'Voto registrado!' : 'Vote na melhor'}
              </h1>
              <p className="font-semibold text-[var(--ink-soft)]">
                {round.votedCount} de {total} votaram — você não pode votar na
                sua própria carta.
              </p>
            </>
          )}

          {round.phase === 'REVEAL' && (
            <>
              <h1 className="text-2xl font-extrabold">Resultado da rodada</h1>
              <p className="font-semibold text-[var(--ink-soft)]">
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
          <ul className="space-y-2.5">
            {round.reveal.map((r) => (
              <li
                key={r.id}
                className={
                  'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 px-4 py-3.5 ' +
                  (r.isWinner
                    ? 'border-[var(--gold)] bg-[var(--gold)]/12'
                    : 'border-[var(--line)] bg-[var(--surface)]')
                }
              >
                {r.isWinner && (
                  <Trophy
                    size={17}
                    className="shrink-0 text-[var(--gold)]"
                    aria-label="vencedora"
                  />
                )}
                <span className="flex-1 font-bold">{r.filled}</span>
                <span className="text-sm font-semibold text-[var(--ink-soft)]">
                  {r.playerName}
                  {r.isMine && ' (você)'}
                </span>
                <span className="text-sm font-extrabold tabular-nums">
                  {r.votes} {r.votes === 1 ? 'voto' : 'votos'}
                </span>
              </li>
            ))}
          </ul>

          {isHost && (
            <Button
              size="lg"
              onClick={onNext}
              disabled={pending}
              className="w-full"
            >
              {pending ? <Loader2 className="animate-spin" /> : 'Próxima rodada'}
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
  const tie = state.champions.length > 1

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Mascot size={104} mood="happy" />
      <div>
        <h1 className="text-3xl font-extrabold">
          {tie ? 'Empate!' : 'Temos um campeão!'}
        </h1>
        <p className="mt-2 text-lg font-bold">
          {state.champions.map((c) => c.name).join(' e ')}
        </p>
        <p className="font-semibold text-[var(--ink-soft)]">
          {state.champions[0]?.score} pontos
        </p>
      </div>
      <Button size="lg" onClick={onHome} className="w-full max-w-xs">
        Voltar ao início
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
