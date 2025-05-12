import type { Currency } from '@/lib/constants';

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  REVENUE = 'REVENUE',
  CUSTODY_HANDOVER_OWNER = 'CUSTODY_HANDOVER_OWNER', // Custody given by the company/owner to the driver
  CUSTODY_HANDOVER_CLIENT = 'CUSTODY_HANDOVER_CLIENT', // Custody/advance payment received by the driver from the client
  CUSTODY_RETURN = 'CUSTODY_RETURN', // Money returned by driver to the company
  DRIVER_FEE = 'DRIVER_FEE', // Driver's fee for the trip
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
