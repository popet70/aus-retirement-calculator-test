import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Australian Retirement Planning Tool',
  description: 'Comprehensive retirement calculator with Monte Carlo simulation, stress testing, and detailed analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
