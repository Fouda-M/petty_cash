
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
import { supabase } from '@/lib/supabase/client'; // Import Supabase client
import { AuthApiError } from '@supabase/supabase-js'; // Import Supabase error type
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    if (!email || !password || !confirmPassword) {
        toast({
            variant: "destructive",
            title: "حقول فارغة",
            description: "يرجى ملء جميع الحقول المطلوبة.",
        });
        setIsLoading(false);
        return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "خطأ في كلمة المرور",
        description: "كلمتا المرور غير متطابقتين.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      // data.user will be null if email confirmation is required and not yet done.
      // data.session will also be null.
      // If email confirmation is enabled in Supabase, the user object might be returned but session might be null.
      // You might want to inform the user to check their email.

      toast({
        title: "تم إنشاء الحساب بنجاح!",
        description: data.user?.identities?.length === 0 // A heuristic: if no identities, likely needs confirmation
          ? "تم إرسال رمز OTP لتفعيل حسابك. يرجى التحقق من بريدك الإلكتروني."
          : "مرحباً بك! يتم الآن توجيهك إلى لوحة التحكم.",
      });
      router.push('/dashboard'); 
    } catch (error) {
      let errorMessage = "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.";
      if (error instanceof AuthApiError) {
        // Supabase specific error handling
        if (error.message.includes("User already registered")) {
            errorMessage = "هذا البريد الإلكتروني مسجل بالفعل.";
        } else if (error.message.includes("Password should be at least 6 characters")) {
            errorMessage = "كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.";
        } else if (error.message.includes("Unable to validate email address")) {
            errorMessage = "البريد الإلكتروني غير صالح.";
        } else {
            console.error("Supabase Signup Error:", error);
            errorMessage = error.message || "فشل إنشاء الحساب.";
        }
      } else if (error instanceof Error) {
        console.error("Non-Supabase Signup Error:", error);
        errorMessage = error.message;
      } else {
        console.error("Unknown Signup Error:", error);
      }
      toast({
        variant: "destructive",
        title: "فشل إنشاء الحساب",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <CardTitle className="text-3xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>انضم إلينا! أدخل بياناتك لإنشاء حساب.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="example@mail.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" placeholder="********" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input id="confirm-password" name="confirm-password" type="password" placeholder="********" required />
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء حساب'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              لديك حساب بالفعل؟{' '}
              <Link href="/" className="font-medium text-primary hover:underline">
                قم بتسجيل الدخول
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
