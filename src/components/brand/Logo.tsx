import { Mascot } from './Mascot'

/** Assinatura da marca: mascote + nome. `compact` esconde o nome no mobile. */
export function Logo({
  size = 36,
  compact = false,
}: {
  size?: number
  compact?: boolean
}) {
  return (
    <span className="flex items-center gap-2">
      <Mascot size={size} variant="full" />
      <span
        className={
          'text-lg leading-none font-extrabold tracking-[-0.02em] text-[var(--ink)]' +
          (compact ? ' hidden sm:inline' : '')
        }
      >
        Meu Baralho
      </span>
    </span>
  )
}
