import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import '@neondatabase/auth-ui/css';
import './globals.css';
import NavBar from '@/components/NavBar';
import { Providers } from './providers';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Rewind — YouTube Channel Search & Saved Library',
  description:
    'Search any YouTube channel\'s video history by keyword and timeframe. Save videos and channels into a personal library with custom playlists.',
  keywords: ['YouTube', 'channel search', 'video history', 'saved videos', 'playlists'],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <NavBar />
          <main className="main-content" id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
