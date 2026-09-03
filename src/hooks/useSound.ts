'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getSoundState,
  initSound,
  prepareSound,
  playSound,
  setMuted,
  setVolume,
  subscribeSound,
  toggleMuted,
  unlockSound,
  type SoundName,
  type SoundState,
} from '@/lib/sound'

/**
 * Acesso ao som dentro do React.
 *
 * O listener de gesto vive aqui e nao no modulo porque so o componente sabe
 * quando a pagina montou. `once: true` basta: depois do primeiro gesto o
 * contexto existe e o proprio playSound cuida de retomar se for suspenso.
 */
export function useSound() {
  const [state, setState] = useState<SoundState>(() => getSoundState())

  useEffect(() => {
    setState(initSound())
    // Baixa e decodifica os arquivos ja na montagem, para o PRIMEIRO clique
    // sair com o som gravado e nao com a sintese de reserva.
    prepareSound()
    const unsubscribe = subscribeSound(setState)

    const unlock = () => unlockSound()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const play = useCallback((name: SoundName) => playSound(name), [])

  return {
    ...state,
    play,
    setVolume,
    setMuted,
    toggleMuted,
  }
}

/** Só o disparador, para quem não precisa reagir a volume/mudo. */
export function usePlaySound() {
  return useCallback((name: SoundName) => playSound(name), [])
}
