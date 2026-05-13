import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'CargoLink | ניהול מטענים ישראל–אמירויות',
  description: 'מערכת ניהול מטענים לטיסות בין ישראל לאיחוד האמירויות',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.className}>
      <body className="min-h-screen bg-slate-100">{children}</body>
    </html>
  );
}
