'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Loader2, Pause, Play, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GameCard } from '@/components/game/GameCard'
import { SoundCard } from '@/components/game/SoundCard'
import { Scoreboard } from '@/components/game/Scoreboard'
import { Mark } from '@/components/brand/Mark'
import { Logo } from '@/components/brand/Logo'
import { playSound, playSoundCard, stopSoundCard } from '@/lib/sound'
import { SoundControl } from '@/components/sound/SoundControl'
import { useGameState } from '@/hooks/useGameState'
import type { RevealView, SoundCardView } from '@/lib/gameState'
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

  /*
   * Som das viradas de fase. O estado chega por polling, entao o efeito roda
   * varias vezes com o mesmo conteudo — a chave de fase guardada num ref e o
   * que impede o som de repetir a cada resposta. A primeira carga nunca toca:
   * entrar numa sala nao e um evento.
   */
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const cue = useRef<string | null>(null)
  const knownPlayers = useRef<number | null>(null)

  useEffect(() => {
    if (!state) return

    const key =
      state.status === 'FINISHED'
        ? 'finished'
        : `${state.round?.number ?? 0}:${state.round?.phase ?? 'none'}`

    if (cue.current !== key) {
      const first = cue.current === null
      cue.current = key

      if (!first) {
        if (state.status === 'FINISHED') {
          playSound('gameWin')
        } else if (state.round?.phase === 'REVEAL') {
          const won = state.round.reveal.some((r) => r.isMine && r.isWinner)
          playSound(won ? 'roundWin' : 'roundLose')
        } else if (state.round?.phase === 'SUBMITTING') {
          playSound('start')
        }
      }
    }

    // Alguem entrou na sala: avisa quem esta esperando no lobby.
    const count = state.players.length
    if (knownPlayers.current !== null && count > knownPlayers.current) {
      playSound('join')
    }
    knownPlayers.current = count
  }, [state])

  if (!ready || (loading && !state)) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Mark size={72} />
        <Loader2 className="animate-spin text-[var(--ink-soft)]" />
      </main>
    )
  }

  // Sala inexistente: nao adianta pedir nome.
  if (!state && error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <Mark size={96} />
        <div>
          <h1 className="text-2xl font-bold">{error}</h1>
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

  /*
   * Quantas rodadas a partida tem, quando isso e conhecido. Em DEPLETE a mao
   * inicial e o limite real, mesmo com a condicao de fim por pontos — por isso
   * ela entra aqui e nao so o roundLimit.
   */
  /*
   * So o host encerra, e so enquanto a partida esta viva. Depois de acabar,
   * sair e so navegar — nao ha nada para interromper.
   */
  const podeEncerrar =
    isHost && (state.status === 'LOBBY' || state.status === 'IN_PROGRESS')

  const roundsTotal =
    state.deckMode === 'DEPLETE'
      ? state.handSize
      : state.endCondition === 'ROUND_LIMIT'
        ? state.roundLimit
        : null

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          {podeEncerrar ? (
            <button
              type="button"
              onClick={() => {
                playSound('click')
                setConfirmandoSaida(true)
              }}
              aria-label="Sair da partida"
            >
              <Logo size={30} compact />
            </button>
          ) : (
            <Link href="/" aria-label="Voltar ao início">
              <Logo size={30} compact />
            </Link>
          )}

          <div className="flex items-center gap-3">
            {round && state.status === 'IN_PROGRESS' && (
              <span className="kicker text-[var(--ink-soft)]">
                Rodada {round.number}
                {roundsTotal ? ` de ${roundsTotal}` : ''}
              </span>
            )}
            <RoomCode code={roomCode} />
            <SoundControl />
          </div>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="bg-[var(--ink)] px-4 py-2.5 text-center text-sm font-bold text-white"
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
              onSubmitSound={(soundCardId) => act('submit', { soundCardId })}
              onVote={(submissionId) => act('vote', { submissionId })}
              onNext={() => act('next-round')}
            />
          )}

          {state.status === 'FINISHED' && (
            <Finished state={state} onHome={() => router.push('/')} />
          )}

          {state.status === 'ABANDONED' && (
            <Abandoned onHome={() => router.push('/')} />
          )}
        </section>

        <div className="md:order-last">
          <Scoreboard state={state} youId={you.id} />
        </div>
      </main>

      {confirmandoSaida && (
        <LeaveDialog
          emAndamento={state.status === 'IN_PROGRESS'}
          pending={pending}
          onCancel={() => setConfirmandoSaida(false)}
          onConfirm={async () => {
            await act('leave')
            router.push('/')
          }}
        />
      )}
    </div>
  )
}

