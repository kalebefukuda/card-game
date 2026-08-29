'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '@/lib/gameState'

const POLL_INTERVAL = 1500

type Action = 'start' | 'submit' | 'vote' | 'next-round'

/**
 * Fonte unica do estado da partida.
 *
 * Hoje o estado chega por polling. Toda a UI le daqui, entao trocar por
 * WebSocket (Supabase Realtime) depois e mexer so neste arquivo: basta
 * chamar refresh() quando chegar um evento, mantendo o polling como rede
 * de seguranca se a conexao cair.
 */
export function useGameState(code: string, playerId: string | null) {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Evita que uma resposta lenta sobrescreva um estado mais novo.
  const latest = useRef(0)

  const refresh = useCallback(async () => {
    const ticket = ++latest.current
    try {
      const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ''
      const res = await fetch(`/api/game/${code}/state${query}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (ticket !== latest.current) return
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível carregar a partida')
        return
      }
      setState(data)
      setError(null)
    } catch {
      if (ticket === latest.current) setError('Sem conexão com o servidor')
    } finally {
      if (ticket === latest.current) setLoading(false)
    }
  }, [code, playerId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)

    // Navegador estrangula setInterval em aba de fundo (chega a 1x/minuto), o
    // que faz o jogador voltar pra uma tela velha. Busca na hora ao reabrir.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  /** Dispara uma acao e adota a resposta como novo estado, sem esperar o poll. */
  const act = useCallback(
    async (action: Action, body: Record<string, unknown> = {}) => {
      if (!playerId) return
      setPending(true)
      setError(null)
      try {
        const res = await fetch(`/api/game/${code}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, ...body }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Não foi possível completar a jogada')
          refresh()
          return
        }
        latest.current++
        setState(data)
      } catch {
        setError('Sem conexão com o servidor')
      } finally {
        setPending(false)
      }
    },
    [code, playerId, refresh]
  )

  return { state, error, pending, loading, refresh, act, setError }
}
