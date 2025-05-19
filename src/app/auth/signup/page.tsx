
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { FirebaseError } from 'firebase/app';
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
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "تم إنشاء الحساب بنجاح!",
        description: "مرحباً بك! يتم الآن توجيهك إلى لوحة التحكم.",
      });
      router.push('/dashboard'); 
    } catch (error) {
      let errorMessage = "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "هذا البريد الإلكتروني مسجل بالفعل.";
            break;
          case 'auth/weak-password':
            errorMessage = "كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.";
            break;
          case 'auth/invalid-email':
            errorMessage = "البريد الإلكتروني غير صالح.";
            break;
          default:
            // For other Firebase errors, you might want to log them or show a generic message
            console.error("Firebase Signup Error:", error);
            errorMessage = "فشل إنشاء الحساب. رمز الخطأ: " + error.code;
        }
      } else {
        console.error("Non-Firebase Signup Error:", error);
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
