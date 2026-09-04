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
 * Duracao do MP3, contando os quadros um a um.
 *
 * A versao anterior estimava pelo primeiro quadro assumindo taxa constante, e
 * errava feio nos arquivos VBR: um clipe de 2,1s aparecia como 5,8s porque o
 * primeiro quadro vinha a 64kbps. Percorrer os quadros custa milissegundos num
 * arquivo de algumas centenas de KB e acerta CBR e VBR igual.
 */
function mp3DurationMs(buffer) {
  const BITRATE = {
    // [versao][indice] em kbps. versao 1 = MPEG1, 2 = MPEG2/2.5, Layer III.
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  }
  const SAMPLE_RATE = {
    3: [44100, 48000, 32000, 0], // MPEG1
    2: [22050, 24000, 16000, 0], // MPEG2
    0: [11025, 12000, 8000, 0], // MPEG2.5
  }

  let i = 0
  let samples = 0
  let rate = 0

  // Pula a tag ID3v2, que fica antes do audio e nao tem quadro nenhum.
  if (buffer.length > 10 && buffer.toString('latin1', 0, 3) === 'ID3') {
    const size =
      (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9]
    i = 10 + size
  }

  while (i + 4 <= buffer.length) {
    if (buffer[i] !== 0xff || (buffer[i + 1] & 0xe0) !== 0xe0) {
      i++
      continue
    }

    const versionBits = (buffer[i + 1] & 0x18) >> 3
    const layerBits = (buffer[i + 1] & 0x06) >> 1
    const bitrateIdx = (buffer[i + 2] & 0xf0) >> 4
    const rateIdx = (buffer[i + 2] & 0x0c) >> 2
    const padding = (buffer[i + 2] & 0x02) >> 1

    // Layer III apenas (layerBits === 1); indices reservados invalidam o quadro.
    if (layerBits !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || rateIdx === 3) {
      i++
      continue
    }

    const mpeg1 = versionBits === 3
    const kbps = BITRATE[mpeg1 ? 1 : 2][bitrateIdx]
    const sampleRate = (SAMPLE_RATE[versionBits] ?? SAMPLE_RATE[2])[rateIdx]
    if (!kbps || !sampleRate) {
      i++
      continue
    }

    const perFrame = mpeg1 ? 1152 : 576
    const length =
      Math.floor(((mpeg1 ? 144 : 72) * kbps * 1000) / sampleRate) + padding
    if (length <= 4) {
      i++
      continue
    }

    samples += perFrame
    rate = sampleRate
    i += length
  }

  return rate ? Math.round((samples / rate) * 1000) : 0
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
        durationMs = mp3DurationMs(Buffer.from(await res.arrayBuffer()))
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
