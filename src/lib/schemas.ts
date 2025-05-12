import { z } from 'zod';
import { Currency } from '@/lib/constants';

export const transactionSchema = z.object({
  description: z.string().min(1, "Description is required.").max(100, "Description too long."),
  amount: z.coerce.number({invalid_type_error: "Amount must be a number."}).positive("Amount must be a positive number."),
  currency: z.nativeEnum(Currency, { errorMap: () => ({ message: "Please select a currency."}) }),
  date: z.date({ required_error: "Date is required." }),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
