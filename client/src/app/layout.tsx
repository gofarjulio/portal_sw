import './globals.css'
import type { Metadata } from 'next'
import Sidebar from '../components/Sidebar'

export const metadata: Metadata = {
  title: 'Lean Standardized Work',
  description: 'Industrial Application for Lean Engineering',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar className="w-64 flex-shrink-0" />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
