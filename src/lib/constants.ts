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
  { code: Currency.USD, name: 'US Dollar', symbol: '$' },
  { code: Currency.AED, name: 'UAE Dirham', symbol: 'د.إ' },
  { code: Currency.EGP, name: 'Egyptian Pound', symbol: 'ج.م' },
  { code: Currency.JOD, name: 'Jordanian Dinar', symbol: 'د.أ' },
  { code: Currency.SAR, name: 'Saudi Riyal', symbol: 'ر.س' },
];

export const getCurrencyInfo = (currencyCode: Currency): CurrencyInfo | undefined => {
  return CURRENCIES_INFO.find(c => c.code === currencyCode);
};

export const CONVERSION_TARGET_CURRENCIES: Currency[] = [Currency.USD, Currency.AED, Currency.EGP];
