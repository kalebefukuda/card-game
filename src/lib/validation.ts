import { DeckMode, EndCondition } from '@prisma/client'
import { GameError } from '@/lib/game'

export { MAX_NAME_LENGTH } from '@/lib/constants'
import {
  MAX_NAME_LENGTH,
  HAND_SIZE,
  HAND_RANGE,
  ROUNDS_RANGE,
  SCORE_RANGE,
  DEFAULT_TARGET_SCORE,
  DEFAULT_ROUND_LIMIT,
} from '@/lib/constants'

/** Nome de jogador: sem espacos nas pontas, nao vazio e com tamanho limitado. */
export function normalizeName(value: unknown) {
  if (typeof value !== 'string') throw new GameError('Informe seu nome', 400)
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name) throw new GameError('Informe seu nome', 400)
  if (name.length > MAX_NAME_LENGTH)
    throw new GameError(`O nome deve ter até ${MAX_NAME_LENGTH} caracteres`, 400)
  return name
}

/** Codigo de sala: sempre maiusculo, 6 caracteres alfanumericos. */
export function normalizeCode(value: unknown) {
  if (typeof value !== 'string') throw new GameError('Informe o código da sala', 400)
  const code = value.trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(code))
    throw new GameError('Código inválido: são 6 letras ou números', 400)
  return code
}

/* ------------------------------------------------------------------ */

function inteiroNoIntervalo(
  value: unknown,
  { min, max }: { min: number; max: number },
  rotulo: string,
  padrao: number
) {
  if (value === undefined || value === null) return padrao
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < min || n > max)
    throw new GameError(`${rotulo} deve ser um numero entre ${min} e ${max}`, 400)
  return n
}

/**
 * Opcoes de partida escolhidas pelo host.
 *
 * A regra que precisa existir aqui e nao no banco: em DEPLETE a mao e todo o
 * estoque da partida, entao pedir mais rodadas do que cartas cria uma partida
 * que termina antes do combinado. Recusamos na entrada, com mensagem, em vez
 * de deixar o jogador descobrir no meio do jogo.
 */
export function normalizeGameOptions(body: Record<string, unknown>) {
  const endCondition =
    body.endCondition === EndCondition.ROUND_LIMIT
      ? EndCondition.ROUND_LIMIT
      : body.endCondition === undefined || body.endCondition === EndCondition.TARGET_SCORE
        ? EndCondition.TARGET_SCORE
        : (() => {
            throw new GameError('Condicao de fim invalida', 400)
          })()

  const deckMode =
    body.deckMode === undefined
      ? DeckMode.REFILL
      : body.deckMode === DeckMode.REFILL ||
          body.deckMode === DeckMode.FRESH ||
          body.deckMode === DeckMode.DEPLETE
        ? (body.deckMode as DeckMode)
        : (() => {
            throw new GameError('Modo de baralho invalido', 400)
          })()

  const targetScore = inteiroNoIntervalo(
    body.targetScore,
    SCORE_RANGE,
    'A pontuacao',
    DEFAULT_TARGET_SCORE
  )
  const roundLimit = inteiroNoIntervalo(
    body.roundLimit,
    ROUNDS_RANGE,
    'O numero de rodadas',
    DEFAULT_ROUND_LIMIT
  )
  const handSize = inteiroNoIntervalo(body.handSize, HAND_RANGE, 'A mao', HAND_SIZE)

  if (
    deckMode === DeckMode.DEPLETE &&
    endCondition === EndCondition.ROUND_LIMIT &&
    roundLimit > handSize
  ) {
    throw new GameError(
      `No modo "so diminui" a mao acaba em ${handSize} rodadas, ` +
        `entao nao da para pedir ${roundLimit}. Aumente a mao ou reduza as rodadas.`,
      400
    )
  }

  return { endCondition, targetScore, roundLimit, deckMode, handSize }
}
