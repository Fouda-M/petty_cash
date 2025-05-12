import type { Currency } from '@/lib/constants';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: Currency;
}

export type ExchangeRates = {
  // Rates relative to USD
  [key in Currency]?: number; 
};
