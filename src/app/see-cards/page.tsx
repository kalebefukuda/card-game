'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Image as ImageIcon, Search, Volume2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mark } from '@/components/brand/Mark'
import { playSound } from '@/lib/sound'
import { SoundControl } from '@/components/sound/SoundControl'
import { answerCards } from '@/data/answerCards'
import { promptCards } from '@/data/promptCards'

/**
 * As duas ultimas abas nao listam nada de proposito.
 *
 * Os sons ficam escondidos porque a graca da rodada de som e nao saber o que
 * vem — ler a lista antes estragaria a surpresa na mesa. As imagens ainda nao
 * existem, e prometer uma aba vazia e melhor que fingir que o baralho e so
 * texto.
 */
type Filtro = 'todas' | 'resposta' | 'pergunta' | 'som' | 'imagem'

const TEASERS: Record<'som' | 'imagem', { titulo: string; ajuda: string }> = {
  som: {
    titulo: 'misterioooo',
    ajuda: 'Os sons só aparecem na rodada de som, e a graça é justamente descobrir na hora. Ligue a rodada de som ao criar a partida.',
  },
  imagem: {
    titulo: 'ta vindo p@@a',
    ajuda: 'Rodada de figurinha e meme. Ainda estamos trabalhando para trazer.',
  },
}

export default function VerCartas() {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')

  const todas = useMemo(
    () => [
      ...promptCards.map((texto, i) => ({
        id: `p${i}`,
        texto,
        tipo: 'pergunta' as const,
      })),
      ...answerCards.map((texto, i) => ({
        id: `a${i}`,
        texto,
        tipo: 'resposta' as const,
      })),
    ],
    []
  )

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return todas.filter(
      (c) =>
        (filtro === 'todas' || c.tipo === filtro) &&
        (!termo || c.texto.toLowerCase().includes(termo))
    )
  }, [todas, filtro, busca])

  const abas: { valor: Filtro; rotulo: string }[] = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'pergunta', rotulo: 'Perguntas' },
    { valor: 'resposta', rotulo: 'Respostas' },
    { valor: 'som', rotulo: 'Sons' },
    { valor: 'imagem', rotulo: 'Imagens' },
  ]

  const teaser = filtro === 'som' || filtro === 'imagem' ? filtro : null

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-6">
        <Link href="/" aria-label="Voltar ao início">
          <Button variant="secondary" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">O baralho</h1>
        <div className="ml-auto">
          <SoundControl />
        </div>
      </header>

      <main className="animate-rise mx-auto max-w-5xl px-4 py-6">
        {/* Sem campo de busca nas abas que nao listam nada. */}
        {!teaser && (
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--ink-soft)]"
            />
            <Input
              placeholder="Procurar no baralho"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-11"
            />
          </div>
        )}

        <div
          role="tablist"
          aria-label="Filtrar cartas"
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {abas.map((aba) => {
            const ativa = filtro === aba.valor
            return (
              <button
                key={aba.valor}
                role="tab"
                aria-selected={ativa}
                onClick={() => {
                  playSound('click')
                  setFiltro(aba.valor)
                }}
                className={
                  'h-11 rounded-[var(--radius)] border-2 text-sm font-bold transition-colors ' +
                  (ativa
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink-soft)] hover:bg-black/5')
                }
              >
                {aba.rotulo}
              </button>
            )
          })}
        </div>

        {teaser ? (
          <div className="mt-4 flex aspect-[4/3] max-h-[26rem] flex-col items-center justify-center gap-4 rounded-[var(--radius)] border-2 border-b-[5px] border-[var(--ink)] bg-[var(--ink)] p-8 text-center text-[var(--paper)] [--mark-invert:1]">
            <span aria-hidden className="opacity-80">
              {teaser === 'som' ? (
                <Volume2 size={56} />
              ) : (
                <ImageIcon size={56} />
              )}
            </span>
            <p className="text-3xl font-extrabold text-balance sm:text-4xl">
              {TEASERS[teaser].titulo}
            </p>
            <p className="max-w-sm font-semibold text-balance opacity-75">
              {TEASERS[teaser].ajuda}
            </p>
            <span className="mt-2 flex items-center gap-1.5 opacity-70">
              <Mark size={26} />
              <span className="text-[7px] font-bold tracking-[0.16em] uppercase">
                Meu Baralho
              </span>
            </span>
          </div>
        ) : (
          <>
        <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">
          {filtradas.length}{' '}
          {filtradas.length === 1 ? 'carta' : 'cartas'}
        </p>

        {filtradas.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <Mark size={96} />
            <div>
              <p className="text-lg font-bold">
                Nenhuma carta com “{busca}”
              </p>
              <p className="mt-1 font-semibold text-[var(--ink-soft)]">
                Tente uma palavra mais curta.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setBusca('')}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filtradas.map((carta) => {
              const pergunta = carta.tipo === 'pergunta'
              return (
                <li
                  key={carta.id}
                  className={
                    'flex aspect-[3/4] flex-col justify-between rounded-[var(--radius)] border-2 border-b-[5px] p-4 ' +
                    (pergunta
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] [--mark-invert:1]'
                      : 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]')
                  }
                >
                  <span
                    className={
                      'font-bold text-balance ' +
                      (carta.texto.length > 90
                        ? 'text-[0.8rem] leading-snug'
                        : 'text-[0.95rem] leading-snug')
                    }
                  >
                    {carta.texto}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 opacity-70">
                    <Mark size={26} />
                    <span className="text-[7px] font-bold tracking-[0.16em] uppercase">
                      Meu Baralho
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
          </>
        )}
      </main>
    </div>
  )
}
