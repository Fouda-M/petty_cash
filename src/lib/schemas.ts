
import { z } from 'zod';
import { Currency } from '@/lib/constants';
import { TransactionType, DestinationType } from '@/types';

export const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType, { errorMap: () => ({ message: "يرجى اختيار نوع المعاملة."}) }),
  description: z.string().min(1, "الوصف مطلوب.").max(100, "الوصف طويل جدًا."),
  amount: z.coerce.number({invalid_type_error: "يجب أن يكون المبلغ رقمًا."}).positive("يجب أن يكون المبلغ رقمًا موجبًا."),
  currency: z.nativeEnum(Currency, { errorMap: () => ({ message: "يرجى اختيار عملة."}) }),
  date: z.date({ required_error: "التاريخ مطلوب." }),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

export const tripDetailsSchema = z.object({
  driverName: z.string().min(1, "اسم السائق مطلوب."),
  tripStartDate: z.date({ required_error: "تاريخ بدء الرحلة مطلوب." }),
  tripEndDate: z.date({ required_error: "تاريخ نهاية الرحلة مطلوب." }),
  destinationType: z.nativeEnum(DestinationType, { errorMap: () => ({ message: "يرجى اختيار نوع الوجهة."}) }),
  cityName: z.string().optional(),
  countryName: z.string().optional(),
}).refine(data => {
  if (data.tripEndDate && data.tripStartDate) {
    return data.tripEndDate >= data.tripStartDate;
  }
  return true;
}, {
  message: "تاريخ نهاية الرحلة يجب أن يكون بعد أو نفس تاريخ البدء.",
  path: ["tripEndDate"],
}).superRefine((data, ctx) => {
  if (data.destinationType === DestinationType.EXTERNAL) {
    if (!data.countryName || data.countryName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اسم البلد مطلوب للوجهات الخارجية.",
        path: ["countryName"],
      });
    }
  }
  if (data.destinationType === DestinationType.INTERNAL) {
    if (!data.cityName || data.cityName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اسم المدينة مطلوب للوجهات الداخلية.",
        path: ["cityName"],
      });
    }
  }
});

export type TripDetailsFormData = z.infer<typeof tripDetailsSchema>;

