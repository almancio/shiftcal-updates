import type { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'ShiftCal OTA Hub',
  description: 'Self-hosted Expo updates, remote config and analytics dashboard.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-[Avenir Next,_Nunito Sans,_Trebuchet MS,_Segoe UI,_sans-serif]">{children}</body>
    </html>
  );
}
