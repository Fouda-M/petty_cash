
import { TransactionType as TxType } from '@/types'; // Import with an alias to avoid conflict if re-exporting

export enum Currency {
  USD = 'USD',
  AED = 'AED',
  EGP = 'EGP',
  JOD = 'JOD',
  SAR = 'SAR',
  EUR = 'EUR', // Added EUR
  GBP = 'GBP', // Added GBP
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
  { code: Currency.EUR, name: 'يورو', symbol: '€' }, // Added EUR info
  { code: Currency.GBP, name: 'جنيه إسترليني', symbol: '£' }, // Added GBP info
];

export const getCurrencyInfo = (currencyCode: Currency): CurrencyInfo | undefined => {
  return CURRENCIES_INFO.find(c => c.code === currencyCode);
};

// Define which currencies appear in balance summaries etc.
// USD, AED, EGP were original. You might want to add EUR, GBP here if they are common targets.
export const CONVERSION_TARGET_CURRENCIES: Currency[] = [Currency.USD, Currency.AED, Currency.EGP, Currency.EUR, Currency.GBP];

// Re-export TransactionType for easier import elsewhere if needed, or use TxType directly.
export const TransactionType = TxType;

export interface TransactionTypeInfo {
  type: TxType;
  name: string;
  descriptionPlaceholder: string;
}

export const TRANSACTION_TYPES_INFO: TransactionTypeInfo[] = [
  { type: TxType.EXPENSE, name: 'مصروف', descriptionPlaceholder: 'مثال: وقود, صيانة' },
  { type: TxType.REVENUE, name: 'إيراد رحلة', descriptionPlaceholder: 'مثال: إيراد توصيلة ركاب' },
  { type: TxType.CUSTODY_HANDOVER_OWNER, name: 'عهدة مسلمة (صاحب السيارة)', descriptionPlaceholder: 'مثال: عهدة بداية الوردية من المكتب' },
  { type: TxType.CUSTODY_HANDOVER_CLIENT, name: 'عهدة مسلمة (العميل)', descriptionPlaceholder: 'مثال: مبلغ مدفوع مقدماً من العميل للسائق' },
  { type: TxType.CUSTODY_RETURN, name: 'إرجاع عهدة/إيراد', descriptionPlaceholder: 'مثال: المبلغ المتبقي المُرجع من السائق للشركة' },
  { type: TxType.DRIVER_FEE, name: 'أجرة السائق', descriptionPlaceholder: 'مثال: أجرة السائق عن الرحلة' },
];

export const getTransactionTypeInfo = (transactionType: TxType): TransactionTypeInfo | undefined => {
  return TRANSACTION_TYPES_INFO.find(t => t.type === transactionType);
};

    