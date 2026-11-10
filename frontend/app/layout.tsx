import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_Ethiopic } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageContext';
import { ThemeProvider } from '@/components/ThemeContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: '--font-noto-ethiopic',
  subsets: ['ethiopic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  preload: false,
});

const materialSymbols = localFont({
  src: './fonts/material-symbols-outlined.woff2',
  variable: '--font-material-symbols',
  display: 'swap',
  weight: '100 700',
});

export const metadata: Metadata = {
  title: 'Dessie Local - Service Marketplace',
  description: 'Find trusted local services or offer your own services in Dessie, Ethiopia.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#141210' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body
        className={`${plusJakartaSans.variable} ${notoSansEthiopic.variable} ${materialSymbols.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
