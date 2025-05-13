
'use server';
/**
 * @fileOverview Flow for getting the latest exchange rates using a tool.
 *
 * - getLatestExchangeRates - A function that invokes the flow to fetch rates.
 * - GetLatestExchangeRatesOutput - The return type for the getLatestExchangeRates function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchExchangeRatesTool } from '@/ai/tools/fetch-exchange-rates-tool';
import { 
    ExchangeRateToolOutputSchema,
    GetLatestExchangeRatesFlowOutputSchema,
    type GetLatestExchangeRatesFlowOutput as AppGetLatestExchangeRatesOutput
} from '@/ai/schemas';
// Currency and CURRENCIES_INFO might still be needed if used for other logic, not just schema definition.
// import { Currency, CURRENCIES_INFO } from '@/lib/constants'; 
// AppExchangeRates is used as the underlying type for GetLatestExchangeRatesFlowOutputSchema refinement.
// import type { ExchangeRates as AppExchangeRates } from '@/types';


// Type for the flow, now imported via AppGetLatestExchangeRatesOutput alias
export type GetLatestExchangeRatesOutput = AppGetLatestExchangeRatesOutput;


export async function getLatestExchangeRates(): Promise<GetLatestExchangeRatesOutput> {
  return getLatestExchangeRatesFlow({});
}

const getRatesPrompt = ai.definePrompt({
    name: 'getLatestExchangeRatesPrompt',
    system: 'You are an assistant that helps fetch the latest exchange rates. Use the available tool to get this information and provide the result as your output.',
    tools: [fetchExchangeRatesTool],
    inputSchema: z.object({}).describe("No specific input needed for this prompt"),
    outputSchema: ExchangeRateToolOutputSchema, // Use imported schema from ai/schemas.ts
});


const getLatestExchangeRatesFlow = ai.defineFlow(
  {
    name: 'getLatestExchangeRatesFlow',
    inputSchema: z.object({}), // No input for the flow itself
    outputSchema: GetLatestExchangeRatesFlowOutputSchema, // Use imported schema from ai/schemas.ts
  },
  async () => {
    console.log('getLatestExchangeRatesFlow started');
    
    const llmResponse = await getRatesPrompt({});

    if (llmResponse.output) {
        console.log('LLM response output:', llmResponse.output);
        // The output from the prompt should match ExchangeRateToolOutputSchema.
        // We then ensure it's correctly typed as AppExchangeRates / GetLatestExchangeRatesOutput.
        // The schemas are designed to be compatible.
        const validatedOutput = GetLatestExchangeRatesFlowOutputSchema.safeParse(llmResponse.output);
        if (validatedOutput.success) {
            return validatedOutput.data;
        } else {
            console.error('LLM output failed validation against GetLatestExchangeRatesFlowOutputSchema:', validatedOutput.error);
            throw new Error('Fetched exchange rates data is invalid.');
        }
    }

    console.error('Failed to get exchange rates from LLM/tool interaction. Output was not found or was empty.');
    throw new Error('Could not retrieve exchange rates.');
  }
);
