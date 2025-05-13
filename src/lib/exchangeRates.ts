import type { ExchangeRates } from '@/types';
import { Currency } from '@/lib/constants';

// Default exchange rates - in a real app, fetch this from an API or allow user configuration
// Rates are 1 unit of the currency to USD
export const DEFAULT_EXCHANGE_RATES_TO_USD: ExchangeRates = {
  [Currency.USD]: 1,
  [Currency.AED]: 0.27225, // 1 AED = 0.27225 USD
  [Currency.EGP]: 0.0209,  // 1 EGP = 0.0209 USD
  [Currency.JOD]: 1.41044, // 1 JOD = 1.41044 USD
  [Currency.SAR]: 0.26667, // 1 SAR = 0.26667 USD
};

const EXCHANGE_RATES_STORAGE_KEY = 'exchangeRates_v1'; // Added _v1 for potential future migrations

export function loadExchangeRates(): ExchangeRates {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_EXCHANGE_RATES_TO_USD }; // Return a copy for SSR safety
  }
  try {
    const storedRatesJson = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (storedRatesJson) {
      const parsedRates = JSON.parse(storedRatesJson) as ExchangeRates;
      // Validate and merge with defaults to ensure all currencies are present and valid
      const validatedRates: ExchangeRates = { ...DEFAULT_EXCHANGE_RATES_TO_USD };
      let ratesChanged = false;
      for (const currencyCode of Object.values(Currency)) {
        const defaultRate = DEFAULT_EXCHANGE_RATES_TO_USD[currencyCode];
        if (parsedRates.hasOwnProperty(currencyCode) && typeof parsedRates[currencyCode] === 'number' && parsedRates[currencyCode]! > 0) {
          validatedRates[currencyCode] = parsedRates[currencyCode]!;
        } else {
          // If rate is missing, invalid, or not positive, use default and mark for re-saving
          validatedRates[currencyCode] = defaultRate;
          ratesChanged = true;
        }
      }
       if (ratesChanged) {
         saveExchangeRates(validatedRates); // Save corrected/completed rates
       }
      return validatedRates;
    }
  } catch (error) {
    console.error("Failed to load or parse exchange rates from localStorage:", error);
  }
  // If anything fails or no rates stored, save and return defaults
  const defaultRatesCopy = { ...DEFAULT_EXCHANGE_RATES_TO_USD };
  saveExchangeRates(defaultRatesCopy);
  return defaultRatesCopy;
}

export function saveExchangeRates(rates: ExchangeRates): void {
  if (typeof window === 'undefined') return;
  try {
    // Ensure USD is always 1 before saving
    const ratesToSave = { ...rates, [Currency.USD]: 1 };
    localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(ratesToSave));
  } catch (error) {
    console.error("Failed to save exchange rates to localStorage:", error);
  }
}

export function getExchangeRate(from: Currency, to: Currency, currentRates: ExchangeRates): number {
  if (from === to) return 1;

  const ratesToUse = currentRates || DEFAULT_EXCHANGE_RATES_TO_USD;

  const rateFromToUsd = ratesToUse[from];
  const rateToToUsd = ratesToUse[to];

  if (rateFromToUsd === undefined || rateToToUsd === undefined || rateFromToUsd <= 0 || rateToToUsd <= 0) {
    console.warn(`Exchange rate not available or invalid in provided/default rates for ${from} to ${to}. Using fallback calculation or 1.`);
    // Attempt fallback to defaults if specific rate was missing/invalid in currentRates
    const defaultFrom = DEFAULT_EXCHANGE_RATES_TO_USD[from];
    const defaultTo = DEFAULT_EXCHANGE_RATES_TO_USD[to];
    if(defaultFrom && defaultTo && defaultFrom > 0 && defaultTo > 0) {
        return defaultFrom / defaultTo;
    }
    return 1; // Ultimate fallback
  }
  
  return rateFromToUsd / rateToToUsd;
}

export function convertCurrency(amount: number, from: Currency, to: Currency, currentRates: ExchangeRates): number {
  const rate = getExchangeRate(from, to, currentRates);
  return amount * rate;
}
