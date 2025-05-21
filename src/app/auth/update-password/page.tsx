
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Link from "next/link";

const UpdatePasswordSchema = z
  .object({
    password: z.string().min(6, { message: "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"], // Set error on confirmPassword field
  });

type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

export default function UpdatePasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  // useSearchParams can be used if Supabase starts putting recovery tokens in query params instead of hash.
  // const searchParams = useSearchParams(); 
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("[UpdatePasswordPage] Page loaded. URL hash:", window.location.hash);
    }

    console.log("[UpdatePasswordPage] Setting up onAuthStateChange listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[UpdatePasswordPage] Auth event: ${event}`, session);
      if (event === "PASSWORD_RECOVERY") {
        console.log("[UpdatePasswordPage] PASSWORD_RECOVERY event received. Session:", JSON.stringify(session, null, 2));
        // This event indicates Supabase has processed the token from the URL fragment.
        // The session object here should be a "recovery" session.
        // No specific action needed here for now, Supabase client handles token and sets up the session.
      } else if (event === "USER_UPDATED") {
        console.log("[UpdatePasswordPage] USER_UPDATED event received. Session:", JSON.stringify(session, null, 2));
        // This event fires after a successful password update using the recovery session.
      } else if (session) {
        console.log(`[UpdatePasswordPage] Other auth event with session (${event}):`, JSON.stringify(session, null, 2));
      } else {
        console.log(`[UpdatePasswordPage] Other auth event without session (${event})`);
      }
    });

    // Optionally, check current session state on mount
    supabase.auth.getSession().then(({ data }) => {
        console.log("[UpdatePasswordPage] Initial getSession() on mount:", JSON.stringify(data.session, null, 2));
    });

    return () => {
      console.log("[UpdatePasswordPage] Unsubscribing from onAuthStateChange.");
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<UpdatePasswordFormData> = async (data) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsSuccess(false);

    try {
      console.log("[UpdatePasswordPage] Attempting supabase.auth.updateUser...");
      // Supabase client should have established a recovery session from the URL token by this point.
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        console.error("[UpdatePasswordPage] supabase.auth.updateUser error:", error);
        throw error;
      }

      console.log("[UpdatePasswordPage] Password update successful.");
      toast({
        title: "تم تحديث كلمة المرور بنجاح!",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      });
      setIsSuccess(true);
      // Optional: sign out user after password update to force re-login if desired
      // await supabase.auth.signOut(); 
      router.push("/"); // Redirect to login page
    } catch (error: any) {
      console.error("[UpdatePasswordPage] Catch block error:", error);
      let message = "فشل تحديث كلمة المرور. قد يكون الرابط غير صالح أو منتهي الصلاحية.";
      if (error.message.includes("Invalid token") || error.message.includes("expired") || error.message.includes("Token has expired or is invalid")) {
        message = "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.";
      } else if (error.message.includes("Auth session missing")) {
        message = "جلسة المصادقة مفقودة. تأكد من أنك تستخدم رابط إعادة التعيين الصحيح ولم تنته صلاحيته.";
      } else if (error.message) {
        message = error.message;
      }
      setErrorMsg(message);
      toast({
        variant: "destructive",
        title: "خطأ في تحديث كلمة المرور",
        description: message,
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
          <CardTitle className="text-3xl font-bold">تحديث كلمة المرور</CardTitle>
          <CardDescription>
            {isSuccess
              ? "تم تحديث كلمة مرورك بنجاح. يمكنك الآن تسجيل الدخول."
              : "أدخل كلمة المرور الجديدة الخاصة بك."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password">كلمة المرور الجديدة</Label>
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {errorMsg && (
                  <p className="text-sm font-medium text-destructive">{errorMsg}</p>
                )}
                <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                  {isLoading && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
                  {isLoading ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center">
              <Button onClick={() => router.push("/")} className="mt-4">
                الانتقال إلى صفحة تسجيل الدخول
              </Button>
            </div>
          )}
           {!isSuccess && (
             <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                العودة إلى{" "}
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
