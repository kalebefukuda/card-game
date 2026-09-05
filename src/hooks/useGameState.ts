'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '@/lib/gameState'

const POLL_INTERVAL = 1500

type Action = 'start' | 'submit' | 'vote' | 'next-round' | 'leave'

/**
 * Fonte unica do estado da partida.
 *
 * Hoje o estado chega por polling. Toda a UI le daqui, entao trocar por
 * WebSocket (Supabase Realtime) depois e mexer so neste arquivo: basta
 * chamar refresh() quando chegar um evento, mantendo o polling como rede
 * de seguranca se a conexao cair.
 */
export function useGameState(
  code: string,
  playerId: string | null,
  /**
   * So comeca a buscar quando o chamador ja sabe quem e o jogador.
   *
   * O playerId vem do localStorage, que so existe depois da montagem — e a
   * primeira busca saia antes disso, sem identidade. A resposta vinha com
   * `you: null` e a tela pedia o nome de quem acabou de digitar o nome, ate o
   * poll seguinte corrigir. Segurar a primeira busca ate a identidade estar
   * resolvida acaba com esse piscar.
   */
  enabled = true
) {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Evita que uma resposta lenta sobrescreva um estado mais novo.
  const latest = useRef(0)

  /*
   * Nunca deixa dois pedidos correrem juntos.
   *
   * Sem isto, quando a resposta demora mais que o intervalo, cada poll novo
   * invalida o anterior pelo `ticket` e NENHUMA resposta e aceita — a tela fica
   * presa no carregamento para sempre. Foi exatamente o que aconteceu contra o
   * banco remoto: resposta de 2,6s com poll de 1,5s. Enfileirar tambem evita
   * empilhar requisicoes em cima do pool de conexoes.
   */
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true

    const ticket = ++latest.current
    // Um pedido travado nao pode bloquear o polling para sempre.
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), 20_000)

    try {
      const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ''
      const res = await fetch(`/api/game/${code}/state${query}`, {
        cache: 'no-store',
        signal: abort.signal,
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
      clearTimeout(timer)
      inFlight.current = false
      if (ticket === latest.current) setLoading(false)
    }
  }, [code, playerId, enabled])

  useEffect(() => {
    if (!enabled) return
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
  }, [refresh, enabled])

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
