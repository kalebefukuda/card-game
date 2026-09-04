#!/usr/bin/env node
/**
 * Registra no banco os sons que existem no bucket "sounds" do Storage.
 *
 * A fonte da verdade e o bucket, nao uma lista no codigo: voce sobe o arquivo
 * pelo painel e roda isto. O que sumiu do bucket e marcado como inativo em vez
 * de apagado, senao as submissoes antigas perderiam a referencia.
 *
 *   node scripts/seed-sounds.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Duracao aproximada a partir do cabecalho do primeiro quadro MP3.
 *
 * Aproximada de proposito: assume taxa constante, que e o caso de praticamente
 * todo clipe curto. Serve para a carta avisar "isto dura 17s" antes de alguem
 * tocar — nao precisa de precisao de milissegundo, precisa existir.
 */
function estimateMp3Ms(buffer) {
  const V1L3 = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
  ]
  const V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]

  for (let i = 0; i < Math.min(buffer.length - 4, 200_000); i++) {
    if (buffer[i] !== 0xff || (buffer[i + 1] & 0xe0) !== 0xe0) continue

    const mpeg1 = (buffer[i + 1] & 0x18) === 0x18
    const layer3 = (buffer[i + 1] & 0x06) === 0x02
    if (!layer3) continue

    const kbps = (mpeg1 ? V1L3 : V2L3)[(buffer[i + 2] & 0xf0) >> 4]
    if (!kbps) continue

    return Math.round((buffer.length * 8) / kbps)
  }
  return 0
}

/** Nome legivel a partir do arquivo: "chora-nao-vagabunda.mp3" -> "Chora nao vagabunda". */
function prettyName(path) {
  const base = path.split('/').pop().replace(/\.[a-z0-9]+$/i, '')
  const words = base.replace(/[-_]+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    throw new Error(
      'Defina NEXT_PUBLIC_SUPABASE_URL (ex.: https://<ref>.supabase.co) ' +
        'para o script saber de onde baixar os arquivos.'
    )
  }

  const objects = await prisma.$queryRawUnsafe(
    `select name from storage.objects where bucket_id = 'sounds' order by name`
  )

  if (objects.length === 0) {
    console.log(
      '[sons] bucket vazio. Suba os arquivos em Storage > sounds e rode de novo.'
    )
    return
  }

  const seen = []
  for (const { name: path } of objects) {
    const url = `${baseUrl}/storage/v1/object/public/sounds/${encodeURI(path)}`
    let durationMs = 0

    try {
      const res = await fetch(url)
      if (res.ok) {
        durationMs = estimateMp3Ms(Buffer.from(await res.arrayBuffer()))
      } else {
        console.warn(`[sons] ${path}: HTTP ${res.status} ao baixar`)
      }
    } catch (e) {
      console.warn(`[sons] ${path}: falhou baixar (${e.message})`)
    }

    // Nome e duracao sao recalculados; `gain` nao, para nao apagar um ajuste
    // manual feito depois. O nivelamento automatico acontece no cliente.
    await prisma.soundCard.upsert({
      where: { path },
      create: { path, name: prettyName(path), durationMs },
      update: { name: prettyName(path), durationMs, active: true },
    })

    seen.push(path)
    console.log(`[sons] ${path}  ${(durationMs / 1000).toFixed(1)}s`)
  }

  const retired = await prisma.soundCard.updateMany({
    where: { path: { notIn: seen }, active: true },
    data: { active: false },
  })

  console.log(
    `[sons] ${seen.length} no bucket, ${retired.count} desativado(s) por terem sumido.`
  )
}

main()
  .catch((e) => {
    console.error('[sons]', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
