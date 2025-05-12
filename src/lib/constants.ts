import { TransactionType as TxType } from '@/types'; // Import with an alias to avoid conflict if re-exporting

export enum Currency {
  USD = 'USD',
  AED = 'AED',
  EGP = 'EGP',
  JOD = 'JOD',
  SAR = 'SAR',
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
];

export const getCurrencyInfo = (currencyCode: Currency): CurrencyInfo | undefined => {
  return CURRENCIES_INFO.find(c => c.code === currencyCode);
};

export const CONVERSION_TARGET_CURRENCIES: Currency[] = [Currency.USD, Currency.AED, Currency.EGP];

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
  { type: TxType.CUSTODY_HANDOVER, name: 'تسليم عهدة', descriptionPlaceholder: 'مثال: عهدة بداية الوردية' },
];

export const getTransactionTypeInfo = (transactionType: TxType): TransactionTypeInfo | undefined => {
  return TRANSACTION_TYPES_INFO.find(t => t.type === transactionType);
};
