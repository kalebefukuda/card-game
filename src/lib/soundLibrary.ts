import { prisma } from '@/lib/prisma'

/**
 * URL publica de um som no bucket "sounds" do Supabase Storage.
 *
 * O bucket e publico de proposito: som de carta nao e dado sensivel, e URL
 * publica evita ter que assinar cada arquivo a cada rodada. Quem monta a URL e
 * o servidor, nunca a interface — assim trocar de provedor de storage nao
 * espalha mudanca por componente nenhum.
 */
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function soundUrl(path: string) {
  if (!BASE) return ''
  // encodeURI e nao encodeURIComponent: o caminho pode ter pastas.
  return `${BASE}/storage/v1/object/public/sounds/${encodeURI(path)}`
}

export type SoundCardData = {
  id: string
  name: string
  url: string
  durationMs: number
  gain: number
}

/**
 * Cache da biblioteca em memoria.
 *
 * Isto nasceu de uma quebra medida, nao de zelo prematuro: consultar a
 * biblioteca dentro do getGameState dobrou as consultas por poll, e com tres
 * jogadores pedindo estado a cada 1,5s o pool do pgbouncer (limite 1) estourou
 * com "Timed out fetching a new connection". A biblioteca muda quando alguem
 * sobe um som — nunca durante uma partida —, entao reler a cada poll era puro
 * desperdicio.
 *
 * O TTL curto existe para o seed refletir sem reiniciar o servidor. Mesmo com
 * 10s a economia continua grande: o poll roda a cada 1,5s por jogador, entao
 * isto ainda corta a maioria das consultas.
 *
 * Consequencia aceita: a biblioteca e eventualmente consistente. Uma partida
 * iniciada nos 10s seguintes a um seed pode distribuir um som recem-desativado.
 * O arquivo continua no Storage, entao ele ainda toca — e o custo e menor que
 * uma consulta por poll.
 */
const TTL_MS = 10_000

let cache: Map<string, SoundCardData> | null = null
let loadedAt = 0
let inFlight: Promise<Map<string, SoundCardData>> | null = null

export async function getSoundLibrary() {
  const fresh = cache && Date.now() - loadedAt < TTL_MS
  if (fresh) return cache as Map<string, SoundCardData>

  // Varias requisicoes chegando juntas depois do TTL nao devem virar varias
  // consultas: a primeira busca e as outras esperam a mesma promessa.
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const rows = await prisma.soundCard.findMany({ where: { active: true } })
      cache = new Map(
        rows.map((s) => [
          s.id,
          {
            id: s.id,
            name: s.name,
            url: soundUrl(s.path),
            durationMs: s.durationMs,
            gain: s.gain,
          },
        ])
      )
      loadedAt = Date.now()
      return cache
    } catch {
      // Falhou reler? Serve o cache velho em vez de derrubar a partida.
      return cache ?? new Map<string, SoundCardData>()
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Usado pelo seed, para a proxima leitura nao servir dado velho. */
export function invalidateSoundLibrary() {
  cache = null
  loadedAt = 0
}
