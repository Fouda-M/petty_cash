"use server";

import { transactionSchema, type TransactionFormData } from "@/lib/schemas";
import type { Transaction } from "@/types";

export async function addTransactionAction(
  values: TransactionFormData
): Promise<{ success: boolean; data?: Transaction; error?: string; errors?: z.ZodIssue[] }> {
  const validatedFields = transactionSchema.safeParse(values);

  if (!validatedFields.success) {
    return { 
      success: false, 
      error: "Invalid data provided.",
      errors: validatedFields.error.issues,
    };
  }

  // In a real app, this would involve saving to a database.
  // For now, we simulate it and return the created transaction.
  const newTransaction: Transaction = {
    id: crypto.randomUUID(),
    date: validatedFields.data.date,
    description: validatedFields.data.description,
    amount: validatedFields.data.amount,
    currency: validatedFields.data.currency,
  };

  // Simulate a delay
  // await new Promise(resolve => setTimeout(resolve, 500));

  return { success: true, data: newTransaction };
}
