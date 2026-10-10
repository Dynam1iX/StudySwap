import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudySwap — Academic Barter Platform',
  description: 'Peer-to-peer knowledge sharing for AITU students',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FBF9FF] text-[#1B1530] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}