/**
 * Confirmacao de saida do host.
 *
 * Existe porque sair do host encerra a partida de todo mundo, e antes disso
 * acontecia sem aviso: o host clicava no logo por reflexo e os outros ficavam
 * numa sala sem quem puxasse a proxima rodada.
 */
function LeaveDialog({
  emAndamento,
  pending,
  onCancel,
  onConfirm,
}: {
  emAndamento: boolean
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  // Esc fecha: dialogo sem saida pelo teclado prende quem nao usa mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-sair"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise w-full max-w-sm rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-hard"
      >
        <h2 id="titulo-sair" className="text-xl font-bold">
          Encerrar a partida?
        </h2>
        <p className="mt-2 font-semibold text-[var(--ink-soft)]">
          {emAndamento
            ? 'Você é o host. Se sair agora, a partida acaba para todos e ninguém vence.'
            : 'Você é o host. Se sair agora, a sala fecha para todos.'}
        </p>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
            autoFocus
          >
            Continuar jogando
          </Button>
          <Button onClick={onConfirm} disabled={pending} className="flex-1">
            {pending ? <Loader2 className="animate-spin" /> : 'Encerrar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Tela de quem ficou quando o host abandonou a partida. */
function Abandoned({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Mark size={104} />
      <div>
        <h1 className="text-3xl font-extrabold">O host saiu</h1>
        <p className="mt-2 font-semibold text-[var(--ink-soft)]">
          A partida foi encerrada. Ninguém venceu esta — comecem outra.
        </p>
      </div>
      <Button size="lg" onClick={onHome} className="w-full max-w-xs">
        Voltar ao início
      </Button>
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
      className="roomcode flex h-11 items-center gap-2 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] px-3.5 text-base shadow-hard-sm transition-[transform,box-shadow] duration-[120ms] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      {code}
      {copied ? (
        <Check size={15} className="text-[var(--ink)]" />
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
      <Mark size={96} />
      <div>
        <h1 className="text-2xl font-bold">Entrar na partida</h1>
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
          className="w-full rounded-[var(--radius)] bg-black/[0.06] px-4 py-3 text-sm font-bold text-[var(--ink)]"
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
        <h1 className="text-3xl font-bold">Sala de espera</h1>
        <p className="mt-1.5 font-semibold text-[var(--ink-soft)]">
          Toque no código lá em cima para copiar o convite. Primeiro a chegar em{' '}
          {state.targetScore} pontos vence.
        </p>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {state.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2.5 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-bold"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
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
              className="flex items-center gap-2.5 rounded-[var(--radius)] border-2 border-dashed border-[var(--line-soft)] px-4 py-3 font-semibold text-[var(--ink-soft)]"
            >
              <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-[var(--line-soft)]" />
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
        <div className="flex items-center gap-3 rounded-[var(--radius)] border-2 border-dashed border-[var(--line-soft)] px-5 py-5 text-left">
          <Mark size={40} />
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
  onSubmitSound,
  onVote,
  onNext,
}: {
  state: NonNullable<ReturnType<typeof useGameState>['state']>
  pending: boolean
  isHost: boolean
  onSubmit: (card: string) => void
  onSubmitSound: (soundCardId: string) => void
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
              <h1 className="text-2xl font-bold">
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
              <h1 className="text-2xl font-bold">
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
              <h1 className="text-2xl font-bold">Resultado da rodada</h1>
              <p className="font-semibold text-[var(--ink-soft)]">
                {isHost
                  ? 'Quando quiser, puxe a próxima rodada.'
                  : 'Esperando o host puxar a próxima rodada…'}
              </p>
            </>
          )}
        </div>
      </div>

      {round.phase === 'SUBMITTING' && !youSubmitted && round.kind === 'SOUND' && (
        <SoundGrid>
          {you.soundHand.map((s) => (
            <SoundCard
              key={s.id}
              sound={s}
              actionLabel="Jogar esta"
              disabled={pending}
              onAction={() => onSubmitSound(s.id)}
            />
          ))}
        </SoundGrid>
      )}

      {round.phase === 'SUBMITTING' && !youSubmitted && round.kind === 'TEXT' && (
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

      {round.phase === 'VOTING' && round.kind === 'SOUND' && (
        <SoundGrid>
          {round.submissions.map((s) =>
            s.sound ? (
              <SoundCard
                key={s.id}
                sound={s.sound}
                actionLabel="Votar nesta"
                badge={s.isMine ? 'sua' : undefined}
                selected={round.yourVoteId === s.id}
                disabled={s.isMine || !!round.yourVoteId || pending}
                onAction={s.isMine ? undefined : () => onVote(s.id)}
              />
            ) : null
          )}
        </SoundGrid>
      )}

      {round.phase === 'VOTING' && round.kind === 'TEXT' && (
        <CardGrid>
          {round.submissions.map((s) => (
            <GameCard
              key={s.id}
              text={s.card}
              badge={s.isMine ? 'sua' : undefined}
              sound="vote"
              selected={round.yourVoteId === s.id}
              disabled={s.isMine || !!round.yourVoteId || pending}
              onClick={s.isMine ? undefined : () => onVote(s.id)}
            />
          ))}
        </CardGrid>
      )}

      {round.phase === 'REVEAL' && (
        <>
          <RoundWinner reveal={round.reveal} />

          <ul className="space-y-2.5">
            {round.reveal
              .filter((r) => !r.isWinner)
              .map((r) => (
              <li
                key={r.id}
                className={
                  'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius)] border-2 px-4 py-3.5 ' +
                  'border-[var(--ink)] bg-[var(--paper)]'
                }
              >
                {r.sound ? (
                  <span className="flex flex-1 items-center gap-2.5">
                    <PlaySound sound={r.sound} />
                    <span className="font-bold">{r.sound.name}</span>
                  </span>
                ) : (
                  <span className="flex-1 font-bold">{r.filled}</span>
                )}
                <span className="text-sm font-semibold text-[var(--ink-soft)]">
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
      <Mark size={112} />
      <div>
        <h1 className="text-3xl font-bold">
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

/**
 * Destaque do vencedor da rodada.
 *
 * A lista plana antiga tratava a carta vencedora como uma linha entre outras —
 * o momento mais divertido da rodada passava sem enfase. Aqui a carta vem
 * grande e invertida, com o nome de quem jogou e o ponto somado a vista.
 * Empate mostra todos os empatados, porque todos pontuam.
 */
function RoundWinner({ reveal }: { reveal: RevealView[] }) {
  const winners = reveal.filter((r) => r.isWinner)
  if (winners.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border-[length:var(--border-w)] border-dashed border-[var(--line-soft)] px-5 py-6 text-center">
        <p className="font-bold">Ninguém votou nesta rodada.</p>
        <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">
          Rodada sem ponto para ninguém.
        </p>
      </div>
    )
  }

  const empate = winners.length > 1

  return (
    <div className="animate-rise rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--ink)] p-5 text-[var(--paper)] shadow-hard [--mark-invert:1]">
      <p className="kicker flex items-center gap-2 opacity-70">
        <Trophy size={14} />
        {empate ? 'Empate na rodada' : 'Vencedora da rodada'}
      </p>

      <div className="mt-3 space-y-4">
        {winners.map((w) => (
          <div key={w.id}>
            {w.sound ? (
              <p className="flex items-center gap-3 text-xl leading-snug font-bold">
                <PlaySound sound={w.sound} invertido />
                {w.sound.name}
              </p>
            ) : (
              <p className="text-xl leading-snug font-bold text-balance">
                {w.filled}
              </p>
            )}
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
              <span className="text-base">
                {w.playerName}
                {w.isMine && ' (você)'}
              </span>
              <span className="opacity-70">
                {w.votes} {w.votes === 1 ? 'voto' : 'votos'}
              </span>
              <span className="ml-auto rounded-full bg-[var(--paper)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">
                +1 ponto
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Botao de tocar usado na revelacao. Existe porque encaixar o nome do som na
 * frase ("...pesquisa de Som 08") nao diz nada: numa rodada de som a piada e o
 * audio, entao a revelacao precisa deixar ouvir de novo.
 */
function PlaySound({
  sound,
  invertido = false,
}: {
  sound: SoundCardView
  invertido?: boolean
}) {
  const [tocando, setTocando] = useState(false)

  return (
    <button
      type="button"
      aria-label={`Ouvir ${sound.name}`}
      onClick={async () => {
        if (tocando) {
          stopSoundCard()
          return setTocando(false)
        }
        const dur = await playSoundCard(sound.url, sound.gain)
        if (dur === null) return
        setTocando(true)
        window.setTimeout(() => setTocando(false), dur * 1000)
      }}
      className={
        'grid size-10 shrink-0 place-items-center rounded-full border-[length:var(--border-w)] transition-transform duration-[120ms] active:scale-95 ' +
        (invertido
          ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]'
          : 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]')
      }
    >
      {tocando ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
    </button>
  )
}

/** Carta de som e larga e baixa, ao contrario da carta de texto em retrato. */
function SoundGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  )
}
