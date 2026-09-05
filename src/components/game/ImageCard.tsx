'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mark } from '@/components/brand/Mark'
import { playSound } from '@/lib/sound'
import type { ImageCardView } from '@/lib/gameState'

/**
 * O nome so aparece quando diz alguma coisa.
 *
 * Os arquivos vem salvos de onde foram baixados, entao boa parte se chama
 * "33636328461926442.jpg" ou "k.jpg" — legenda assim e ruido embaixo de um
 * meme que ja se explica sozinho. Tres letras e o corte: "Bolsodown" e "Messi
 * negro" passam, ids do Pinterest nao.
 */
export function nomeLegivel(nome: string) {
  return (nome.match(/\p{L}/gu) ?? []).length >= 3 ? nome : null
}

type Props = {
  image: ImageCardView
  /** Rotulo da acao: "Jogar esta" ao escolher, "Votar nesta" ao votar. */
  actionLabel: string
  onAction?: () => void
  selected?: boolean
  disabled?: boolean
  badge?: string
}

/**
 * Carta de imagem.
 *
 * Segue a mesma regra da carta de som: **olhar de perto nao pode votar**. Aqui
 * a imagem ja aparece inteira, mas na grade ela fica pequena, e num meme o
 * texto miudo costuma ser a piada — quem quer ler amplia. Se o mesmo toque
 * fizesse as duas coisas, ampliar viraria voto sem querer. Por isso ampliar e
 * agir sao controles separados.
 */
export function ImageCard({
  image,
  actionLabel,
  onAction,
  selected = false,
  disabled = false,
  badge,
}: Props) {
  const [ampliada, setAmpliada] = useState(false)
  const [montado, setMontado] = useState(false)
  const legenda = nomeLegivel(image.name)
  const descricao = legenda ?? 'Figurinha'

  // O portal precisa do document, que nao existe na renderizacao do servidor.
  useEffect(() => setMontado(true), [])

  // Esc fecha a ampliacao: overlay sem saida pelo teclado prende quem nao usa
  // mouse, e o toque fora e a unica outra saida.
  useEffect(() => {
    if (!ampliada) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAmpliada(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ampliada])

  /*
   * Proporcao do quadro, presa entre 4:5 e 8:5.
   *
   * Usar a proporcao crua do arquivo evita a grade pular enquanto as imagens
   * chegam, mas muito meme e retrato esticado: um 618x1200 no celular dava uma
   * carta mais alta que a tela, e comparar as tres viravam tres rolagens.
   * Prender o quadro resolve os dois lados — o retrato encolhe para uma altura
   * util, o panorama nao vira uma tira fina, e a imagem encaixa dentro com
   * object-contain. Quem quiser ver inteiro em tamanho grande, amplia.
   */
  const proporcao =
    image.width > 0 && image.height > 0
      ? Math.min(1.6, Math.max(0.8, image.width / image.height))
      : 1

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col gap-3 rounded-[var(--radius)] p-3',
          'border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)]',
          'transition-[transform,box-shadow] duration-[120ms] ease-out',
          selected
            ? 'translate-x-[3px] translate-y-[3px] shadow-none'
            : 'shadow-hard-sm',
          disabled && !selected && 'opacity-50'
        )}
      >
        <button
          type="button"
          onClick={() => {
            playSound('click')
            setAmpliada(true)
          }}
          aria-label={`Ampliar ${descricao}`}
          className="group relative block max-h-[min(52dvh,360px)] w-full overflow-hidden rounded-[calc(var(--radius)-4px)] border border-[var(--line-soft)] bg-black/[0.04]"
          style={{ aspectRatio: proporcao }}
        >
          {/*
           * <img> e nao next/image de proposito: sao memes servidos do Storage,
           * e passar cada um pelo otimizador da Vercel gastaria a cota do plano
           * gratuito sem ganho real num arquivo que ja e pequeno.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={descricao}
            loading="lazy"
            className="size-full object-contain"
          />
          <span className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 size={13} />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold">{legenda}</p>
          <Mark size={20} />
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

      {/*
       * A ampliacao vai para o body, e nao fica aqui dentro.
       *
       * `position: fixed` se prende ao ancestral transformado mais proximo, e a
       * secao da rodada usa `animate-rise`, cuja animacao tem fill-mode `both`
       * — o transform continua aplicado depois de terminar. O resultado media
       * 708x583 no lugar dos 1280x900 da tela: o fundo escuro cobria so um
       * pedaco e a imagem ficava presa na coluna. No portal isso nao acontece,
       * seja qual for o ancestral.
       */}
      {ampliada &&
        montado &&
        createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setAmpliada(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={descricao}
            className="animate-rise relative max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={descricao}
              className="max-h-[85dvh] max-w-full rounded-[var(--radius)] object-contain"
            />
            <button
              type="button"
              onClick={() => setAmpliada(false)}
              aria-label="Fechar"
              autoFocus
              className="absolute -top-3 -right-3 grid size-10 place-items-center rounded-full border-[length:var(--border-w)] border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-hard-sm"
            >
              <X size={18} />
            </button>
          </div>
        </div>,
          document.body
        )}
    </>
  )
}
