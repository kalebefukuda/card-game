'use client'

import { useEffect } from 'react'
import { Loader2, Minus, Plus } from 'lucide-react'
import { playSound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  HAND_RANGE,
  ROUNDS_RANGE,
  SCORE_RANGE,
  SOUND_EVERY_RANGE,
  DEFAULT_TARGET_SCORE,
  DEFAULT_ROUND_LIMIT,
  DEFAULT_TURN_SECONDS,
  TURN_PRESETS,
  HAND_SIZE,
} from '@/lib/constants'

export type EndConditionValue = 'TARGET_SCORE' | 'ROUND_LIMIT'
/**
 * REFILL saiu daqui: a mao mudava tao pouco entre rodadas que a mesa reclamava
 * de jogar sempre as mesmas cartas. Continua no enum do banco porque partidas
 * antigas gravaram esse valor, mas nao e mais oferecido.
 */
export type DeckModeValue = 'FRESH' | 'DEPLETE'

export type GameOptionsValue = {
  endCondition: EndConditionValue
  targetScore: number
  roundLimit: number
  deckMode: DeckModeValue
  handSize: number
  /** A cada quantas rodadas entra uma de som. 0 desliga. */
  soundEvery: number
  /** Segundos por fase da rodada. 0 desliga o prazo. */
  turnSeconds: number
}

export const DEFAULT_OPTIONS: GameOptionsValue = {
  endCondition: 'TARGET_SCORE',
  targetScore: DEFAULT_TARGET_SCORE,
  roundLimit: DEFAULT_ROUND_LIMIT,
  deckMode: 'DEPLETE',
  handSize: HAND_SIZE,
  soundEvery: 0,
  turnSeconds: DEFAULT_TURN_SECONDS,
}

const DECK_LABELS: Record<DeckModeValue, { titulo: string; ajuda: string }> = {
  DEPLETE: {
    titulo: 'Só diminui',
    ajuda: 'Você começa com uma mão e ela nunca é reposta: cada rodada tem uma carta menos. A mão define quantas rodadas a partida dura.',
  },
  FRESH: {
    titulo: 'Mão nova',
    ajuda: 'Cartas sorteadas de novo a cada rodada. A mão nunca é a mesma duas vezes.',
  },
}

/**
 * Conflito que o jogador precisa ver antes de tentar criar a sala: em DEPLETE
 * a mao e todo o estoque, entao pedir mais rodadas do que cartas monta uma
 * partida que acaba antes do combinado. A API tambem recusa — isto aqui evita
 * a ida e volta.
 */
export function optionsConflict(v: GameOptionsValue): string | null {
  if (
    v.deckMode === 'DEPLETE' &&
    v.endCondition === 'ROUND_LIMIT' &&
    v.roundLimit > v.handSize
  ) {
    return `Com "só diminui" e mão de ${v.handSize}, a partida acaba em ${v.handSize} rodadas. Reduza as rodadas ou aumente a mão.`
  }
  return null
}

/**
 * Ajustes da partida, em dialogo.
 *
 * Antes eram uma secao recolhida na tela inicial, e ficavam invisiveis: quem
 * criava a partida nem sabia que dava para escolher rodada de som ou prazo.
 * Agora "Criar partida" abre isto, e a sala e criada daqui — as opcoes deixam
 * de ser um detalhe escondido e passam a ser o passo da criacao.
 */
