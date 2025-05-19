
"use client"; // Required for useState, useEffect, and Supabase client-side auth

import type { Metadata }
from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Logo from '@/components/shared/Logo';
import { cn } from '@/lib/utils';
import CurrentYear from '@/components/shared/CurrentYear';
import Link from 'next/link';
import * as React from "react";
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle2 } from 'lucide-react';

const geistSans = GeistSans;

// Metadata export removed as it's not allowed in "use client" components.
// If static metadata is needed here, it should be handled differently,
// potentially in a parent server component or via Head component for dynamic titles.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoadingAuth(false);
      }
    );

    // Check initial session
    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    }
    getInitialSession();

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      // Optionally show a toast error
    } else {
      setUser(null); // Clear user state
      router.push('/'); // Redirect to login page
    }
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
          {/* You can add static or dynamic title/meta tags here using Head from next/head if needed */}
          <title>عهدة</title>
          <meta name="description" content="تتبع المعاملات المالية بعملات متعددة." />
      </head>
      <body
        className={cn(
          geistSans.variable,
          "font-sans antialiased"
        )}
        suppressHydrationWarning={true}
      >
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
            <div className="container flex h-16 items-center justify-between">
              <Link href={user ? "/dashboard" : "/"} passHref>
                <Logo />
              </Link>
              <div className="flex items-center gap-3">
                {!isLoadingAuth && user && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <UserCircle2 className="h-5 w-5 text-primary" />
                       <span>{user.email}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="ms-1.5 h-4 w-4" />
                      تسجيل الخروج
                    </Button>
                  </>
                )}
                {!isLoadingAuth && !user && (
                  <Link href="/" passHref legacyBehavior>
                     <Button variant="outline" size="sm">
                        تسجيل الدخول
                     </Button>
                  </Link>
                )}
                 {isLoadingAuth && (
                    <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-6 md:px-8 md:py-0 border-t no-print">
            <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
              <p className="text-sm leading-loose text-center text-muted-foreground">
                © <CurrentYear /> عهدة. جميع الحقوق محفوظة.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
