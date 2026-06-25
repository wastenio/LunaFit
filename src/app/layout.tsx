import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LunaFit',
    template: '%s',
  },
  description: 'Moda fitness feminina para treino, rotina e movimento.',
  openGraph: {
    description: 'Moda fitness feminina para treino, rotina e movimento.',
    siteName: 'LunaFit',
    title: 'LunaFit',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
