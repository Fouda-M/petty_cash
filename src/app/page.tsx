
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import { supabase } from '@/lib/supabase/client';
import type { AuthApiError, User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  React.useEffect(() => {
    setIsAuthLoading(true);
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isGuest = sessionStorage.getItem('isGuest') === 'true';
        if (!isGuest) {
            router.replace('/dashboard');
            return; 
        }
      }
      setIsAuthLoading(false);
    };

    checkUserSession();

    const { data: authListenerData } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        const isGuest = sessionStorage.getItem('isGuest') === 'true';
        if (!isGuest) {
          router.replace('/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthLoading(false);
      }
    });

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "حقول فارغة",
            description: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        toast({
          title: "تم تسجيل الدخول بنجاح!",
          description: "أهلاً بعودتك! يتم الآن توجيهك إلى لوحة التحكم.",
        });
        sessionStorage.removeItem('isGuest'); 
      } else {
        throw new Error("فشل تسجيل الدخول. لم يتم إرجاع بيانات المستخدم أو الجلسة.");
      }
    } catch (error) {
      let errorMessage = "فشل تسجيل الدخول. يرجى التحقق من بريدك الإلكتروني وكلمة المرور.";
       if (error instanceof AuthApiError) {
        if (error.message.includes("Invalid login credentials")) {
            errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "تم إرسال رمز OTP لتفعيل حسابك. يرجى التحقق من بريدك الإلكتروني.";
        } else {
            console.error("Supabase Login Error:", error);
            errorMessage = error.message || "فشل تسجيل الدخول.";
        }
      } else if (error instanceof Error) {
        console.error("Non-Supabase Login Error:", error);
        errorMessage = error.message;
      } else {
        console.error("Unknown Login Error:", error);
      }
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setIsLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Error signing out before guest mode:", signOutError);
    }
    sessionStorage.setItem('isGuest', 'true');
    router.push('/dashboard');
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" />
        <p className="ps-3">جارٍ التحقق من الجلسة...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <CardTitle className="text-3xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>مرحباً بعودتك! يرجى إدخال بياناتك للمتابعة أو الاستمرار كضيف.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="example@mail.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" placeholder="********" required />
            </div>
            <div className="text-start mt-1">
              <Link href="/auth/forgot-password" passHref legacyBehavior>
                <a className="p-0 h-auto text-sm text-primary hover:underline">
                  نسيت كلمة المرور؟
                </a>
              </Link>
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
          <Button variant="outline" onClick={handleContinueAsGuest} className="w-full text-lg py-6 mt-4" disabled={isLoading}>
             {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
            المتابعة كضيف
          </Button>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                قم بإنشاء حساب جديد
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
