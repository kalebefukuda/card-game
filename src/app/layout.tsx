import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Uma familia so. Inter aguenta o peso do titulo com tracking apertado sem
// virar decoracao — e o oposto do que uma fonte arredondada faria aqui.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

// Sem isto a OG image vira uma URL de localhost quando alguem compartilha o
// link. A Vercel expoe o dominio do deploy em VERCEL_URL.
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3010'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Meu Baralho',
  description:
    'Jogo de cartas para jogar com os amigos: escolha a resposta mais absurda, vote na melhor e some pontos.',
  openGraph: {
    title: 'Meu Baralho',
    description:
      'Uma frase pela metade, a sua carta mais errada, e o voto de quem você chama de amigo.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
