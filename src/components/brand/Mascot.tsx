type MascotProps = {
  size?: number
  /**
   * 'full' e a marca completa: o Tico espiando por tras de duas cartas.
   * 'head' e a reducao, so a cabeca — obrigatoria abaixo de ~28px, onde as
   * cartas viram tres riscos indistinguiveis.
   */
  variant?: 'full' | 'head'
  mood?: 'idle' | 'happy'
  className?: string
  title?: string
}

/**
 * Tico, o mascote.
 *
 * O traco usa currentColor e o vazio usa --mascot-bg, entao a marca se inverte
 * sozinha sobre fundo escuro: o hospedeiro so precisa declarar --mascot-bg.
 * E o que permite o mesmo componente assinar a carta branca e a preta.
 */
export function Mascot({
  size = 64,
  variant = 'head',
  mood = 'idle',
  className,
  title,
}: MascotProps) {
  const bg = 'var(--mascot-bg, var(--paper))'

  const head = (
    <>
      {/* orelhas */}
      <circle cx="30" cy="40" r="11.5" fill="currentColor" />
      <circle cx="30" cy="40" r="4.8" fill={bg} />
      <circle cx="90" cy="40" r="11.5" fill="currentColor" />
      <circle cx="90" cy="40" r="4.8" fill={bg} />

      {/* cabeca */}
      <ellipse cx="60" cy="42" rx="29" ry="27" fill="currentColor" />

      {/* rosto */}
      <ellipse cx="60" cy="47" rx="21" ry="19" fill={bg} />

      {mood === 'happy' ? (
        <>
          <path
            d="M46 45c2.5-3.5 7.5-3.5 10 0"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M64 45c2.5-3.5 7.5-3.5 10 0"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="51" cy="43" r="3.6" fill="currentColor" />
          <circle cx="69" cy="43" r="3.6" fill="currentColor" />
        </>
      )}

      {/* focinho */}
      <ellipse cx="60" cy="56" rx="11" ry="7" fill={bg} stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M55 56c2.5 2.5 7.5 2.5 10 0"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </>
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}

      {variant === 'full' ? (
        <>
          {/*
           * A cabeca vem ATRAS e menor: sao as cartas que ficam na frente.
           * Com a cabeca na frente, ela cobre as cartas e a marca vira uma
           * mancha com babador — o desenho precisa ler "espiando por tras".
           * O focinho fica escondido de proposito; sao os olhos que espiam.
           */}
          <g transform="translate(60 40) scale(0.84) translate(-60 -42)">
            {head}
          </g>

          {/* leque de duas cartas, uma branca e uma preta, como o baralho */}
          <g transform="rotate(-14 42 88)">
            <rect
              x="21"
              y="62"
              width="42"
              height="52"
              rx="5"
              fill={bg}
              stroke="currentColor"
              strokeWidth="5"
            />
          </g>
          <g transform="rotate(14 78 88)">
            <rect
              x="57"
              y="62"
              width="42"
              height="52"
              rx="5"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="5"
            />
          </g>
        </>
      ) : (
        // Reducao: a cabeca sozinha, ampliada pra ocupar o quadro todo.
        <g transform="translate(60 60) scale(1.42) translate(-60 -46)">{head}</g>
      )}
    </svg>
  )
}
