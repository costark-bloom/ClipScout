import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'ClipScout — AI-Powered Video Discovery',
  description:
    'Paste your script, let AI identify visual moments, and discover relevant B-roll footage from YouTube, Pexels, and Pixabay.',
  keywords: ['b-roll', 'video footage', 'content creator', 'AI', 'script analysis', 'clipscout'],
  openGraph: {
    title: 'ClipScout',
    description: 'AI-powered B-roll footage discovery for content creators.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
