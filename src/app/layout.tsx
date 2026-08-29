import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cards Just Cards',
  description: 'O jogo de cartas mais sem noção para jogar com os amigos.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
