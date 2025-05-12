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
import {z} from 'genkit';

const SummarizeTransactionsInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe(
      'A string containing the transaction history, including dates, amounts, and currencies.'
    ),
});
export type SummarizeTransactionsInput = z.infer<typeof SummarizeTransactionsInputSchema>;

const SummarizeTransactionsOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the users spending habits, highlighting key trends and patterns.'
    ),
});
export type SummarizeTransactionsOutput = z.infer<typeof SummarizeTransactionsOutputSchema>;

export async function summarizeTransactions(
  input: SummarizeTransactionsInput
): Promise<SummarizeTransactionsOutput> {
  return summarizeTransactionsFlow(input);
}

const summarizeTransactionsPrompt = ai.definePrompt({
  name: 'summarizeTransactionsPrompt',
  input: {schema: SummarizeTransactionsInputSchema},
  output: {schema: SummarizeTransactionsOutputSchema},
  prompt: `You are a personal finance expert. Please analyze the following transaction history and provide a summary of the user\'s spending habits, highlighting key trends and patterns.

Transaction History:
{{{transactionHistory}}}`,
});

const summarizeTransactionsFlow = ai.defineFlow(
  {
    name: 'summarizeTransactionsFlow',
    inputSchema: SummarizeTransactionsInputSchema,
    outputSchema: SummarizeTransactionsOutputSchema,
  },
  async input => {
    const {output} = await summarizeTransactionsPrompt(input);
    return output!;
  }
);
