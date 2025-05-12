import { z } from 'zod';
import { Currency } from '@/lib/constants';

export const transactionSchema = z.object({
  description: z.string().min(1, "الوصف مطلوب.").max(100, "الوصف طويل جدًا."),
  amount: z.coerce.number({invalid_type_error: "يجب أن يكون المبلغ رقمًا."}).positive("يجب أن يكون المبلغ رقمًا موجبًا."),
  currency: z.nativeEnum(Currency, { errorMap: () => ({ message: "يرجى اختيار عملة."}) }),
  date: z.date({ required_error: "التاريخ مطلوب." }),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
