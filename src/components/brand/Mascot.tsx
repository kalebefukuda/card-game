type MascotProps = {
  size?: number
  /** 'idle' olha pra frente; 'happy' fecha os olhos sorrindo; 'peek' espia de lado. */
  mood?: 'idle' | 'happy' | 'peek'
  className?: string
  title?: string
}

/**
 * Tico, o mascote. Desenhado em SVG (nao imagem) pra ficar nitido em qualquer
 * tamanho e herdar o tema sem exportar arquivo novo a cada ajuste.
 *
 * Geometria pensada pra ler bem a 24px: massas grandes, dois tons de pelo,
 * nada de detalhe fino que vira sujeira quando reduz.
 */
export function Mascot({
  size = 64,
  mood = 'idle',
  className,
  title,
}: MascotProps) {
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

      {/* orelhas */}
      <circle cx="20" cy="62" r="17" fill="var(--fur-shade)" />
      <circle cx="20" cy="62" r="9" fill="var(--fur-inner)" />
      <circle cx="100" cy="62" r="17" fill="var(--fur-shade)" />
      <circle cx="100" cy="62" r="9" fill="var(--fur-inner)" />

      {/* cabeca */}
      <ellipse cx="60" cy="60" rx="42" ry="40" fill="var(--fur)" />

      {/* rosto */}
      <ellipse cx="60" cy="68" rx="31" ry="29" fill="var(--fur-face)" />

      {/* sobrancelha/testa: da o ar esperto, evita cara de bebe */}
      <path
        d="M29 47c8-9 20-13 31-13s23 4 31 13c-9-4-20-6-31-6s-22 2-31 6z"
        fill="var(--fur-shade)"
      />

      {mood === 'happy' ? (
        <>
          {/* olhos fechados sorrindo */}
          <path
            d="M40 62c3-4 9-4 12 0"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M68 62c3-4 9-4 12 0"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="47" cy="61" r="6" fill="var(--ink)" />
          <circle cx="73" cy="61" r="6" fill="var(--ink)" />
          <circle
            cx={mood === 'peek' ? '49.5' : '49'}
            cy="59"
            r="2.1"
            fill="#fff"
          />
          <circle
            cx={mood === 'peek' ? '75.5' : '75'}
            cy="59"
            r="2.1"
            fill="#fff"
          />
        </>
      )}

      {/* focinho */}
      <ellipse cx="60" cy="80" rx="18" ry="12" fill="var(--fur-muzzle)" />
      <ellipse cx="54" cy="76" rx="2.4" ry="3" fill="var(--ink)" opacity="0.75" />
      <ellipse cx="66" cy="76" rx="2.4" ry="3" fill="var(--ink)" opacity="0.75" />

      {/* sorriso */}
      <path
        d="M51 84c3.5 4 14.5 4 18 0"
        stroke="var(--ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
