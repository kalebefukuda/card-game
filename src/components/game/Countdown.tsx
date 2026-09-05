'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Abaixo disto a contagem muda de aparencia: e o aviso de que vai fechar. */
const APERTO_SEGUNDOS = 10

function restante(deadline: string) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000))
}

/**
 * Contagem do prazo da fase.
 *
 * Conta a partir do instante absoluto que o servidor mandou, e nao de um numero
 * de segundos: quem abriu a aba no meio da rodada entra com o tempo certo, e
 * quem deixou o aparelho suspenso volta com o tempo certo tambem. O relogio do
 * navegador so desenha — quem decide que o prazo venceu e o servidor.
 *
 * Chegar a zero nao dispara nada aqui de proposito. O estado ja e buscado a
 * cada 1,5s, e e essa busca que faz o servidor resolver a rodada; se a tela
 * tambem tentasse resolver, dois caminhos disputariam a mesma escrita.
 */
export function Countdown({
  deadline,
  total,
}: {
  deadline: string
  /** Prazo cheio da fase, para a barra saber o quanto ja passou. */
  total: number
}) {
  const [segundos, setSegundos] = useState(() => restante(deadline))

  useEffect(() => {
    setSegundos(restante(deadline))
    const id = window.setInterval(() => setSegundos(restante(deadline)), 250)
    return () => window.clearInterval(id)
  }, [deadline])

  const esgotado = segundos === 0
  const aperto = !esgotado && segundos <= APERTO_SEGUNDOS
  const fracao = total > 0 ? Math.min(1, segundos / total) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="kicker text-[var(--ink-soft)]">
          {esgotado ? 'Tempo esgotado' : 'Tempo'}
        </span>
        <span
          // aria-live so no aperto: anunciar cada segundo da rodada inteira
          // deixaria o leitor de tela falando sem parar.
          aria-live={aperto ? 'polite' : 'off'}
          className={cn(
            'text-lg font-extrabold tabular-nums',
            aperto && 'animate-pulse'
          )}
        >
          {esgotado ? 'sorteando…' : `${segundos}s`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Tempo restante da rodada"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={segundos}
        className="h-2 overflow-hidden rounded-full border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]"
      >
        <div
          className={cn(
            'h-full bg-[var(--ink)] transition-[width] duration-300 ease-linear',
            aperto && 'animate-pulse'
          )}
          style={{ width: `${fracao * 100}%` }}
        />
      </div>
    </div>
  )
}
