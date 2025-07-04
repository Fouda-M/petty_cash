
import type { ExchangeRates } from '@/types';
import { Currency } from '@/lib/constants';

// Default exchange rates - in a real app, fetch this from an API or allow user configuration
// Rates are 1 unit of the currency to EGP (base = 1)
export const DEFAULT_EXCHANGE_RATES_TO_EGP: ExchangeRates = {
  [Currency.EGP]: 1,
  [Currency.USD]: 30,
  [Currency.AED]: 8.35, // 1 AED = 0.27225 USD
  
  [Currency.JOD]: 42, // 1 JOD = 1.41044 USD
  [Currency.SAR]: 8, // 1 SAR = 0.26667 USD
  [Currency.SYP]: 0.006, // 1 SYP ≈ 0.0001 USD (placeholder)
  [Currency.SDG]: 0.09, // 1 SDG ≈ 0.0017 USD (placeholder)
};

const EXCHANGE_RATES_STORAGE_KEY = 'exchangeRates_v1';

export function loadExchangeRates(): ExchangeRates {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_EXCHANGE_RATES_TO_EGP }; // Return a copy for SSR safety
  }
  try {
    const storedRatesJson = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (storedRatesJson) {
      const parsedRates = JSON.parse(storedRatesJson) as Partial<ExchangeRates>;
      const validatedRates: ExchangeRates = {} as ExchangeRates;
      let ratesChanged = false;

      // Ensure all currencies from the enum have a rate, falling back to defaults
      for (const currencyCode of Object.values(Currency)) {
        const defaultRate = DEFAULT_EXCHANGE_RATES_TO_EGP[currencyCode];
        if (parsedRates.hasOwnProperty(currencyCode) && typeof parsedRates[currencyCode] === 'number' && parsedRates[currencyCode]! > 0) {
          validatedRates[currencyCode] = parsedRates[currencyCode]!;
        } else {
          validatedRates[currencyCode] = defaultRate; // Use app-wide default
          ratesChanged = true; // Mark if any rate was set to default
        }
      }
      // If any rate was defaulted, resave to ensure localStorage is up-to-date with all currencies
       if (ratesChanged) {
         saveExchangeRates(validatedRates); 
       }
      return validatedRates;
    }
  } catch (error) {
    console.error("Failed to load or parse exchange rates from localStorage:", error);
  }
  // If anything fails or no rates stored, save and return defaults
  const defaultRatesCopy = { ...DEFAULT_EXCHANGE_RATES_TO_EGP };
  saveExchangeRates(defaultRatesCopy);
  return defaultRatesCopy;
}

export function saveExchangeRates(rates: ExchangeRates): void {
  if (typeof window === 'undefined') return;
  try {
    // Ensure EGP is always 1 and all defined currencies have a rate before saving
    const ratesToSave: ExchangeRates = { ...DEFAULT_EXCHANGE_RATES_TO_EGP, ...rates, [Currency.EGP]: 1 };
    localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(ratesToSave));
  } catch (error) {
    console.error("Failed to save exchange rates to localStorage:", error);
  }
}

export function getExchangeRate(from: Currency, to: Currency, currentRates?: ExchangeRates): number {
  if (from === to) return 1;

  const ratesToUse = currentRates || loadExchangeRates(); 

  const rateFromToUsd = ratesToUse[from];
  const rateToToUsd = ratesToUse[to];
  
  if (rateFromToUsd === undefined || rateToToUsd === undefined || rateFromToUsd <= 0 || rateToToUsd <= 0) {
    console.warn(`Exchange rate not available or invalid in provided/default rates for ${from} to ${to}. Using direct default fallback.`);
    // Fallback to complete defaults from DEFAULT_EXCHANGE_RATES_TO_EGP if specific rate was missing/invalid
    const defaultFrom = DEFAULT_EXCHANGE_RATES_TO_EGP[from];
    const defaultTo = DEFAULT_EXCHANGE_RATES_TO_EGP[to];
    if(defaultFrom && defaultTo && defaultFrom > 0 && defaultTo > 0) {
        return defaultFrom / defaultTo;
    }
    console.error(`CRITICAL: Exchange rate default not found for ${from} or ${to}. Returning 1.`);
    return 1; // Ultimate fallback
  }
  
  return rateFromToUsd / rateToToUsd;
}

export function convertCurrency(amount: number, from: Currency, to: Currency, currentRates?: ExchangeRates): number {
  const rate = getExchangeRate(from, to, currentRates);
  return amount * rate;
}

    