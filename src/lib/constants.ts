/**
 * Constantes compartilhadas entre servidor e navegador.
 *
 * Vive separado de game.ts de proposito: aquele arquivo importa o Prisma, que
 * nao pode entrar no bundle do cliente.
 */
export const HAND_SIZE = 7
export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8
export const DEFAULT_TARGET_SCORE = 5
export const MAX_NAME_LENGTH = 20
export const ROOM_CODE_LENGTH = 6

/** Limites das opcoes de partida. Compartilhados entre a API e a tela. */
export const SCORE_RANGE = { min: 3, max: 15 } as const
export const ROUNDS_RANGE = { min: 3, max: 20 } as const
export const HAND_RANGE = { min: 5, max: 12 } as const
export const DEFAULT_ROUND_LIMIT = 8
