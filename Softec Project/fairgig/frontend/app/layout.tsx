import type { Metadata } from 'next';
import './globals.css';
import Provider from '@/components/provider';
import ThemeToggle from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'FairGig',
  description: 'Fair and transparent gig-worker rights platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <Provider>
          <ThemeToggle />
          {children}
        </Provider>
      </body>
    </html>
  );
}
