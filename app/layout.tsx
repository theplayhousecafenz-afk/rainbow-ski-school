import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rainbow Ski School — Rainbow Ski Area, St Arnaud',
  description:
    'Book skiing and snowboarding lessons at Rainbow Ski Area, Rainbow Ski Area, St Arnaud, New Zealand. Group and private lessons every weekend.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  )
}
