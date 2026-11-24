import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Rayhand — Asisten Akademik',
  description:
    'Asisten AI akademik untuk mahasiswa dan dosen Politeknik Negeri Manado. Ditenagai model open-source di cloud.',
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='88'>✦</text></svg>",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="h-full bg-ink-900 font-sans text-[#e9ecf5] antialiased">
        {children}
      </body>
    </html>
  );
}
