import { ImageResponse } from 'next/og'

export const alt = 'Meu Baralho — jogo de cartas para jogar com os amigos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// O mascote entra como data URI: o renderizador de OG nao aceita componente React
// de SVG, mas aceita <img>. Mesma geometria do icon.svg.
const MASCOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
<g transform="rotate(-15 46 88)"><rect x="27" y="62" width="38" height="52" rx="5" fill="#fff" stroke="#000" stroke-width="5"/></g>
<g transform="rotate(15 76 88)"><rect x="57" y="62" width="38" height="52" rx="5" fill="#000" stroke="#000" stroke-width="5"/></g>
<circle cx="30" cy="40" r="11.5" fill="#000"/><circle cx="30" cy="40" r="4.8" fill="#fff"/>
<circle cx="90" cy="40" r="11.5" fill="#000"/><circle cx="90" cy="40" r="4.8" fill="#fff"/>
<ellipse cx="60" cy="42" rx="29" ry="27" fill="#000"/>
<ellipse cx="60" cy="47" rx="21" ry="19" fill="#fff"/>
<circle cx="51" cy="43" r="3.6" fill="#000"/><circle cx="69" cy="43" r="3.6" fill="#000"/>
<ellipse cx="60" cy="56" rx="11" ry="7" fill="#fff" stroke="#000" stroke-width="2.6"/>
<path d="M55 56c2.5 2.5 7.5 2.5 10 0" stroke="#000" stroke-width="2.4" stroke-linecap="round" fill="none"/>
</svg>`

export default function Image() {
  const mascot = `data:image/svg+xml;base64,${Buffer.from(MASCOT).toString('base64')}`

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
        <img src={mascot} width={200} height={200} alt="" />
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginTop: 24,
          }}
        >
          Meu Baralho
        </div>
        <div style={{ fontSize: 34, opacity: 0.65, marginTop: 8 }}>
          Alguém aqui vai se arrepender.
        </div>
      </div>
    ),
    size
  )
}