export function GameOptionsDialog({
  value,
  onChange,
  onConfirm,
  onCancel,
  pending = false,
  error,
}: {
  value: GameOptionsValue
  onChange: (v: GameOptionsValue) => void
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  error?: string | null
}) {
  const set = <K extends keyof GameOptionsValue>(
    key: K,
    v: GameOptionsValue[K]
  ) => onChange({ ...value, [key]: v })

  // Esc fecha: dialogo sem saida pelo teclado prende quem nao usa mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const conflito = optionsConflict(value)
  const porPontos = value.endCondition === 'TARGET_SCORE'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 sm:p-5"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-opcoes"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise flex max-h-[90dvh] w-full max-w-md flex-col rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] shadow-hard"
      >
        <div className="border-b-[length:var(--border-w)] border-[var(--ink)] px-6 py-5">
          <h2 id="titulo-opcoes" className="text-xl font-bold">
            Como vão jogar?
          </h2>
        </div>

        {/* Rola por dentro: em telas pequenas as opcoes nao caberiam de uma vez. */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Campo rotulo="Como a partida acaba">
            <Segmentado
              opcoes={[
                { valor: 'TARGET_SCORE', rotulo: 'Por pontos' },
                { valor: 'ROUND_LIMIT', rotulo: 'Por rodadas' },
              ]}
              valor={value.endCondition}
              onChange={(v) => set('endCondition', v as EndConditionValue)}
            />
            {porPontos ? (
              <Contador
                rotulo="Pontos para vencer"
                valor={value.targetScore}
                min={SCORE_RANGE.min}
                max={SCORE_RANGE.max}
                onChange={(n) => set('targetScore', n)}
              />
            ) : (
              <Contador
                rotulo="Rodadas"
                valor={value.roundLimit}
                min={ROUNDS_RANGE.min}
                max={ROUNDS_RANGE.max}
                onChange={(n) => set('roundLimit', n)}
              />
            )}
          </Campo>

          <Campo rotulo="Baralho">
            <div className="space-y-2">
              {(Object.keys(DECK_LABELS) as DeckModeValue[]).map((modo) => (
                <Opcao
                  key={modo}
                  ativo={value.deckMode === modo}
                  titulo={DECK_LABELS[modo].titulo}
                  ajuda={DECK_LABELS[modo].ajuda}
                  onClick={() => set('deckMode', modo)}
                />
              ))}
            </div>

            <Contador
              rotulo="Cartas na mão"
              valor={value.handSize}
              min={HAND_RANGE.min}
              max={HAND_RANGE.max}
              onChange={(n) => set('handSize', n)}
            />
          </Campo>

          <Campo rotulo="Prazo da rodada">
            <Segmentado
              opcoes={[
                ...TURN_PRESETS.map((s) => ({
                  valor: String(s),
                  rotulo: `${s}s`,
                })),
                { valor: '0', rotulo: 'Sem prazo' },
              ]}
              valor={String(value.turnSeconds)}
              onChange={(v) => set('turnSeconds', Number(v))}
            />
            <p className="text-xs font-semibold text-[var(--ink-soft)]">
              {value.turnSeconds > 0
                ? `Vale para jogar e para votar. Quem não agir em ${value.turnSeconds}s entra com uma escolha sorteada, e a rodada segue.`
                : 'A rodada espera por todos. Um jogador ausente trava a mesa.'}
            </p>
          </Campo>

          <Campo rotulo="Rodada de som">
            <Opcao
              ativo={value.soundEvery > 0}
              titulo={value.soundEvery > 0 ? 'Ligada' : 'Desligada'}
              ajuda="A mão vira cartas de som e a mesa vota no melhor áudio."
              onClick={() => set('soundEvery', value.soundEvery > 0 ? 0 : 3)}
            />

            {value.soundEvery > 0 && (
              <Contador
                rotulo="A cada quantas rodadas"
                valor={value.soundEvery}
                min={SOUND_EVERY_RANGE.min}
                max={SOUND_EVERY_RANGE.max}
                onChange={(n) => set('soundEvery', n)}
              />
            )}
          </Campo>
        </div>

        <div className="space-y-3 border-t-[length:var(--border-w)] border-[var(--ink)] px-6 py-5">
          {(conflito || error) && (
            <p
              role="alert"
              className="rounded-[var(--radius)] bg-black/[0.06] px-3 py-2.5 text-xs font-bold"
            >
              {conflito ?? error}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              Voltar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={pending || conflito !== null}
              className="flex-1"
            >
              {pending ? <Loader2 className="animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({
  rotulo,
  children,
}: {
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <p className="kicker text-[var(--ink-soft)]">{rotulo}</p>
      {children}
    </div>
  )
}

/** Cartao selecionavel com titulo e explicacao. */
function Opcao({
  ativo,
  titulo,
  ajuda,
  onClick,
}: {
  ativo: boolean
  titulo: string
  ajuda: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={() => {
        playSound('click')
        onClick()
      }}
      className={cn(
        'w-full rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] p-3 text-left transition-colors',
        ativo
          ? 'bg-[var(--ink)] text-[var(--paper)]'
          : 'bg-[var(--paper)] hover:bg-black/5'
      )}
    >
      <span className="block text-sm font-bold">{titulo}</span>
      <span
        className={cn(
          'block text-xs font-semibold',
          ativo ? 'opacity-75' : 'text-[var(--ink-soft)]'
        )}
      >
        {ajuda}
      </span>
    </button>
  )
}

function Segmentado({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: string; rotulo: string }[]
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => {
              playSound('click')
              onChange(o.valor)
            }}
            className={cn(
              'h-11 flex-1 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] px-1 text-xs font-bold uppercase transition-colors',
              ativo
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:bg-black/5'
            )}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

function Contador({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const passo = (delta: number) => {
    const proximo = Math.min(max, Math.max(min, valor + delta))
    if (proximo === valor) return
    playSound('click')
    onChange(proximo)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold">{rotulo}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${rotulo}`}
          disabled={valor <= min}
          onClick={() => passo(-1)}
          className="grid size-10 place-items-center rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] disabled:opacity-30"
        >
          <Minus size={16} />
        </button>
        <span className="w-8 text-center text-base font-bold tabular-nums">
          {valor}
        </span>
        <button
          type="button"
          aria-label={`Aumentar ${rotulo}`}
          disabled={valor >= max}
          onClick={() => passo(1)}
          className="grid size-10 place-items-center rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
