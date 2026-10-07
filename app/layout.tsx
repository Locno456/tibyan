import type { Metadata } from 'next'
import './globals.css'
import { AccountProvider } from '../components/AccountProvider'
import ThemeController from '../components/ThemeController'

export const metadata: Metadata = {
  title: 'تِبْيَان | Tibyan - نَصٌّ يَسْتَنِدُ لِدَلِيلٍ يعْتَمَدٍ',
  description: 'تِبْيَان: نَصٌّ يَسْتَنِدُ لِدَلِيلٍ يعْتَمَدٍ. أداة مدعومة بالذكاء الاصطناعي وتستند إجاباتها إلى المصادر المعتمدة.',
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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var c=localStorage.getItem('tibyan.theme.v1');var d=c==='dark'||(c!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themeChoice=c==='light'||c==='dark'?c:'system';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}` }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
        <meta name="theme-color" content="#0A8F94" />
      </head>
      <body><ThemeController /><AccountProvider>{children}</AccountProvider></body>
    </html>
  )
}
