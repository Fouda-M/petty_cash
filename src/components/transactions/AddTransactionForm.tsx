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
import { CURRENCIES_INFO, Currency } from "@/lib/constants";
import type { Transaction } from "@/types";
import { Loader2 } from "lucide-react";
import * as React from "react";

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
      amount: undefined, // Default to undefined to show placeholder
      currency: undefined, // Default to undefined for placeholder
      date: new Date(),
    },
  });

  async function onSubmit(values: TransactionFormData) {
    setIsSubmitting(true);
    try {
      const result = await addTransactionAction(values);
      if (result.success && result.data) {
        toast({
          title: "Transaction Added",
          description: `${result.data.description} successfully recorded.`,
        });
        onTransactionAdded(result.data);
        form.reset();
        form.setValue("date", new Date()); // Reset date to today
      } else {
        toast({
          variant: "destructive",
          title: "Error Adding Transaction",
          description: result.error || "An unknown error occurred.",
        });
         // Set form errors if available
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
        title: "Submission Error",
        description: "Could not submit the form. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Add New Transaction</CardTitle>
        <CardDescription>Enter the details of your financial transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Salary" {...field} />
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
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} step="0.01" />
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
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES_INFO.map((currencyInfo) => (
                          <SelectItem key={currencyInfo.code} value={currencyInfo.code}>
                            {currencyInfo.code} ({currencyInfo.symbol})
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
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                     <DatePicker date={field.value} setDate={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Transaction
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Need to import Card components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
