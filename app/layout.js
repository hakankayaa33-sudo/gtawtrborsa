import { Outfit, DM_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const dmMono = DM_Mono({
<<<<<<< HEAD
  weight: ['400', '500'],
  subsets: ['latin'],
=======
  subsets: ['latin'],
  weight: ['400', '500'],
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
  display: 'swap',
  variable: '--font-dm-mono',
});

export const metadata = {
<<<<<<< HEAD
  title: 'GoPostal - San Andreas Kargo Servisi',
  description: 'Hızlı, güvenilir ve anlık takipli kargo hizmeti.',
=======
  title: 'Postacı - Kargo Takip',
  description: 'Kargonuzu anında takip edin.',
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
};

export default function RootLayout({ children }) {
  return (
<<<<<<< HEAD
    <html lang="tr" className={`${outfit.variable} ${dmMono.variable}`}>
      <head />
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
=======
    <html lang="tr" className={`${outfit.variable} ${dmMono.variable} dark`}>
      <body className="bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
