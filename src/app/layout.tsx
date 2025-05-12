import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Logo from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'بوصلة العملات',
  description: 'تتبع المعاملات المالية بعملات متعددة.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body 
        className={cn(
          geistSans.variable, 
          "font-sans antialiased"
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
                © {new Date().getFullYear()} بوصلة العملات. جميع الحقوق محفوظة.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
