
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
    // Initial check for guest status from sessionStorage
    const initialGuestStatus = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(initialGuestStatus);
    if (initialGuestStatus) { // If initially guest, ensure user state is null
        setUser(null);
    }

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const supaUser = session?.user ?? null;
        setUser(supaUser);

        if (supaUser) { // If a user signs IN or session is restored
            sessionStorage.removeItem('isGuest'); // Clear guest flag
            setIsGuest(false);
        } else { // If user signs OUT or session is initially null
            // Re-check guest status from storage, as it might have been set by "Continue as Guest"
            const currentGuestStatus = sessionStorage.getItem('isGuest') === 'true';
            setIsGuest(currentGuestStatus);
        }
        setIsLoadingAuth(false);
      }
    );

    // Initial session check. This will run AFTER initialGuestStatus is set.
    // If not initially in guest mode, try to get the session.
    if (!initialGuestStatus) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const supaUser = session?.user ?? null;
            setUser(supaUser);
            if (supaUser) { // If a session is found, it overrides guest mode
                sessionStorage.removeItem('isGuest');
                setIsGuest(false);
            }
            // If no session and not initially guest, isGuest remains false.
            setIsLoadingAuth(false);
        }).catch(() => {
            // Handle potential error in getSession, though unlikely for just reading
            setIsLoadingAuth(false);
        });
    } else {
        // If initially guest, we've already set user to null and isGuest to true.
        // No need to call getSession, just stop loading.
        setIsLoadingAuth(false);
    }

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem('isGuest'); // Ensure guest mode is cleared on logout
    setIsGuest(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
    // onAuthStateChange will set user to null and isGuest to false (or re-evaluate from sessionStorage if needed)
    router.push('/'); 
  };

  const handleLoginRedirect = () => {
    sessionStorage.removeItem('isGuest');
    setIsGuest(false); // Update state immediately
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
              <Link href={dashboardLink} passHref>
                <Logo />
              </Link>
              <div className="flex items-center gap-3">
                {isLoadingAuth ? (
                    <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
                ) : isGuest ? ( // Prioritize showing Guest UI if isGuest is true
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <UserX2 className="h-5 w-5 text-primary" />
                       <span>وضع الضيف</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLoginRedirect}>
                      تسجيل الدخول / إنشاء حساب
                    </Button>
                  </>
                ) : user ? ( // If not guest, and user exists, show user UI
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
                ) : ( // If not guest and no user, show Login button (e.g., on initial load at '/')
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
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    // Pass isGuest to child pages
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
