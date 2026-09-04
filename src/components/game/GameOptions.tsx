'use client'

import { Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { playSound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import {
  HAND_RANGE,
  ROUNDS_RANGE,
  SCORE_RANGE,
  SOUND_EVERY_RANGE,
  DEFAULT_TARGET_SCORE,
  DEFAULT_ROUND_LIMIT,
  HAND_SIZE,
} from '@/lib/constants'

export type EndConditionValue = 'TARGET_SCORE' | 'ROUND_LIMIT'
export type DeckModeValue = 'REFILL' | 'FRESH' | 'DEPLETE'

export type GameOptionsValue = {
  endCondition: EndConditionValue
  targetScore: number
  roundLimit: number
  deckMode: DeckModeValue
  handSize: number
  /** A cada quantas rodadas entra uma de som. 0 desliga. */
  soundEvery: number
}

export const DEFAULT_OPTIONS: GameOptionsValue = {
  endCondition: 'TARGET_SCORE',
  targetScore: DEFAULT_TARGET_SCORE,
  roundLimit: DEFAULT_ROUND_LIMIT,
  deckMode: 'REFILL',
  handSize: HAND_SIZE,
  soundEvery: 0,
}

const DECK_LABELS: Record<DeckModeValue, { titulo: string; ajuda: string }> = {
  REFILL: {
    titulo: 'Clássico',
    ajuda: 'Joga uma carta, compra uma. A mão muda devagar.',
  },
  FRESH: {
    titulo: 'Mão nova',
    ajuda: 'Sete cartas novas a cada rodada. Bem mais imprevisível.',
  },
  DEPLETE: {
    titulo: 'Só diminui',
    ajuda: 'A mão inicial é todo o seu estoque e define a duração da partida.',
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

export function GameOptions({
  value,
  onChange,
  open,
  onToggle,
}: {
  value: GameOptionsValue
  onChange: (v: GameOptionsValue) => void
  open: boolean
  onToggle: () => void
}) {
  const set = <K extends keyof GameOptionsValue>(
    key: K,
    v: GameOptionsValue[K]
  ) => onChange({ ...value, [key]: v })

  const conflito = optionsConflict(value)
  const porPontos = value.endCondition === 'TARGET_SCORE'

  // Em DEPLETE a mao dita a duracao, entao o resumo mostra isso e nao as rodadas.
  const resumo = [
    value.deckMode === 'DEPLETE'
      ? `${value.handSize} rodadas`
      : porPontos
        ? `${value.targetScore} pts`
        : `${value.roundLimit} rodadas`,
    DECK_LABELS[value.deckMode].titulo.toLowerCase(),
    ...(value.soundEvery > 0 ? [`som a cada ${value.soundEvery}`] : []),
  ].join(' · ')

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          playSound('click')
          onToggle()
        }}
        className="flex w-full items-center gap-2 text-sm font-bold"
      >
        <SlidersHorizontal size={16} />
        Opções da partida
        <span className="ml-auto font-semibold text-[var(--ink-soft)]">
          {resumo}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-5 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] p-4">
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
              {(Object.keys(DECK_LABELS) as DeckModeValue[]).map((modo) => {
                const ativo = value.deckMode === modo
                return (
                  <button
                    key={modo}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      playSound('click')
                      set('deckMode', modo)
                    }}
                    className={cn(
                      'w-full rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] p-3 text-left transition-colors',
                      ativo
                        ? 'bg-[var(--ink)] text-[var(--paper)]'
                        : 'bg-[var(--paper)] hover:bg-black/5'
                    )}
                  >
                    <span className="block text-sm font-bold">
                      {DECK_LABELS[modo].titulo}
                    </span>
                    <span
                      className={cn(
                        'block text-xs font-semibold',
                        ativo ? 'opacity-75' : 'text-[var(--ink-soft)]'
                      )}
                    >
                      {DECK_LABELS[modo].ajuda}
                    </span>
                  </button>
                )
              })}
            </div>

            <Contador
              rotulo="Cartas na mão"
              valor={value.handSize}
              min={HAND_RANGE.min}
              max={HAND_RANGE.max}
              onChange={(n) => set('handSize', n)}
            />
          </Campo>

          <Campo rotulo="Rodada de som">
            <button
              type="button"
              aria-pressed={value.soundEvery > 0}
              onClick={() => {
                playSound('click')
                set('soundEvery', value.soundEvery > 0 ? 0 : 3)
              }}
              className={cn(
                'w-full rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] p-3 text-left transition-colors',
                value.soundEvery > 0
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'bg-[var(--paper)] hover:bg-black/5'
              )}
            >
              <span className="block text-sm font-bold">
                {value.soundEvery > 0 ? 'Ligada' : 'Desligada'}
              </span>
              <span
                className={cn(
                  'block text-xs font-semibold',
                  value.soundEvery > 0 ? 'opacity-75' : 'text-[var(--ink-soft)]'
                )}
              >
                A mão vira cartas de som e a mesa vota no melhor áudio.
              </span>
            </button>

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

          {conflito && (
            <p
              role="alert"
              className="rounded-[var(--radius)] bg-black/[0.06] px-3 py-2.5 text-xs font-bold"
            >
              {conflito}
            </p>
          )}
        </div>
      )}
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
              'h-11 flex-1 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] text-xs font-bold uppercase transition-colors',
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
