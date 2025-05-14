
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
    ExchangeRateToolOutputSchema, // Used by the prompt's output schema
    GetLatestExchangeRatesFlowOutputSchema,
    type GetLatestExchangeRatesFlowOutput as AppGetLatestExchangeRatesOutput
} from '@/ai/schemas';


// Type for the flow, now imported via AppGetLatestExchangeRatesOutput alias
export type GetLatestExchangeRatesOutput = AppGetLatestExchangeRatesOutput;


export async function getLatestExchangeRates(): Promise<GetLatestExchangeRatesOutput> {
  return getLatestExchangeRatesFlow({});
}

const getRatesPrompt = ai.definePrompt({
    name: 'getLatestExchangeRatesPrompt',
    system: 'You are an assistant that helps fetch the latest exchange rates. You MUST use the available tool for this task. Provide only the JSON data from the tool as your final response.',
    tools: [fetchExchangeRatesTool],
    inputSchema: z.object({}).describe("No specific input needed for this prompt"),
    outputSchema: ExchangeRateToolOutputSchema, // LLM should output data conforming to this
    prompt: 'Fetch the latest exchange rates using the available tool. Then, provide the fetched rates *only* as a JSON object conforming to the output schema. Do not include any other text, conversation, or explanation.',
});


const getLatestExchangeRatesFlow = ai.defineFlow(
  {
    name: 'getLatestExchangeRatesFlow',
    inputSchema: z.object({}), // No input for the flow itself
    outputSchema: GetLatestExchangeRatesFlowOutputSchema, // Final flow output schema
  },
  async () => {
    console.log('getLatestExchangeRatesFlow started');
    let llmResponse;
    try {
      llmResponse = await getRatesPrompt({});
      console.log('Full LLM Response from getRatesPrompt:', JSON.stringify(llmResponse, null, 2));
    } catch (promptError: any) {
      console.error('Error calling getRatesPrompt:', promptError);
      const errorMessage = promptError instanceof Error ? promptError.message : String(promptError);
      console.error('getRatesPrompt error details:', JSON.stringify(promptError, null, 2));
      throw new Error(`Failed to interact with the LLM for exchange rates: ${errorMessage}`);
    }

    // Attempt 1: Use the LLM's direct structured output
    if (llmResponse && llmResponse.output) {
        console.log('LLM response.output received:', JSON.stringify(llmResponse.output, null, 2));
        const validatedOutput = GetLatestExchangeRatesFlowOutputSchema.safeParse(llmResponse.output);
        if (validatedOutput.success) {
            console.log('Validated llmResponse.output successfully:', JSON.stringify(validatedOutput.data, null, 2));
            return validatedOutput.data;
        } else {
            console.error('llmResponse.output was present but failed validation against GetLatestExchangeRatesFlowOutputSchema:', validatedOutput.error.flatten());
            console.error('Raw llmResponse.output that failed validation:', JSON.stringify(llmResponse.output, null, 2));
            // Don't throw yet, try to find direct tool response next
        }
    }

    // Attempt 2: If llmResponse.output is missing or invalid, try to find and use direct toolResponse
    if (llmResponse && llmResponse.candidates && llmResponse.candidates.length > 0) {
      const candidate = llmResponse.candidates[0];
      if (candidate.message && candidate.message.content) {
        for (const part of candidate.message.content) {
          // Check if this part is a toolResponse from the correct tool and has output
          if (part.toolResponse && part.toolResponse.ref?.toolName === fetchExchangeRatesTool.name && part.toolResponse.output) {
            console.log('Found toolResponse for fetchExchangeRatesTool, attempting to use its output directly:', JSON.stringify(part.toolResponse.output, null, 2));
            // The tool's output should already conform to ExchangeRateToolOutputSchema.
            // Validate it against the flow's output schema (GetLatestExchangeRatesFlowOutputSchema).
            const validatedToolOutput = GetLatestExchangeRatesFlowOutputSchema.safeParse(part.toolResponse.output);
            if (validatedToolOutput.success) {
              console.log('Validated toolResponse.output successfully:', JSON.stringify(validatedToolOutput.data, null, 2));
              return validatedToolOutput.data;
            } else {
              console.error('toolResponse.output failed validation against GetLatestExchangeRatesFlowOutputSchema:', validatedToolOutput.error.flatten());
              console.error('Raw toolResponse.output that failed validation:', JSON.stringify(part.toolResponse.output, null, 2));
              // Fall through to the generic error if tool output is also bad
            }
          }
        }
      }
    }
    
    // If we reach here, neither llmResponse.output nor a direct toolResponse output was usable.
    // Log detailed info for debugging.
    console.error('Could not retrieve exchange rates. Neither llmResponse.output nor direct toolResponse was usable.');
    if (llmResponse) {
        if (llmResponse.candidates && llmResponse.candidates.length > 0) {
            const candidate = llmResponse.candidates[0];
            console.error('LLM response primary candidate details (for debugging failure):', JSON.stringify(candidate, null, 2));
            if (candidate.message && candidate.message.content) {
                let foundToolRequest = false;
                candidate.message.content.forEach(part => {
                    if (part.text) {
                        console.error('LLM text response part (instead of structured output):', part.text);
                    }
                    if (part.toolRequest) {
                        console.error('LLM generated a toolRequest:', JSON.stringify(part.toolRequest, null, 2));
                        foundToolRequest = true;
                    }
                     if (part.toolResponse && part.toolResponse.ref?.toolName === fetchExchangeRatesTool.name) {
                        console.error('LLM part contained a toolResponse for fetchExchangeRatesTool, but its output was not usable or failed validation. Output was:', JSON.stringify(part.toolResponse.output, null, 2));
                    } else if (part.toolResponse) {
                        console.error('LLM part contained a toolResponse for an unexpected tool or missing output:', JSON.stringify(part.toolResponse, null, 2));
                    }
                });
                if (foundToolRequest && !(candidate.message.content.some(p => p.toolResponse?.ref?.toolName === fetchExchangeRatesTool.name && p.toolResponse.output))) {
                    console.error("A toolRequest was generated by the LLM, but a usable toolResponse output for fetchExchangeRatesTool is missing or invalid.");
                }
            } else {
                 console.error("Primary candidate's message or message.content was missing.");
            }
        } else {
            console.error('LLM response was present but had no candidates or unexpected structure (for debugging failure):', JSON.stringify(llmResponse, null, 2));
        }
    } else {
        console.error('LLM response (from getRatesPrompt) was entirely null or undefined (for debugging failure).');
    }
    
    throw new Error('Could not retrieve exchange rates. LLM did not provide the expected structured output, and direct tool response was not found or was invalid. Check server logs for detailed diagnostic information.');
  }
);

