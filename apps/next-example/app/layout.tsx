import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@sklop/tokens/tokens.css';
import './globals.css';
import { SklopProvider, SklopScript } from '@sklop/react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { sklop } from './sklop';

export const metadata: Metadata = {
  title: 'Sklop Next example',
  description: 'Renders @sklop/react in the Next.js App Router.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // SklopScript sets the axis attributes on <html> before hydration, so React must not compare them.
    <html lang="en" suppressHydrationWarning>
      <head>
        <SklopScript {...sklop} />
      </head>
      <body>
        <SklopProvider {...sklop}>{children}</SklopProvider>
      </body>
    </html>
  );
}
