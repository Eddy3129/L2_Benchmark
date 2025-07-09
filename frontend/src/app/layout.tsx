import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Multi-Chain Gas Analytics Platform',
  description: 'Professional DeFi gas analytics and benchmarking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Lekton:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-lekton text-body">
        <Providers>
          <div className="min-h-screen bg-gray-950">
            <Navigation />
            <main className="pt-2">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}