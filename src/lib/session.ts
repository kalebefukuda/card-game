/**
 * Identidade do jogador guardada no navegador, por sala.
 *
 * Antes o nome viajava na querystring (?name=), entao fechar a aba perdia a
 * vaga na partida. Guardando o playerId por codigo de sala, o jogador volta
 * pro mesmo lugar mesmo depois de recarregar.
 */
const key = (code: string) => `cjc:player:${code.toUpperCase()}`

export function savePlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(key(code), playerId)
  } catch {
    // Navegador com storage bloqueado: a partida ainda funciona nesta aba.
  }
}

export function loadPlayerId(code: string): string | null {
  try {
    return localStorage.getItem(key(code))
  } catch {
    return null
  }
}

export function clearPlayerId(code: string) {
  try {
    localStorage.removeItem(key(code))
  } catch {
    // sem storage, nada a limpar
  }
}

const NAME_KEY = 'cjc:name'

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // ignora
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
