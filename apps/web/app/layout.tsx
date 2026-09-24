import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Small Web',
  description: 'Browse, search, and publish sites on the small web.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
