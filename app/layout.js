import { Outfit, DM_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-dm-mono',
});

export const metadata = {
  title: 'Postacı - Kargo Takip',
  description: 'Kargonuzu anında takip edin.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${outfit.variable} ${dmMono.variable} dark`}>
      <body className="bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}