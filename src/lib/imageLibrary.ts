import { prisma } from '@/lib/prisma'

/**
 * URL publica de uma imagem no bucket "images" do Supabase Storage.
 *
 * Espelha o soundLibrary, inclusive no cache: as duas bibliotecas mudam so
 * quando alguem sobe arquivo, nunca durante uma partida, e ler o banco a cada
 * poll foi exatamente o que estourou o pool do pgbouncer quando a rodada de
 * som nasceu. Ver o comentario longo em soundLibrary.ts — a razao e a mesma.
 */
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function imageUrl(path: string) {
  if (!BASE) return ''
  // encodeURI e nao encodeURIComponent: o caminho pode ter pastas.
  return `${BASE}/storage/v1/object/public/images/${encodeURI(path)}`
}

export type ImageCardData = {
  id: string
  name: string
  url: string
  width: number
  height: number
}

const TTL_MS = 10_000

let cache: Map<string, ImageCardData> | null = null
let loadedAt = 0
let inFlight: Promise<Map<string, ImageCardData>> | null = null

export async function getImageLibrary() {
  const fresh = cache && Date.now() - loadedAt < TTL_MS
  if (fresh) return cache as Map<string, ImageCardData>

  // Varias requisicoes chegando juntas depois do TTL nao devem virar varias
  // consultas: a primeira busca e as outras esperam a mesma promessa.
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const rows = await prisma.imageCard.findMany({ where: { active: true } })
      cache = new Map(
        rows.map((i) => [
          i.id,
          {
            id: i.id,
            name: i.name,
            url: imageUrl(i.path),
            width: i.width,
            height: i.height,
          },
        ])
      )
      loadedAt = Date.now()
      return cache
    } catch {
      // Falhou reler? Serve o cache velho em vez de derrubar a partida.
      return cache ?? new Map<string, ImageCardData>()
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Usado pelo seed, para a proxima leitura nao servir dado velho. */
export function invalidateImageLibrary() {
  cache = null
  loadedAt = 0
}
