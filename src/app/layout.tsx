import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AdaptiPing — Adaptive Sonar Transmitter Monitoring',
  description:
    'SIH 2026 Prototype Dashboard for the Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter Payload for AUVs (SIH26058)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Header />
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
