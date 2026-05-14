import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vend',
  description: 'A financial operating system for campus micro-merchants.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
