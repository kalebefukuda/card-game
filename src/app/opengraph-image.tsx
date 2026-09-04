import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'Meu Baralho — jogo de cartas para jogar com os amigos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  /*
   * A marca e lida do disco em vez de importada: o renderizador de OG roda
   * fora do bundler e nao resolve `import logo from '...png'`. Ler o arquivo e
   * embutir como data URI e o caminho que funciona nos dois ambientes.
   */
  const bytes = await readFile(join(process.cwd(), 'public', 'logo.png'))
  const marca = `data:image/png;base64,${bytes.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#000000',
          fontFamily: 'sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marca} width={760} height={513} alt="" />
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginTop: -30,
          }}
        >
          Meu Baralho
        </div>
      </div>
    ),
    size
  )
}
