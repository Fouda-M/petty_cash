
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { addTransactionAction } from "@/actions/transactionActions";
import { transactionSchema, type TransactionFormData } from "@/lib/schemas";
import { CURRENCIES_INFO } from "@/lib/constants";
import type { Transaction } from "@/types";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AddTransactionFormProps {
  onTransactionAdded: (transaction: Transaction) => void;
}

export default function AddTransactionForm({ onTransactionAdded }: AddTransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: "" as unknown as number, 
      currency: undefined, 
      date: new Date(),
    },
  });

  async function onSubmit(values: TransactionFormData) {
    setIsSubmitting(true);
    try {
      const result = await addTransactionAction(values);
      if (result.success && result.data) {
        toast({
          title: "تمت إضافة المعاملة",
          description: `تم تسجيل ${result.data.description} بنجاح.`,
        });
        onTransactionAdded(result.data);
        form.reset({ // Reset with default values to ensure all fields are cleared properly
            description: "",
            amount: "" as unknown as number,
            currency: undefined,
            date: new Date(),
        });
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في إضافة المعاملة",
          description: result.error || "حدث خطأ غير معروف.",
        });
        if (result.errors) {
          result.errors.forEach((err) => {
            form.setError(err.path[0] as keyof TransactionFormData, {
              type: "manual",
              message: err.message,
            });
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: "لم يتمكن من إرسال النموذج. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>إضافة معاملة جديدة</CardTitle>
        <CardDescription>أدخل تفاصيل معاملتك المالية.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: مشتريات, راتب" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field} 
                        step="0.01"
                        value={field.value === undefined || field.value === null || Number.isNaN(field.value) ? '' : String(field.value)}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العملة</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      dir="rtl"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES_INFO.map((currencyInfo) => (
                          <SelectItem key={currencyInfo.code} value={currencyInfo.code}>
                            {currencyInfo.name} ({currencyInfo.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>التاريخ</FormLabel>
                  <FormControl>
                     <DatePicker date={field.value} setDate={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              إضافة معاملة
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

