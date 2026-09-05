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

/**
 * Cartas de som na mao. Pequeno de proposito: a biblioteca tem poucas dezenas
 * de sons, e mao grande faria dois jogadores caírem com o mesmo som na mesa.
 */
export const SOUND_HAND_SIZE = 3
export const SOUND_EVERY_RANGE = { min: 2, max: 10 } as const

/**
 * Cartas de imagem na mao. Menor que a de texto pelo mesmo motivo da de som: a
 * biblioteca tem poucas dezenas, e mao grande faria dois jogadores caírem com
 * a mesma imagem na mesa.
 */
export const IMAGE_HAND_SIZE = 3
export const IMAGE_EVERY_RANGE = { min: 2, max: 10 } as const

/**
 * Prazo de cada fase da rodada, em segundos. 0 desliga.
 *
 * O minimo de 15s nao e enfeite: abaixo disso nem da tempo de ler as cartas da
 * mao, e a rodada viraria sorteio. O maximo evita que alguem que fechou a aba
 * deixe a mesa parada por muito tempo.
 */
export const TURN_RANGE = { min: 15, max: 180 } as const
export const DEFAULT_TURN_SECONDS = 60
/** Opcoes oferecidas na tela. Digitar segundo a segundo nao ajudaria ninguem. */
export const TURN_PRESETS = [30, 60, 90] as const
