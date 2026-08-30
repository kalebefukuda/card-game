import { ImageResponse } from 'next/og'

export const alt = 'Cards Just Cards — jogo de cartas para jogar com os amigos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// O mascote entra como data URI: o renderizador de OG nao aceita componente React
// de SVG, mas aceita <img>. Mesma geometria do icon.svg.
const MASCOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
<circle cx="20" cy="62" r="17" fill="#a06c3f"/><circle cx="20" cy="62" r="9" fill="#e8b98c"/>
<circle cx="100" cy="62" r="17" fill="#a06c3f"/><circle cx="100" cy="62" r="9" fill="#e8b98c"/>
<ellipse cx="60" cy="60" rx="42" ry="40" fill="#c08552"/>
<ellipse cx="60" cy="68" rx="31" ry="29" fill="#f7d9bc"/>
<path d="M29 47c8-9 20-13 31-13s23 4 31 13c-9-4-20-6-31-6s-22 2-31 6z" fill="#a06c3f"/>
<circle cx="47" cy="61" r="6" fill="#3c3c3c"/><circle cx="73" cy="61" r="6" fill="#3c3c3c"/>
<circle cx="49" cy="59" r="2.1" fill="#fff"/><circle cx="75" cy="59" r="2.1" fill="#fff"/>
<ellipse cx="60" cy="80" rx="18" ry="12" fill="#ffeada"/>
<ellipse cx="54" cy="76" rx="2.4" ry="3" fill="#3c3c3c" opacity="0.75"/>
<ellipse cx="66" cy="76" rx="2.4" ry="3" fill="#3c3c3c" opacity="0.75"/>
<path d="M51 84c3.5 4 14.5 4 18 0" stroke="#3c3c3c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
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
          background: '#58cc02',
          color: '#ffffff',
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
          Cards Just Cards
        </div>
        <div style={{ fontSize: 34, opacity: 0.9, marginTop: 8 }}>
          Quem tem o pior senso de humor da mesa?
        </div>
      </div>
    ),
    size
  )
}
