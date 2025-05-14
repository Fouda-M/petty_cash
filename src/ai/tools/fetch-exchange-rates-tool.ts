
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
      console.warn(`Invalid date format provided: ${date}. Fetching latest rates from ${apiUrl} (the 'latest' endpoint).`);
      // apiUrl remains the 'latest' endpoint if date format is invalid
    }
  } else {
    console.log(`Fetching latest rates from ${apiUrl}`);
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.text();
      let specificErrorMessage = `Error fetching from ExchangeRate-API (status: ${response.status}): ${errorData}`;
      if (date) {
        specificErrorMessage += ` (for historical date: ${date}). This may be due to API plan limitations or an invalid date. Default rates may be used as fallback.`;
      }
      console.error(specificErrorMessage);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.result === "error") {
      const errorType = data['error-type'] || 'Unknown API Error';
      let specificErrorMessage = `ExchangeRate-API returned an error: ${errorType}`;
      if (date) { // If it was a historical request
        specificErrorMessage += ` (for historical date: ${date}). This may be due to API plan limitations (e.g., historical data not supported on free plan) or an invalid date. Default rates may be used as fallback.`;
      }
      console.error(specificErrorMessage);
      throw new Error(`API error: ${errorType}`);
    }
    
    if (!data.conversion_rates) {
        let specificErrorMessage = 'No conversion_rates found in API response.';
        if (date) {
             specificErrorMessage += ` (for historical date: ${date}). Default rates may be used as fallback.`;
        }
        console.error(specificErrorMessage);
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
          // The API gives how many units of foreign currency 1 USD buys.
          // We want how many USD 1 unit of foreign currency buys.
          // So, if 1 USD = 3.67 AED, then 1 AED = 1/3.67 USD.
          // Wait, the API gives rate FROM USD to other currency.
          // e.g. USD -> EGP rate = 30 means 1 USD = 30 EGP.
          // Our app wants 1 EGP = X USD. So X = 1/30. This is correct.
          // Let's re-check the API documentation for exchangerate-api for how `conversion_rates` are structured.
          // "conversion_rates": {"USD": 1, "AED": 3.6725, "EUR": 0.92, ...}
          // This means 1 BASE_CURRENCY (USD in our case) = X TARGET_CURRENCY.
          // So, 1 USD = 3.6725 AED.
          // We store rates as "1 FOREIGN_CURRENCY = Y USD".
          // So for AED, Y_AED = 1 / (rate_USD_to_AED_from_api).
          // Example: 1 AED = 1 / 3.6725 USD. This is what `0.27225` in our defaults represents.
          // The current code `fetchedRates[currencyInfo.code] = 1 / rateAgainstUSD;` seems correct for this interpretation.

          // Let's assume the previous user feedback on "latest rates" for SAR/AED meant they were looking at rates *to EGP* in the UI,
          // and the mock data I adjusted was for `1 FOREIGN_CURRENCY = X USD`.
          // The API returns `1 USD = X FOREIGN_CURRENCY`.
          // So, to get `1 FOREIGN_CURRENCY = Y USD`, we need `Y = 1/X`.
          // The current logic for API: `fetchedRates[currencyInfo.code] = 1 / rateAgainstUSD;` IS CORRECT.

          // The mock data for "latest" that I introduced earlier for SAR & AED was:
          // SAR_TO_USD_MOCK = 1 / 13.4224 * EGP_TO_USD_MOCK (0.020) approx 0.001489...
          // AED_TO_USD_MOCK = 1 / 13.7052 * EGP_TO_USD_MOCK (0.020) approx 0.001459...
          // The previous hardcoded DEFAULT_EXCHANGE_RATES_TO_USD were:
          // AED: 0.27225 (1 AED = 0.27225 USD) -> 1 USD = 3.67 AED
          // SAR: 0.26667 (1 SAR = 0.26667 USD) -> 1 USD = 3.75 SAR

          // The API will return, for example, SAR: 3.75 (meaning 1 USD = 3.75 SAR).
          // My code will do 1 / 3.75 = 0.26666... which is the rate of 1 SAR to USD. This is correct.

          fetchedRates[currencyInfo.code] = 1 / rateAgainstUSD;

        } else {
            console.warn(`Invalid rate for ${currencyInfo.code} from API: ${rateAgainstUSD}. Will use default if available.`);
        }
      } else {
        console.warn(`Rate for ${currencyInfo.code} not found in API response. Will use default if available.`);
      }
    }
    console.log(`Successfully fetched and processed rates from API for date: ${date || 'latest'}`);
    return fetchedRates;

  } catch (error) {
    console.error(`Error fetching or processing rates from ExchangeRate-API (date: ${date || 'latest'}):`, error, `. Default rates may be used as fallback.`);
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
          console.warn(`Rate for ${currencyInfo.code} not successfully fetched or was invalid from API (date: ${input.date || 'latest'}). Using default system rate: ${DEFAULT_EXCHANGE_RATES_TO_USD[currencyInfo.code]}`);
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

