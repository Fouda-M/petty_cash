
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
    FetchExchangeRatesToolInputSchema,
    type FetchExchangeRatesToolInput
} from '@/ai/schemas';

// Function to fetch rates from ExchangeRate-API.com
async function fetchRatesFromExternalAPI(date?: string): Promise<Partial<ExchangeRates>> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;

  if (!apiKey) {
    console.error("ExchangeRate-API key not found in environment variables. Falling back to default rates.");
    return DEFAULT_EXCHANGE_RATES_TO_USD; // Fallback to all defaults if API key is missing
  }

  let apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

  if (date) {
    // Date format is YYYY-MM-DD, API needs YYYY/MM/DD
    const [year, month, day] = date.split('-');
    if (year && month && day) {
      apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/history/USD/${year}/${month}/${day}`;
      console.log(`Fetching historical rates for: ${date} from ${apiUrl}`);
    } else {
      console.warn(`Invalid date format provided: ${date}. Fetching latest rates instead.`);
      console.log(`Fetching latest rates from ${apiUrl}`);
    }
  } else {
    console.log(`Fetching latest rates from ${apiUrl}`);
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error fetching from ExchangeRate-API (status: ${response.status}): ${errorData}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.result === "error") {
      console.error(`ExchangeRate-API returned an error: ${data['error-type']}`);
      throw new Error(`API error: ${data['error-type']}`);
    }
    
    if (!data.conversion_rates) {
        console.error('No conversion_rates found in API response.');
        throw new Error('Invalid API response structure.');
    }

    const apiRates = data.conversion_rates;
    const fetchedRates: Partial<ExchangeRates> = {};

    for (const currencyInfo of CURRENCIES_INFO) {
      if (currencyInfo.code === Currency.USD) {
        fetchedRates[Currency.USD] = 1;
      } else if (apiRates[currencyInfo.code]) {
        // API provides rates as "1 USD = X FOREIGN_CURRENCY"
        // We need "1 FOREIGN_CURRENCY = Y USD", so Y = 1 / X
        const rateAgainstUSD = apiRates[currencyInfo.code];
        if (typeof rateAgainstUSD === 'number' && rateAgainstUSD > 0) {
          fetchedRates[currencyInfo.code] = 1 / rateAgainstUSD;
        } else {
            console.warn(`Invalid rate for ${currencyInfo.code} from API: ${rateAgainstUSD}. Will use default if available.`);
        }
      } else {
        console.warn(`Rate for ${currencyInfo.code} not found in API response. Will use default if available.`);
      }
    }
    console.log(`Successfully fetched rates from API for date: ${date || 'latest'}`);
    return fetchedRates;

  } catch (error) {
    console.error(`Error fetching or processing rates from ExchangeRate-API (date: ${date || 'latest'}):`, error);
    // In case of any error during API fetch or processing, return an empty object
    // The calling function `fetchExchangeRatesTool` will then use defaults for all.
    return {}; 
  }
}

export const fetchExchangeRatesTool = ai.defineTool(
  {
    name: 'fetchExchangeRatesTool',
    description: 'Fetches exchange rates for supported currencies against USD from an external source, for a specific date if provided, otherwise latest rates.',
    inputSchema: FetchExchangeRatesToolInputSchema,
    outputSchema: ExchangeRateToolOutputSchema,
  },
  async (input: FetchExchangeRatesToolInput) => {
    console.log(`Fetching exchange rates using fetchExchangeRatesTool for date: ${input.date || 'latest'}...`);
    const finalRates: Record<string, number> = {};

    try {
      const ratesFromApi = await fetchRatesFromExternalAPI(input.date);
      
      for (const currencyInfo of CURRENCIES_INFO) {
        const apiRate = ratesFromApi[currencyInfo.code];
        if (apiRate !== undefined && typeof apiRate === 'number' && apiRate > 0) {
          finalRates[currencyInfo.code] = apiRate;
        } else {
          // Rate not found or invalid in API response for the specific currency, use default from system
          console.warn(`Rate for ${currencyInfo.code} not successfully fetched from API (date: ${input.date || 'latest'}). Using default system rate: ${DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code]}`);
          finalRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
        }
      }
      
      finalRates[Currency.USD] = 1; // Ensure USD is always 1

      console.log(`Successfully processed rates for date: ${input.date || 'latest'}:`, finalRates);
      return finalRates as ExchangeRateToolOutput;

    } catch (error) { // This catch is mainly for unexpected errors within the tool logic itself now
      console.error(`Critical error in fetchExchangeRatesTool (date: ${input.date || 'latest'}):`, error);
      const fallbackRates: Record<string, number> = {};
       for (const currencyInfo of CURRENCIES_INFO) {
        fallbackRates[currencyInfo.code] = DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code];
      }
      fallbackRates[Currency.USD] = 1; // Ensure USD is always 1 in fallback
      console.warn(`Returning all default system rates due to critical tool error for date: ${input.date || 'latest'}.`);
      return fallbackRates as ExchangeRateToolOutput;
    }
  }
);

export type { ExchangeRateToolOutput };
