
import { Currency } from '@/lib/constants';
import type { TripDetailsFormData } from '@/lib/schemas'; // Import TripDetailsFormData

// Re-export Currency for convenience
export { Currency };
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
  [key in Currency]: number; // Ensures all currency keys are present and are numbers
};

export enum DestinationType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export interface TripDetails { // This interface is effectively TripDetailsFormData
  driverName: string;
  tripStartDate: Date;
  tripEndDate: Date;
  destinationType: DestinationType;
  cityName?: string;
  countryName?: string;
}

export interface SavedTrip {
  id: string;
  name: string; // e.g., "Driver Name - Start Date"
  details: TripDetailsFormData; // Use the existing form data type
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  createdAt: string; // ISO date string for when the trip was saved
  updatedAt?: string; // ISO date string for when the trip was last updated
}

export interface ReportDataPayload {
  tripDetails: TripDetailsFormData;
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
}
