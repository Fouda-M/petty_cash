
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
  const searchParams = useSearchParams(); // To check for Supabase specific params if needed later
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Supabase handles the session from the recovery token automatically when the page loads.
  // We listen for the PASSWORD_RECOVERY event to confirm the user is in a password recovery state.
  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User has been redirected from email, session should contain recovery info.
        // No specific action needed here for now, Supabase client handles token.
      } else if (event === "USER_UPDATED") {
        // This event fires after a successful password update.
      }
    });

    // Check if access_token is in URL, which indicates a recovery link was used
    const accessToken = searchParams.get('access_token');
    // A more robust check might involve verifying the token type if Supabase adds that to URL
    if (!accessToken && !supabase.auth.getSession()) { // Quick check if not already in recovery flow from URL
        // If no token in URL and no active session, likely an invalid access to this page.
        // However, Supabase's updateUser might still work if a recovery flow was initiated correctly.
        // Let's allow the form for now, Supabase will error if token is missing/invalid.
    }

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [searchParams, router]);

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
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "تم تحديث كلمة المرور بنجاح!",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      });
      setIsSuccess(true);
      // Optional: sign out user after password update to force re-login
      // await supabase.auth.signOut(); 
      router.push("/"); // Redirect to login page
    } catch (error: any) {
      console.error("Update Password Error:", error);
      let message = "فشل تحديث كلمة المرور. قد يكون الرابط غير صالح أو منتهي الصلاحية.";
      if (error.message.includes("Invalid token") || error.message.includes("expired")) {
        message = "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.";
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
