import type { Metadata } from 'next/types';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'L2 Benchmarker - Professional Research Platform',
  description: 'Advanced DeFi benchmarking and analysis platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="pt-4">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}