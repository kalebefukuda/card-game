'use client'

import {
  Image as ImageIcon,
  ImageOff,
  Minus,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { playSound } from '@/lib/sound'
import { cn } from '@/lib/utils'
import {
  HAND_RANGE,
  ROUNDS_RANGE,
  SCORE_RANGE,
  SOUND_EVERY_RANGE,
  IMAGE_EVERY_RANGE,
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
  /** A cada quantas rodadas entra uma de imagem. 0 desliga. */
  imageEvery: number
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
  imageEvery: 0,
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
 * Ajustes da partida.
 *
 * Ja foi secao recolhida na tela inicial — invisivel, quem criava nem sabia que
 * dava para escolher rodada de som ou prazo — e depois dialogo, apertado: as
 * opcoes nao cabiam de uma vez numa caixa e cada uma precisa de uma linha
 * explicando o que faz. Agora e o corpo da tela /new-game, com espaco para
 * isso, e a navegacao normal do app serve de saida.
 */
export function GameOptionsForm({
  value,
  onChange,
}: {
  value: GameOptionsValue
  onChange: (v: GameOptionsValue) => void
}) {
  const set = <K extends keyof GameOptionsValue>(
    key: K,
    v: GameOptionsValue[K]
  ) => onChange({ ...value, [key]: v })

  const porPontos = value.endCondition === 'TARGET_SCORE'

  return (
    <div className="space-y-8">
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
          icone={
            value.soundEvery > 0 ? <Volume2 size={22} /> : <VolumeX size={22} />
          }
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

      <Campo rotulo="Rodada de imagem">
        <Opcao
          ativo={value.imageEvery > 0}
          titulo={value.imageEvery > 0 ? 'Ligada' : 'Desligada'}
          ajuda="A mão vira figurinhas e memes, e a mesa vota na melhor imagem."
          icone={
            value.imageEvery > 0 ? (
              <ImageIcon size={22} />
            ) : (
              <ImageOff size={22} />
            )
          }
          onClick={() => set('imageEvery', value.imageEvery > 0 ? 0 : 3)}
        />

        {value.imageEvery > 0 && (
          <Contador
            rotulo="A cada quantas rodadas"
            valor={value.imageEvery}
            min={IMAGE_EVERY_RANGE.min}
            max={IMAGE_EVERY_RANGE.max}
            onChange={(n) => set('imageEvery', n)}
          />
        )}

        {value.soundEvery > 0 && value.imageEvery > 0 && (
          <p className="text-xs font-semibold text-[var(--ink-soft)]">
            Quando as duas caem na mesma rodada, elas se revezam — uma vez som,
            a próxima imagem.
          </p>
        )}
      </Campo>
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

/**
 * Cartao selecionavel com titulo e explicacao.
 *
 * `icone` e opcional: a rodada de som usa um, porque ligada e desligada sao
 * duas palavras parecidas num cartao de texto igual aos outros, e a diferenca
 * passava batida. O icone diz o estado antes de alguem ler.
 */
function Opcao({
  ativo,
  titulo,
  ajuda,
  icone,
  onClick,
}: {
  ativo: boolean
  titulo: string
  ajuda: string
  icone?: React.ReactNode
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
        'flex w-full items-center gap-3 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] p-3 text-left transition-colors',
        ativo
          ? 'bg-[var(--ink)] text-[var(--paper)]'
          : 'bg-[var(--paper)] hover:bg-black/5'
      )}
    >
      {icone && (
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border-[length:var(--border-w)]',
            ativo
              ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]'
              : 'border-[var(--ink)] text-[var(--ink)]'
          )}
        >
          {icone}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{titulo}</span>
        <span
          className={cn(
            'block text-xs font-semibold',
            ativo ? 'opacity-75' : 'text-[var(--ink-soft)]'
          )}
        >
          {ajuda}
        </span>
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
