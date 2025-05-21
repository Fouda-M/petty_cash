
"use client";

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
import { LogOut, UserCircle2, UserX2 } from 'lucide-react'; // Added UserX2 for Guest

const geistSans = GeistSans;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isGuest, setIsGuest] = React.useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    setIsLoadingAuth(true);
    const guestStatus = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guestStatus);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const supaUser = session?.user ?? null;
        setUser(supaUser);
        if (supaUser) { // If user logs in, they are no longer a guest
            sessionStorage.removeItem('isGuest');
            setIsGuest(false);
        } else {
            // If no Supabase user, check session storage again in case it was set by guest login
            const currentGuestStatus = sessionStorage.getItem('isGuest') === 'true';
            setIsGuest(currentGuestStatus);
        }
        setIsLoadingAuth(false);
      }
    );

    // Check initial session
    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUser = session?.user ?? null;
      setUser(supaUser);
      if (supaUser) {
        sessionStorage.removeItem('isGuest');
        setIsGuest(false);
      } else {
        const currentGuestStatus = sessionStorage.getItem('isGuest') === 'true';
        setIsGuest(currentGuestStatus);
      }
      setIsLoadingAuth(false);
    }
    getInitialSession();

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem('isGuest');
    setIsGuest(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
    // setUser(null) and router.push('/') will be handled by onAuthStateChange
    router.push('/'); 
  };

  const handleLoginRedirect = () => {
    sessionStorage.removeItem('isGuest');
    setIsGuest(false);
    router.push('/');
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
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
              <Link href={user || isGuest ? "/dashboard" : "/"} passHref>
                <Logo />
              </Link>
              <div className="flex items-center gap-3">
                {isLoadingAuth ? (
                    <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
                ) : user ? (
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
                ) : isGuest ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <UserX2 className="h-5 w-5 text-primary" />
                       <span>وضع الضيف</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLoginRedirect}>
                      تسجيل الدخول / إنشاء حساب
                    </Button>
                  </>
                ) : (
                  <Link href="/" passHref legacyBehavior>
                     <Button variant="outline" size="sm">
                        تسجيل الدخول
                     </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1">
            {React.cloneElement(children as React.ReactElement, { isGuest })}
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
