
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
    GetLatestExchangeRatesFlowInputSchema, // Import the flow input schema
    type GetLatestExchangeRatesFlowInput,   // Import the flow input type
    type GetLatestExchangeRatesFlowOutput as AppGetLatestExchangeRatesOutput
} from '@/ai/schemas';
import { format } from 'date-fns';


export type GetLatestExchangeRatesOutput = AppGetLatestExchangeRatesOutput;


// Updated wrapper function to accept an optional date
export async function getLatestExchangeRates(date?: Date | string): Promise<GetLatestExchangeRatesOutput> {
  let dateString: string | undefined = undefined;
  if (date) {
    if (typeof date === 'string') {
      // Potentially validate or reformat string date if necessary
      dateString = date; 
    } else { // It's a Date object
      dateString = format(date, 'yyyy-MM-dd');
    }
  }
  return getLatestExchangeRatesFlow({ date: dateString });
}

const getRatesPrompt = ai.definePrompt({
    name: 'getLatestExchangeRatesPrompt',
    system: 'You are an assistant whose sole task is to fetch currency exchange rates using the provided "fetchExchangeRatesTool".',
    tools: [fetchExchangeRatesTool],
    inputSchema: GetLatestExchangeRatesFlowInputSchema, // Use the new input schema for the prompt
    outputSchema: ExchangeRateToolOutputSchema, 
    prompt: `{{#if date}}Retrieve the exchange rates for all supported currencies against USD for the date {{date}} using the "fetchExchangeRatesTool".{{else}}Retrieve the *latest* exchange rates for all supported currencies against USD using the "fetchExchangeRatesTool".{{/if}} Your final response must be a JSON object containing these rates, strictly conforming to the "ExchangeRateToolOutputSchema". Do not include any conversational text, explanations, or markdown formatting around the JSON object.`,
});


const getLatestExchangeRatesFlow = ai.defineFlow(
  {
    name: 'getLatestExchangeRatesFlow',
    inputSchema: GetLatestExchangeRatesFlowInputSchema, // Use the new input schema for the flow
    outputSchema: GetLatestExchangeRatesFlowOutputSchema,
  },
  async (input: GetLatestExchangeRatesFlowInput) => { // Flow now accepts input object
    // Ensure this only runs on the client
    if (typeof window === "undefined") {
      throw new Error("getLatestExchangeRatesFlow can only be called on the client");
    }

    console.log(`getLatestExchangeRatesFlow started for date: ${input.date || 'latest'}`);
    let llmResponse;
    try {
      llmResponse = await getRatesPrompt(input); // Pass the input (with date) to the prompt
      console.log(`Full LLM Response from getRatesPrompt (date: ${input.date || 'latest'}):`, JSON.stringify(llmResponse, null, 2));
    } catch (promptError: any) {
      console.error(`Error calling getRatesPrompt (date: ${input.date || 'latest'}):`, promptError);
      const errorMessage = promptError instanceof Error ? promptError.message : String(promptError);
      console.error(`getRatesPrompt error details (date: ${input.date || 'latest'}):`, JSON.stringify(promptError, null, 2));
      throw new Error(`Failed to interact with the LLM for exchange rates (date: ${input.date || 'latest'}): ${errorMessage}`);
    }

    if (llmResponse && llmResponse.output) {
        console.log(`LLM response.output received (date: ${input.date || 'latest'}):`, JSON.stringify(llmResponse.output, null, 2));
        const validatedOutput = GetLatestExchangeRatesFlowOutputSchema.safeParse(llmResponse.output);
        if (validatedOutput.success) {
            console.log(`Validated llmResponse.output successfully (date: ${input.date || 'latest'}):`, JSON.stringify(validatedOutput.data, null, 2));
            return validatedOutput.data;
        } else {
            console.error(`llmResponse.output failed validation (date: ${input.date || 'latest'}):`, validatedOutput.error.flatten());
            console.error(`Raw llmResponse.output that failed (date: ${input.date || 'latest'}):`, JSON.stringify(llmResponse.output, null, 2));
        }
    }

    if (llmResponse && llmResponse.candidates && llmResponse.candidates.length > 0) {
      const candidate = llmResponse.candidates[0];
      if (candidate.message && candidate.message.content) {
        for (const part of candidate.message.content) {
          if (part.toolResponse && part.toolResponse.ref?.toolName === fetchExchangeRatesTool.name && part.toolResponse.output) {
            console.log(`Found toolResponse for fetchExchangeRatesTool (date: ${input.date || 'latest'}), using its output:`, JSON.stringify(part.toolResponse.output, null, 2));
            const validatedToolOutput = GetLatestExchangeRatesFlowOutputSchema.safeParse(part.toolResponse.output);
            if (validatedToolOutput.success) {
              console.log(`Validated toolResponse.output successfully (date: ${input.date || 'latest'}):`, JSON.stringify(validatedToolOutput.data, null, 2));
              return validatedToolOutput.data;
            } else {
              console.error(`toolResponse.output failed validation (date: ${input.date || 'latest'}):`, validatedToolOutput.error.flatten());
              console.error(`Raw toolResponse.output that failed (date: ${input.date || 'latest'}):`, JSON.stringify(part.toolResponse.output, null, 2));
            }
          }
        }
      }
    }
    
    console.error(`Could not retrieve exchange rates (date: ${input.date || 'latest'}). Neither llmResponse.output nor direct toolResponse was usable.`);
    if (llmResponse) {
        if (llmResponse.candidates && llmResponse.candidates.length > 0) {
            const candidate = llmResponse.candidates[0];
            console.error(`LLM response primary candidate details (date: ${input.date || 'latest'}):`, JSON.stringify(candidate, null, 2));
             if (candidate.message && candidate.message.content) {
                candidate.message.content.forEach(part => {
                    if (part.text) console.error(`LLM text response part (date: ${input.date || 'latest'}):`, part.text);
                    if (part.toolRequest) console.error(`LLM toolRequest (date: ${input.date || 'latest'}):`, JSON.stringify(part.toolRequest, null, 2));
                });
            }
        } else {
            console.error(`LLM response structure unexpected (date: ${input.date || 'latest'}):`, JSON.stringify(llmResponse, null, 2));
        }
    } else {
        console.error(`LLM response (from getRatesPrompt) was null/undefined (date: ${input.date || 'latest'}).`);
    }
    
    throw new Error(`Could not retrieve exchange rates for date: ${input.date || 'latest'}. LLM did not provide the expected structured output, and direct tool response was not found or was invalid. Check server logs for detailed diagnostic information.`);
  }
);

