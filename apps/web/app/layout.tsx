import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Small Web — a little room to wander',
  description: 'An independent corner of the web. Read, wander, and leave a page of your own.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
