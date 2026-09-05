#!/usr/bin/env node
/**
 * Registra no banco as imagens que existem no bucket "images" do Storage.
 *
 * Mesma ideia do seed-sounds: a fonte da verdade e o bucket, nao uma lista no
 * codigo. Voce sobe pelo painel e roda isto. O que sumiu do bucket vira
 * inativo em vez de apagado, senao as submissoes antigas perderiam a
 * referencia.
 *
 *   node scripts/seed-images.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Largura e altura lidas do cabecalho do arquivo.
 *
 * Sem biblioteca de imagem: sao poucos bytes bem no comeco de cada formato, e
 * a alternativa seria uma dependencia inteira para ler dois numeros. As
 * dimensoes existem para a carta reservar o espaco certo antes de a imagem
 * chegar — sem isso a grade pula enquanto carrega.
 */
function dimensoes(buffer) {
  // PNG: assinatura de 8 bytes, depois o chunk IHDR com largura e altura.
  if (
    buffer.length > 24 &&
    buffer.toString('latin1', 1, 4) === 'PNG'
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  // GIF: "GIF87a"/"GIF89a", depois largura e altura em little-endian.
  if (buffer.length > 10 && buffer.toString('latin1', 0, 3) === 'GIF') {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    }
  }

  // WebP: container RIFF. Os tres subformatos guardam o tamanho em lugares
  // diferentes, por isso os tres casos.
  if (
    buffer.length > 30 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    const tipo = buffer.toString('latin1', 12, 16)
    if (tipo === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      }
    }
    if (tipo === 'VP8L') {
      const bits = buffer.readUInt32LE(21)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      }
    }
    if (tipo === 'VP8X') {
      return {
        width: (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1,
        height: (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1,
      }
    }
  }

  // JPEG: percorre os marcadores ate um SOF, que carrega as dimensoes. Os
  // blocos antes dele sao metadados de tamanho variavel, entao nao da para
  // pular direto para um deslocamento fixo.
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2
    while (i + 9 < buffer.length) {
      if (buffer[i] !== 0xff) {
        i++
        continue
      }
      const marcador = buffer[i + 1]
      // SOF0..SOF15, menos DHT (c4), JPG (c8) e DAC (cc), que nao sao frames.
      const ehSOF =
        marcador >= 0xc0 &&
        marcador <= 0xcf &&
        marcador !== 0xc4 &&
        marcador !== 0xc8 &&
        marcador !== 0xcc
      if (ehSOF) {
        return {
          height: buffer.readUInt16BE(i + 5),
          width: buffer.readUInt16BE(i + 7),
        }
      }
      i += 2 + buffer.readUInt16BE(i + 2)
    }
  }

  return { width: 0, height: 0 }
}

/** Nome legivel a partir do arquivo: "zoio-lolito.png" -> "Zoio lolito". */
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
    `select name from storage.objects where bucket_id = 'images' order by name`
  )

  if (objects.length === 0) {
    console.log(
      '[imagens] bucket vazio. Suba os arquivos em Storage > images e rode de novo.'
    )
    return
  }

  const seen = []
  for (const { name: path } of objects) {
    const url = `${baseUrl}/storage/v1/object/public/images/${encodeURI(path)}`
    let width = 0
    let height = 0

    try {
      const res = await fetch(url)
      if (res.ok) {
        ;({ width, height } = dimensoes(Buffer.from(await res.arrayBuffer())))
      } else {
        console.warn(`[imagens] ${path}: HTTP ${res.status} ao baixar`)
      }
    } catch (e) {
      console.warn(`[imagens] ${path}: falhou baixar (${e.message})`)
    }

    await prisma.imageCard.upsert({
      where: { path },
      create: { path, name: prettyName(path), width, height },
      update: { name: prettyName(path), width, height, active: true },
    })

    seen.push(path)
    console.log(`[imagens] ${path}  ${width}x${height}`)
  }

  const retired = await prisma.imageCard.updateMany({
    where: { path: { notIn: seen }, active: true },
    data: { active: false },
  })

  const semTamanho = await prisma.imageCard.count({
    where: { active: true, width: 0 },
  })
  if (semTamanho > 0) {
    console.warn(
      `[imagens] ${semTamanho} sem dimensao lida — a carta ainda funciona, ` +
        'mas reserva espaco quadrado enquanto carrega.'
    )
  }

  console.log(
    `[imagens] ${seen.length} no bucket, ${retired.count} desativada(s) por terem sumido.`
  )
}

main()
  .catch((e) => {
    console.error('[imagens]', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
