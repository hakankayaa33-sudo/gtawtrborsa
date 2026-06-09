import { Outfit, DM_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
});

export const metadata = {
  title: 'GoPostal - San Andreas Kargo Servisi',
  description: 'Hızlı, güvenilir ve anlık takipli kargo hizmeti.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${outfit.variable} ${dmMono.variable}`}>
      <head />
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
