import type { Currency } from '@/lib/constants';

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  REVENUE = 'REVENUE',
  CUSTODY_HANDOVER = 'CUSTODY_HANDOVER',
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
}

export type ExchangeRates = {
  // Rates relative to USD
  [key in Currency]?: number; 
};

