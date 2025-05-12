import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Removed as it's causing a build error and not explicitly used
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Logo from '@/components/shared/Logo'; // Changed path to shared
import { cn } from '@/lib/utils';

const geistSans = GeistSans; // Directly use the imported object
// const geistMono = GeistMono; // Commented out

export const metadata: Metadata = {
  title: 'Currency Compass',
  description: 'Track financial transactions with multiple currencies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          geistSans.variable, 
          // geistMono.variable, // Commented out
          "font-sans antialiased" // Use font-sans which maps to --font-geist-sans
        )}
      >
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center">
              <Logo />
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-6 md:px-8 md:py-0 border-t">
            <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
              <p className="text-sm leading-loose text-center text-muted-foreground">
                © {new Date().getFullYear()} Currency Compass. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
