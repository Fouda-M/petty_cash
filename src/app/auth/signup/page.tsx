
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import * as React from "react";

export default function SignupPage() {
  const { toast } = useToast();

  const handleSignup = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement actual signup logic here
    toast({
      title: "إنشاء حساب (قيد الإنشاء)",
      description: "سيتم تفعيل هذه الوظيفة قريباً.",
    });
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
              <Input id="email" type="email" placeholder="example@mail.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" placeholder="********" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input id="confirm-password" type="password" placeholder="********" required />
            </div>
            <Button type="submit" className="w-full text-lg py-6">
              إنشاء حساب
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
