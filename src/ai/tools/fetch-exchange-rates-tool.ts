
'use server';
/**
 * @fileOverview Tool for fetching current exchange rates.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Currency, CURRENCIES_INFO } from '@/lib/constants';
import type { ExchangeRates } from '@/types';
import { DEFAULT_EXCHANGE_RATES_TO_USD } from '@/lib/exchangeRates';
import { ExchangeRateToolOutputSchema, type ExchangeRateToolOutput } from '@/ai/schemas';


// Placeholder for a real API call
async function fetchRatesFromExternalAPI(): Promise<Partial<ExchangeRates>> {
  // In a real application, this would call an external API.
  // For demonstration, we'll return mock rates slightly different from defaults
  // to show they are being "fetched".
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // These are example rates and should be fetched from a reliable source.
  return {
    [Currency.USD]: 1,
    [Currency.AED]: 0.275, // Example: 1 AED = 0.275 USD
    [Currency.EGP]: 0.020, // Example: 1 EGP = 0.020 USD
    [Currency.JOD]: 1.412, // Example: 1 JOD = 1.412 USD
    [Currency.SAR]: 0.267, // Example: 1 SAR = 0.267 USD
  };
}

export const fetchExchangeRatesTool = ai.defineTool(
  {
    name: 'fetchExchangeRatesTool',
    description: 'Fetches the latest exchange rates for supported currencies against USD from an external source.',
    inputSchema: z.object({}).describe("No input required to fetch general exchange rates."),
    outputSchema: ExchangeRateToolOutputSchema, // Use imported schema
  },
  async () => {
    console.log('Fetching exchange rates using fetchExchangeRatesTool...');
    try {
      const ratesFromApi = await fetchRatesFromExternalAPI();
      const validatedRates: Record<string, number> = {};

      for (const currencyInfo of CURRENCIES_INFO) {
        const fetchedRate = ratesFromApi[currencyInfo.code];
        if (fetchedRate !== undefined && typeof fetchedRate === 'number' && fetchedRate > 0) {
          validatedRates[currencyInfo.code] = fetchedRate;
        } else {
          // If rate not found in API or invalid, fallback to a default for that currency
          console.warn(`Rate for ${currencyInfo.code} not found or invalid in API response. Using default system rate.`);
          validatedRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
        }
      }
      
      // Ensure USD is always 1, overriding API if necessary
      validatedRates[Currency.USD] = 1;

      console.log('Successfully fetched and validated rates:', validatedRates);
      return validatedRates as ExchangeRateToolOutput;
    } catch (error) {
      console.error('Error fetching or processing exchange rates in tool:', error);
      // Fallback to default system rates if the entire process fails.
      // This ensures the tool always returns a valid structure.
      const fallbackRates: Record<string, number> = {};
       for (const currencyInfo of CURRENCIES_INFO) {
        fallbackRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
      }
      fallbackRates[Currency.USD] = 1; // Ensure USD is 1 in fallback
      return fallbackRates as ExchangeRateToolOutput;
    }
  }
);

// Export the type for external use if needed, though it's also exported from schemas.ts
export type { ExchangeRateToolOutput };
