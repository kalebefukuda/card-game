'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useSound } from '@/hooks/useSound'

/**
 * Controle de som. Botao com o estado atual, e um painel com o slider.
 *
 * Painel em clique e nao em hover de proposito: no celular hover nao existe, e
 * este e um jogo jogado no celular. O mesmo controle serve nos dois.
 */
export function SoundControl() {
  const { volume, muted, play, setVolume, toggleMuted } = useSound()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou apertar Esc — sem isso o painel fica preso aberto.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const silent = muted || volume === 0

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={silent ? 'Som desligado. Abrir controle' : 'Som ligado. Abrir controle'}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          if (!open && !silent) play('click')
        }}
        className="grid size-11 place-items-center rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] shadow-hard-sm transition-[transform,box-shadow] duration-[120ms] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        {silent ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 z-20 w-56 rounded-[var(--radius)] border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] p-4 shadow-hard"
          role="group"
          aria-label="Controle de som"
        >
          <div className="flex items-center justify-between">
            <span className="kicker text-[var(--ink-soft)]">Som</span>
            <button
              type="button"
              onClick={() => {
                toggleMuted()
                // Toca depois de religar, para o usuario ouvir que voltou.
                if (muted) play('click')
              }}
              className="text-xs font-bold uppercase underline decoration-2 underline-offset-2"
            >
              {muted ? 'Ligar' : 'Silenciar'}
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            // Toca uma amostra ao soltar, nao a cada passo: senao vira metralhadora.
            onPointerUp={() => !muted && play('click')}
            onKeyUp={() => !muted && play('click')}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--line-soft)] accent-[var(--ink)] disabled:opacity-40"
            disabled={muted}
          />

          <p className="mt-2 text-right text-xs font-bold tabular-nums text-[var(--ink-soft)]">
            {muted ? 'mudo' : `${Math.round(volume * 100)}%`}
          </p>
        </div>
      )}
    </div>
  )
}
