'use client'

import { useEffect, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/brand/Mascot'
import {
  playSoundCard,
  preloadSoundCard,
  stopSoundCard,
  playSound,
} from '@/lib/sound'
import type { SoundCardView } from '@/lib/gameState'

type Props = {
  sound: SoundCardView
  /** Rotulo da acao: "Jogar esta" ao escolher, "Votar" ao votar. */
  actionLabel: string
  onAction?: () => void
  selected?: boolean
  disabled?: boolean
  badge?: string
}

/**
 * Carta de som.
 *
 * A regra que molda este componente: **ouvir nao pode votar**. Numa carta de
 * texto o clique e o voto, mas aqui a pessoa precisa escutar varias vezes antes
 * de decidir — se o mesmo clique fizesse as duas coisas, ela votaria sem querer
 * na primeira que tentasse ouvir. Por isso sao dois botoes separados, e o card
 * em si nao e clicavel.
 */
export function SoundCard({
  sound,
  actionLabel,
  onAction,
  selected = false,
  disabled = false,
  badge,
}: Props) {
  const [tocando, setTocando] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // Baixa antes de alguem pedir: na votacao o play tem que responder na hora.
  useEffect(() => {
    preloadSoundCard(sound.url)
  }, [sound.url])

  useEffect(() => () => stopSoundCard(), [])

  const alternarAudio = async () => {
    if (tocando) {
      stopSoundCard()
      setTocando(false)
      return
    }
    setCarregando(true)
    const duracao = await playSoundCard(sound.url, sound.gain)
    setCarregando(false)
    if (duracao === null) return
    setTocando(true)
    window.setTimeout(() => setTocando(false), duracao * 1000)
  }

  const segundos = sound.durationMs ? Math.round(sound.durationMs / 1000) : null

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-[var(--radius)] p-4',
        'border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]',
        'transition-[transform,box-shadow] duration-[120ms] ease-out',
        selected ? 'translate-x-[3px] translate-y-[3px] shadow-none' : 'shadow-hard-sm',
        disabled && !selected && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={alternarAudio}
          aria-label={tocando ? `Parar ${sound.name}` : `Ouvir ${sound.name}`}
          className="grid size-12 shrink-0 place-items-center rounded-full border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] transition-transform duration-[120ms] active:scale-95"
        >
          {carregando ? (
            <Loader2 size={20} className="animate-spin" />
          ) : tocando ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{sound.name}</p>
          <p className="text-xs font-semibold text-[var(--ink-soft)]">
            {segundos ? `${segundos}s` : 'som'}
            {tocando && ' · tocando'}
          </p>
        </div>

        <Mascot size={22} variant="full" />
      </div>

      {onAction && (
        <button
          type="button"
          onClick={() => {
            playSound('click')
            onAction()
          }}
          disabled={disabled}
          className={cn(
            'h-11 w-full rounded-[var(--radius)] text-xs font-bold tracking-[0.06em] uppercase',
            'border-[length:var(--border-w)] border-[var(--ink)]',
            'transition-colors disabled:opacity-40',
            selected
              ? 'bg-[var(--ink)] text-[var(--paper)]'
              : 'bg-[var(--paper)] hover:bg-black/5'
          )}
        >
          {selected ? 'Escolhida' : actionLabel}
        </button>
      )}

      {badge && (
        <span className="absolute -top-2 -right-2 rounded-full border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-[10px] font-bold uppercase">
          {badge}
        </span>
      )}
    </div>
  )
}
