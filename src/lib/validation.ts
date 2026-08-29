import { GameError } from '@/lib/game'

export { MAX_NAME_LENGTH } from '@/lib/constants'
import { MAX_NAME_LENGTH } from '@/lib/constants'

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
