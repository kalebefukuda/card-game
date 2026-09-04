import { Mark } from './Mark'

/** Assinatura da marca: ilustracao + nome. `compact` esconde o nome no mobile. */
export function Logo({
  size = 34,
  compact = false,
}: {
  size?: number
  compact?: boolean
}) {
  return (
    <span className="flex items-center gap-2">
      {/* priority: o logo fica acima da dobra e o lazy fazia ele piscar em branco */}
      <Mark size={size} priority />
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
