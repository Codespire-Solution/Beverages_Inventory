import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import ErrorBoundaryWrapper from './error-boundary-wrapper'
import { Playfair_Display, Assistant, IBM_Plex_Mono } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-playfair', display: 'swap' })
const assistant = Assistant({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-assistant', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-plex-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Beverage Inventory Management',
  description: 'Inventory management system for beverage production',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${assistant.variable} ${plexMono.variable}`}>
      <body>
        <ErrorBoundaryWrapper>
          <Providers>{children}</Providers>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}

