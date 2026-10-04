import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'تِبْيَان | Tibyan - محرك الحوار المعرفي الموثق',
  description: 'منصة تِبْيَان - محرك الحوار المعرفي والاستدلال الشرعي الموثق - هوية بصرية حقيقية: علامة صح ✓ = موثوقية، كتاب مفتوح = قرآن، نقطتان ذهبيتان = تاء تِبْيَان - تحدي باذل 2026 - ألوان #19D6C4 #0A8F94 #14529E #E0B450 - مع Gemini Flash Lite مجاني',
  keywords: ['تِبْيَان', 'Tibyan', 'باذل', 'الحوار المعرفي', 'RAG', 'القرآن', 'الحديث', 'بينات', 'الجمهرة', 'هوية بصرية', 'Gemini Flash Lite'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
        <meta name="theme-color" content="#0A8F94" />
      </head>
      <body>{children}</body>
    </html>
  )
}
