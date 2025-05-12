import type { ExchangeRates } from '@/types';
import { Currency } from '@/lib/constants'; // Import Currency as a value

// Mock exchange rates - in a real app, fetch this from an API
// Rates are 1 unit of the currency to USD
const MOCK_RATES_TO_USD: ExchangeRates = {
  [Currency.USD]: 1,
  [Currency.AED]: 0.27225, // 1 AED = 0.27225 USD
  [Currency.EGP]: 0.0209,  // 1 EGP = 0.0209 USD (approx as of late 2023/early 2024)
  [Currency.JOD]: 1.41044, // 1 JOD = 1.41044 USD
  [Currency.SAR]: 0.26667, // 1 SAR = 0.26667 USD
};

export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1;

  const rateFromToUsd = MOCK_RATES_TO_USD[from];
  const rateToToUsd = MOCK_RATES_TO_USD[to];

  if (rateFromToUsd === undefined || rateToToUsd === undefined) {
    console.warn(`Exchange rate not available for ${from} to ${to}. Using fallback rate of 1.`);
    return 1; // Fallback or error
  }
  
  // Convert 'from' currency to USD, then USD to 'to' currency
  return rateFromToUsd / rateToToUsd;
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  const rate = getExchangeRate(from, to);
  return amount * rate;
}
