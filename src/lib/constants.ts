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
