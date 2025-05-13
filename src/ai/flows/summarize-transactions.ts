// Summarize the transaction history.

'use server';

/**
 * @fileOverview Summarizes a user's transaction history to provide insights into their spending habits.
 *
 * - summarizeTransactions - A function that summarizes the transaction history.
 * - SummarizeTransactionsInput - The input type for the summarizeTransactions function.
 * - SummarizeTransactionsOutput - The return type for the summarizeTransactions function.
 */

import {ai} from '@/ai/genkit';
// import {z} from 'genkit'; // z is part of genkit, but direct import is also common.
import { 
    SummarizeTransactionsInputSchema, 
    SummarizeTransactionsOutputSchema,
    type SummarizeTransactionsInput,
    type SummarizeTransactionsOutput
} from '@/ai/schemas';

// Export types that were previously defined here, now imported from ai/schemas.ts
export type { SummarizeTransactionsInput, SummarizeTransactionsOutput };

export async function summarizeTransactions(
  input: SummarizeTransactionsInput
): Promise<SummarizeTransactionsOutput> {
  return summarizeTransactionsFlow(input);
}

const summarizeTransactionsPrompt = ai.definePrompt({
  name: 'summarizeTransactionsPrompt',
  input: { schema: SummarizeTransactionsInputSchema }, // Use imported schema
  output: { schema: SummarizeTransactionsOutputSchema }, // Use imported schema
  prompt: `You are a personal finance expert. Please analyze the following transaction history and provide a summary of the user\'s spending habits, highlighting key trends and patterns.

Transaction History:
{{{transactionHistory}}}`,
});

const summarizeTransactionsFlow = ai.defineFlow(
  {
    name: 'summarizeTransactionsFlow',
    inputSchema: SummarizeTransactionsInputSchema, // Use imported schema
    outputSchema: SummarizeTransactionsOutputSchema, // Use imported schema
  },
  async input => {
    const {output} = await summarizeTransactionsPrompt(input);
    return output!;
  }
);
