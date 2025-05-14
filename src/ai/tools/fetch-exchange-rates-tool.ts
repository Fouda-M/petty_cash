
'use server';
/**
 * @fileOverview Tool for fetching current exchange rates for a specific date or latest.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Currency, CURRENCIES_INFO } from '@/lib/constants';
import type { ExchangeRates } from '@/types';
import { DEFAULT_EXCHANGE_RATES_TO_USD } from '@/lib/exchangeRates';
import { 
    ExchangeRateToolOutputSchema, 
    type ExchangeRateToolOutput,
    FetchExchangeRatesToolInputSchema, // Import the input schema
    type FetchExchangeRatesToolInput    // Import the input type
} from '@/ai/schemas';


// Placeholder for a real API call
async function fetchRatesFromExternalAPI(date?: string): Promise<Partial<ExchangeRates>> {
  // In a real application, this would call an external API.
  // If a date is provided, it would fetch historical rates for that date.
  // For demonstration, we'll return different mocks based on whether a date is provided.
  console.log(date ? `Simulating API call for historical rates for: ${date}` : "Simulating API call for latest rates");
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  if (date) {
    // Simulate fetching historical rates - for demo, return default rates
    // In a real app, this would be a call to an actual historical data provider.
    console.log(`fetchRatesFromExternalAPI: Returning DEFAULT_EXCHANGE_RATES_TO_USD for date ${date}`);
    return { ...DEFAULT_EXCHANGE_RATES_TO_USD };
  } else {
    // Simulate fetching latest rates - return slightly varied mock rates
    console.log('fetchRatesFromExternalAPI: Returning varied mock rates for latest');
    return {
      [Currency.USD]: 1,
      [Currency.AED]: 0.275, // Example: 1 AED = 0.275 USD
      [Currency.EGP]: 0.020, // Example: 1 EGP = 0.020 USD
      [Currency.JOD]: 1.412, // Example: 1 JOD = 1.412 USD
      [Currency.SAR]: 0.267, // Example: 1 SAR = 0.267 USD
    };
  }
}

export const fetchExchangeRatesTool = ai.defineTool(
  {
    name: 'fetchExchangeRatesTool',
    description: 'Fetches exchange rates for supported currencies against USD from an external source, for a specific date if provided, otherwise latest rates.',
    inputSchema: FetchExchangeRatesToolInputSchema, // Use imported input schema
    outputSchema: ExchangeRateToolOutputSchema,
  },
  async (input: FetchExchangeRatesToolInput) => { // Tool function now accepts input
    console.log(`Fetching exchange rates using fetchExchangeRatesTool for date: ${input.date || 'latest'}...`);
    try {
      const ratesFromApi = await fetchRatesFromExternalAPI(input.date);
      const validatedRates: Record<string, number> = {};

      for (const currencyInfo of CURRENCIES_INFO) {
        const fetchedRate = ratesFromApi[currencyInfo.code];
        if (fetchedRate !== undefined && typeof fetchedRate === 'number' && fetchedRate > 0) {
          validatedRates[currencyInfo.code] = fetchedRate;
        } else {
          console.warn(`Rate for ${currencyInfo.code} not found or invalid in API response (date: ${input.date || 'latest'}). Using default system rate.`);
          validatedRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
        }
      }
      
      validatedRates[Currency.USD] = 1; // Ensure USD is always 1

      console.log(`Successfully fetched and validated rates for date: ${input.date || 'latest'}:`, validatedRates);
      return validatedRates as ExchangeRateToolOutput;
    } catch (error) {
      console.error(`Error fetching or processing exchange rates in tool (date: ${input.date || 'latest'}):`, error);
      const fallbackRates: Record<string, number> = {};
       for (const currencyInfo of CURRENCIES_INFO) {
        fallbackRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
      }
      fallbackRates[Currency.USD] = 1;
      return fallbackRates as ExchangeRateToolOutput;
    }
  }
);

export type { ExchangeRateToolOutput };
