


import type { TransactionType } from '@/types';

export enum Currency {
  USD = 'USD',
  AED = 'AED',
  EGP = 'EGP',
  JOD = 'JOD',
  SAR = 'SAR',
  SYP = 'SYP', // Syrian Pound
  SDG = 'SDG', // Sudanese Pound
}

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
}

export const CURRENCIES_INFO: CurrencyInfo[] = [
  { code: Currency.USD, name: 'دولار أمريكي', symbol: '$' },
  { code: Currency.AED, name: 'درهم إماراتي', symbol: 'د.إ' },
  { code: Currency.EGP, name: 'جنيه مصري', symbol: 'ج.م' },
  { code: Currency.JOD, name: 'دينار أردني', symbol: 'د.أ' },
  { code: Currency.SAR, name: 'ريال سعودي', symbol: 'ر.س' },
  { code: Currency.SYP, name: 'ليرة سورية', symbol: 'ل.س' },
  { code: Currency.SDG, name: 'جنيه سوداني', symbol: 'ج.س' }
];

export const getCurrencyInfo = (currencyCode: Currency): CurrencyInfo | undefined => {
  return CURRENCIES_INFO.find(c => c.code === currencyCode);
};

// Define which currencies appear in balance summaries etc.
// USD, AED, EGP were original. You might want to add EUR, GBP here if they are common targets.
export const CONVERSION_TARGET_CURRENCIES: Currency[] = [
  Currency.USD,
  Currency.AED,
  Currency.EGP,
  Currency.SAR,
];

// ---------------- Transaction Type Info (no runtime dependency on enum) ----------------
export interface TransactionTypeInfo {
  type: TransactionType;
  name: string;
  descriptionPlaceholder: string;
}

export const TRANSACTION_TYPES_INFO: TransactionTypeInfo[] = [
  { type: 'EXPENSE' as TransactionType, name: 'مصروف', descriptionPlaceholder: 'مثال: وقود، صيانة' },
  { type: 'REVENUE' as TransactionType, name: 'إيراد رحلة', descriptionPlaceholder: 'مثال: إيراد توصيلة ركاب' },
  { type: 'CUSTODY_HANDOVER_OWNER' as TransactionType, name: 'عهدة مسلمة (صاحب السيارة)', descriptionPlaceholder: 'مثال: عهدة بداية الوردية من المكتب' },
  { type: 'CUSTODY_HANDOVER_CLIENT' as TransactionType, name: 'عهدة مسلمة (العميل)', descriptionPlaceholder: 'مثال: مبلغ مدفوع مقدماً من العميل للسائق' },
  { type: 'CUSTODY_RETURN' as TransactionType, name: 'إرجاع عهدة/إيراد', descriptionPlaceholder: 'مثال: المبلغ المتبقي المُرجع من السائق للشركة' },
  { type: 'DRIVER_FEE' as TransactionType, name: 'أجرة السائق', descriptionPlaceholder: 'مثال: أجرة السائق عن الرحلة' },
];

export const getTransactionTypeInfo = (transactionType: TransactionType): TransactionTypeInfo | undefined =>
  TRANSACTION_TYPES_INFO.find((t) => t.type === transactionType);