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
