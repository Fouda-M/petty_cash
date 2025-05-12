
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
import { addTransactionAction, updateTransactionAction } from "@/actions/transactionActions";
import { transactionSchema, type TransactionFormData } from "@/lib/schemas";
import { CURRENCIES_INFO, TRANSACTION_TYPES_INFO, getTransactionTypeInfo } from "@/lib/constants";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AddTransactionFormProps {
  onTransactionAdded?: (transaction: Transaction) => void;
  transactionToEdit?: Transaction | null;
  onTransactionUpdated?: (updatedTransaction: Transaction) => void;
  onCancelEdit?: () => void;
  className?: string; 
}

const getDefaultFormValues = (): TransactionFormData => ({
  type: TransactionType.EXPENSE,
  description: "",
  amount: undefined, // Will be handled by parseFloat or set to undefined if empty string
  currency: CURRENCIES_INFO[0].code, // Default to the first currency
  date: new Date(),
});

export default function AddTransactionForm({ 
  onTransactionAdded, 
  transactionToEdit, 
  onTransactionUpdated,
  onCancelEdit,
  className 
}: AddTransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditMode = !!transactionToEdit;

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transactionToEdit 
      ? {
          ...transactionToEdit,
          amount: transactionToEdit.amount, 
          date: new Date(transactionToEdit.date), // Ensure date is a Date object for the form
        } 
      : getDefaultFormValues(),
  });

  React.useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        amount: transactionToEdit.amount,
        date: new Date(transactionToEdit.date), // Ensure date is always a new Date object
      });
    } else {
      // Only reset to defaults if not in edit mode AND not already reset by onTransactionAdded
      if (!form.formState.isSubmitSuccessful) { // Avoid resetting after successful add
         form.reset(getDefaultFormValues());
      }
    }
  }, [transactionToEdit, form]);

  const selectedTransactionType = form.watch("type");
  const currentDescriptionPlaceholder = React.useMemo(() => {
    return getTransactionTypeInfo(selectedTransactionType)?.descriptionPlaceholder || "الوصف";
  }, [selectedTransactionType]);

  async function onSubmit(values: TransactionFormData) {
    setIsSubmitting(true);
    try {
      let result;
      if (isEditMode && transactionToEdit) {
        result = await updateTransactionAction(transactionToEdit.id, values);
      } else {
        result = await addTransactionAction(values);
      }

      if (result.success && result.data) {
        toast({
          title: isEditMode ? "تم تعديل المعاملة" : "تمت إضافة المعاملة",
          description: `تم ${isEditMode ? 'تحديث' : 'تسجيل'} "${result.data.description}" بنجاح.`,
        });
        if (isEditMode && onTransactionUpdated) {
          onTransactionUpdated(result.data);
          // Optionally, call onCancelEdit here if the dialog should close after update.
          // This is often handled by the parent component that manages the dialog.
        } else if (onTransactionAdded) {
          onTransactionAdded(result.data);
          form.reset(getDefaultFormValues());
        }
      } else {
        toast({
          variant: "destructive",
          title: isEditMode ? "خطأ في تعديل المعاملة" : "خطأ في إضافة المعاملة",
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

  const cardTitle = isEditMode ? "تعديل المعاملة" : "إضافة معاملة جديدة";
  const cardDescription = isEditMode ? "قم بتحديث تفاصيل معاملتك." : "أدخل تفاصيل معاملتك المالية.";
  const submitButtonText = isEditMode ? "حفظ التعديلات" : "إضافة معاملة";


  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع المعاملة</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                dir="rtl"
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المعاملة" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TRANSACTION_TYPES_INFO.map((typeInfo) => (
                    <SelectItem key={typeInfo.type} value={typeInfo.type}>
                      {typeInfo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الوصف</FormLabel>
              <FormControl>
                <Input placeholder={currentDescriptionPlaceholder} {...field} />
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
                    onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : parseFloat(val));
                    }}
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
        <div className="flex gap-2">
            {isEditMode && onCancelEdit && (
              <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-1">
                إلغاء
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );


  if (isEditMode) {
    return <div className={className}>{formContent}</div>;
  }

  return (
    <Card className={`shadow-lg ${className}`}>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
