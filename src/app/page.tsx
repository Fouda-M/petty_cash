
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
  const [isAuthLoading, setIsAuthLoading] = React.useState(true); // New state for auth check

  React.useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace('/dashboard'); // Use replace to avoid login page in history
      } else {
        setIsAuthLoading(false);
      }
    };

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.replace('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        setIsAuthLoading(false); // Allow login form to show
      }
    });

    return () => {
      authListener?.unsubscribe();
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
        sessionStorage.removeItem('isGuest'); // Clear guest flag on successful login
        // onAuthStateChange will handle redirect
      } else {
        // This case should ideally not be reached if signInWithPassword succeeds.
        // If it does, it implies an unexpected state from Supabase.
        throw new Error("فشل تسجيل الدخول. لم يتم إرجاع بيانات المستخدم أو الجلسة.");
      }
    } catch (error) {
      let errorMessage = "فشل تسجيل الدخول. يرجى التحقق من بريدك الإلكتروني وكلمة المرور.";
       if (error instanceof AuthApiError) {
        if (error.message.includes("Invalid login credentials")) {
            errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "لم يتم تأكيد البريد الإلكتروني. يرجى التحقق من صندوق الوارد الخاص بك.";
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

  const handleContinueAsGuest = () => {
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
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
          <Button variant="outline" onClick={handleContinueAsGuest} className="w-full text-lg py-6 mt-4">
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
