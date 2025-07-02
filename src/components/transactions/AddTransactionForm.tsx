
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
import { TransactionType, Currency, DestinationType } from "@/types";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AddTransactionFormProps {
  onTransactionAdded?: (transaction: Transaction) => void;
  transactionToEdit?: Transaction | null;
  onTransactionUpdated?: (updatedTransaction: Transaction) => void;
  onCancelEdit?: () => void;
  className?: string;
  destinationType?: DestinationType;
}

// Provides base values for a new form, excluding date or with date explicitly undefined.
const getBaseFormValues = (): Omit<TransactionFormData, 'date' | 'amount'> & { date?: Date, amount: undefined | number } => ({
  type: TransactionType.EXPENSE,
  description: "",
  amount: undefined,
  currency: CURRENCIES_INFO[0].code,
  date: undefined,
});

function AddTransactionForm({
  onTransactionAdded,
  transactionToEdit,
  onTransactionUpdated,
  onCancelEdit,
  className,
  destinationType,
}: AddTransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditMode = !!transactionToEdit;

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: transactionToEdit
      ? { // Editing existing transaction
          ...transactionToEdit,
          amount: transactionToEdit.amount, // Ensure amount is number
          date: new Date(transactionToEdit.date), // Date from existing data
        }
      : getBaseFormValues(), // New transaction: uses date: undefined from getBaseFormValues
  });

  const availableCurrencies = React.useMemo(() => {
    if (destinationType === DestinationType.INTERNAL) {
      // For internal trips, only EGP is available.
      return CURRENCIES_INFO.filter(c => c.code === Currency.EGP);
    }
    // For external trips, all currencies are available.
    return CURRENCIES_INFO;
  }, [destinationType]);

  // Effect to dynamically set default currency based on destination
  React.useEffect(() => {
    if (destinationType === DestinationType.INTERNAL) {
      // For internal trips (new or existing form), force currency to EGP.
      form.setValue("currency", Currency.EGP);
    } else if (!isEditMode) {
      // For NEW external trips, default to the first currency in the list (e.g., USD).
      form.setValue("currency", CURRENCIES_INFO[0].code);
    }
    // If it's an external trip being edited, we don't change the currency.
    // The user can change it manually from the full list if needed.
  }, [destinationType, isEditMode, form.setValue]);

  // Effect to initialize or reset form based on mode (new/edit/cancel)
  // This runs client-side after the initial render.
  React.useEffect(() => {
    if (transactionToEdit) {
      // Mode: Editing an existing transaction
      form.reset({
        ...transactionToEdit,
        amount: transactionToEdit.amount,
        date: new Date(transactionToEdit.date),
      });
    } else {
      // Mode: New transaction form, or after cancelling an edit.
      // `defaultValues` in useForm already set date to `undefined` for the initial hydration-safe render.
      // This effect, running client-side, will now set it to new Date().
      // It also handles resetting the form when an edit is cancelled.
      // We check form.formState.submitCount to avoid double-resetting if onSubmit just handled it for a new item.
      if (form.formState.submitCount === 0 || (transactionToEdit === null && typeof onCancelEdit === 'function')) {
        form.reset({
          ...getBaseFormValues(), // Resets type, description, amount, currency
          date: new Date(),       // Sets date to now client-side
        });
      } else if (form.getValues('date') === undefined && form.formState.submitCount > 0 && !isEditMode) {
        // This condition handles the case where a new item was just added,
        // and the form was reset by onSubmit (which might not set date if getBaseFormValues() is used directly).
        // We ensure date is set to new Date() for the next entry.
        // However, onSubmit's reset should ideally handle this.
        // The primary goal is: new form initially gets date undefined, then client sets to new Date().
      } else if (form.getValues('date') === undefined) {
        // Fallback: If for any reason date is still undefined on a new form client-side, set it.
         form.setValue('date', new Date(), { shouldValidate: false, shouldDirty: false });
      }
    }
  // Using form.reset and form.setValue, so they are listed as dependencies.
  // onCancelEdit is a function prop, can be tricky in deps. If its identity changes, effect re-runs.
  // form.formState.submitCount ensures we don't reset if onSubmit already did.
  // form.getValues can also be a dependency if its return changes effect behavior.
  }, [transactionToEdit, form.reset, form.setValue, onCancelEdit, form.formState.submitCount, form.getValues]);


  const selectedTransactionType = form.watch("type");
  const currentDescriptionPlaceholder = React.useMemo(() => {
    return getTransactionTypeInfo(selectedTransactionType)?.descriptionPlaceholder || "الوصف";
  }, [selectedTransactionType]);

  async function onSubmit(values: TransactionFormData) {
    // Force currency to EGP for internal trips, regardless of UI state
    if (destinationType === DestinationType.INTERNAL) {
      values.currency = Currency.EGP;
    }
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
        } else if (!isEditMode && onTransactionAdded) {
          onTransactionAdded(result.data);
          // Reset form for the next new transaction, client-side
          form.reset({
            ...getBaseFormValues(), // type, description, amount, currency are reset
            date: new Date(),      // date is set to current client time
          });
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
      <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); } }} className="space-y-6">
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
                        // Allow empty string to represent undefined, otherwise parse
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
                {destinationType === DestinationType.INTERNAL ? (
                  <>
                    {/* Hidden input to keep form value */}
                    <input type="hidden" value={Currency.EGP} name={field.name} />
                    {/* Read-only display */}
                    <Input value="الجنيه المصري (ج.م)" disabled readOnly />
                  </>
                ) : (
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
                      {availableCurrencies.map((currencyInfo) => (
                        <SelectItem key={currencyInfo.code} value={currencyInfo.code}>
                          {currencyInfo.name} ({currencyInfo.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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

export default React.memo(AddTransactionForm);
