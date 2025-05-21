
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/shared/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح." }),
});

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    setIsLoading(true);
    setIsSuccess(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فسيتم إرسال رابط لإعادة تعيين كلمة المرور إليه.",
      });
      setIsSuccess(true);
      form.reset();
    } catch (error: any) {
      console.error("Forgot Password Error:", error);
      toast({
        variant: "destructive",
        title: "خطأ في إرسال رابط إعادة التعيين",
        description: error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
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
          <CardTitle className="text-3xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            {isSuccess
              ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد (والرسائل غير المرغوب فيها)."
              : "أدخل عنوان بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@mail.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                  {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
                  {isLoading ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center">
              <Button onClick={() => router.push("/")} variant="outline" className="mt-4">
                العودة إلى صفحة تسجيل الدخول
              </Button>
            </div>
          )}
          {!isSuccess && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                تذكرت كلمة المرور؟{" "}
                <Link href="/" className="font-medium text-primary hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
