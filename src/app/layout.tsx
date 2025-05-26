
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
import { LogOut, UserCircle2, UserX2 } from 'lucide-react';

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
    const initialGuestStatus = typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(initialGuestStatus);

    if (initialGuestStatus) {
        setUser(null); // Ensure user is null if guest mode is active from sessionStorage
    }

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Layout] Auth event:", event, "Session:", session, "Current isGuest state:", isGuest);
        const supaUser = session?.user ?? null;
        setUser(supaUser);

        if (supaUser) {
            console.log("[Layout] User signed in or session restored. Clearing guest mode.");
            sessionStorage.removeItem('isGuest');
            setIsGuest(false);
        } else {
             // If user signs OUT or session is initially null and not guest from storage
            const currentGuestStatusFromStorage = typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true';
            console.log("[Layout] User signed out or no session. Guest status from storage:", currentGuestStatusFromStorage);
            setIsGuest(currentGuestStatusFromStorage);
        }
        setIsLoadingAuth(false);
      }
    );

    // Initial session check if not initially in guest mode
    if (!initialGuestStatus) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const supaUser = session?.user ?? null;
            setUser(supaUser);
            if (supaUser) {
                console.log("[Layout] Initial getSession: User found. Clearing guest mode.");
                sessionStorage.removeItem('isGuest');
                setIsGuest(false);
            } else {
                console.log("[Layout] Initial getSession: No user found.");
                // isGuest remains as per initialGuestStatus (which is false here)
            }
            setIsLoadingAuth(false);
        }).catch((error) => {
            console.error("[Layout] Error in initial getSession:", error);
            setIsLoadingAuth(false);
        });
    } else {
        // If initially guest, we've already set user to null and isGuest to true.
        console.log("[Layout] Initial state: Guest mode active from sessionStorage.");
        setIsLoadingAuth(false);
    }

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, []); // Empty dependency array - runs once on mount

  const handleLogout = async () => {
    console.log("[Layout] Handling logout.");
    sessionStorage.removeItem('isGuest');
    setIsGuest(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[Layout] Error logging out:", error);
    }
    // onAuthStateChange will set user to null.
    // isGuest will be false (or re-evaluated if needed by onAuthStateChange logic)
    router.push('/'); 
  };

  const handleLoginRedirect = () => {
    console.log("[Layout] Handling login redirect from guest mode.");
    sessionStorage.removeItem('isGuest');
    setIsGuest(false); 
    router.push('/');
  };

  const dashboardLink = (user || isGuest) ? "/dashboard" : "/";

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
              <Link href={dashboardLink}>
                <Logo />
              </Link>
              <div className="flex items-center gap-3">
                {isLoadingAuth ? (
                    <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
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
                ) : ( 
                  <Link href="/" asChild>
                     <Button variant="outline" size="sm">
                        تسجيل الدخول
                     </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1">
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { isGuest });
                }
                return child;
            })}
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
