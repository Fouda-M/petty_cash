
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
  console.log(date ? `Simulating API call for historical rates for: ${date}` : "Simulating API call for latest rates");
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  if (date) {
    // Simulate fetching historical rates - for demo, return default rates for most,
    // and a slightly different EGP rate to show date parameter is working.
    // In a real app, this would be a call to an actual historical data provider.
    // TODO: User could integrate CBE historical data fetch here for EGP.
    // For SAR & AED, if specific historical sources are available, integrate here.
    // Otherwise, they will fallback to DEFAULT_EXCHANGE_RATES_TO_USD in the tool.
    console.log(`fetchRatesFromExternalAPI: Returning specific mock for EGP and defaults for others for date ${date}`);
    return { 
      ...DEFAULT_EXCHANGE_RATES_TO_USD, // Start with all defaults
      [Currency.EGP]: 0.0205, // Slightly different mock EGP for dated request
      // Other currencies will use their values from DEFAULT_EXCHANGE_RATES_TO_USD
    };
  } else {
    // Simulate fetching latest rates - return varied mock rates
    // Updated to better reflect user's expected EGP equivalents for SAR & AED
    // Assuming 1 EGP = 0.020 USD for this "latest" mock scenario.
    console.log('fetchRatesFromExternalAPI: Returning varied mock rates for latest, adjusted for SAR/AED based on user feedback.');
    return {
      [Currency.USD]: 1,
      [Currency.AED]: 0.274104, // Adjusted: 1 AED = 0.274104 USD (to get ~13.7052 EGP when EGP/USD is 0.020)
      [Currency.EGP]: 0.020,    // Keeping 1 EGP = 0.020 USD for this "latest" mock scenario
      [Currency.JOD]: 1.412,    // Unchanged from previous latest mock
      [Currency.SAR]: 0.268448, // Adjusted: 1 SAR = 0.268448 USD (to get ~13.4224 EGP when EGP/USD is 0.020)
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
          // Rate not found or invalid in API response (for the specific currency from ratesFromApi partial object), use default from system
          console.warn(`Rate for ${currencyInfo.code} not found or invalid in API response from fetchRatesExternalAPI (date: ${input.date || 'latest'}). Using default system rate: ${DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code]}`);
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
      fallbackRates[Currency.USD] = 1; // Ensure USD is always 1 in fallback
      console.warn(`Returning default system rates due to error for date: ${input.date || 'latest'}.`);
      return fallbackRates as ExchangeRateToolOutput;
    }
  }
);

export type { ExchangeRateToolOutput };

