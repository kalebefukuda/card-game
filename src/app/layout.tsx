import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

// Uma familia so. Nunito tem a terminacao arredondada que da o tom acolhedor
// sem cair no infantil de fonte de desenho animado.
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

// Sem isto a OG image vira uma URL de localhost quando alguem compartilha o
// link. A Vercel expoe o dominio do deploy em VERCEL_URL.
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3010'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Cards Just Cards',
  description:
    'Jogo de cartas para jogar com os amigos: escolha a resposta mais absurda, vote na melhor e some pontos.',
  openGraph: {
    title: 'Cards Just Cards',
    description:
      'Crie uma sala, mande o código para a galera e descubra quem tem o pior senso de humor.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export const viewport: Viewport = {
  themeColor: '#58cc02',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
