'use server';

/**
 * @fileOverview A budget suggestion AI agent.
 *
 * - suggestBudget - A function that handles the budget suggestion process.
 * - SuggestBudgetInput - The input type for the suggestBudget function.
 * - SuggestBudgetOutput - The return type for the suggestBudget function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBudgetInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe('A string containing the user transaction history.'),
  income: z.number().describe('The user monthly income.'),
  financialGoals: z.string().describe('The user financial goals.'),
});
export type SuggestBudgetInput = z.infer<typeof SuggestBudgetInputSchema>;

const SuggestBudgetOutputSchema = z.object({
  suggestedBudget: z.string().describe('The suggested budget plan.'),
});
export type SuggestBudgetOutput = z.infer<typeof SuggestBudgetOutputSchema>;

export async function suggestBudget(input: SuggestBudgetInput): Promise<SuggestBudgetOutput> {
  return suggestBudgetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBudgetPrompt',
  input: {schema: SuggestBudgetInputSchema},
  output: {schema: SuggestBudgetOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the user's transaction history, income, and financial goals to suggest a budget plan.

Transaction History: {{{transactionHistory}}}
Income: {{{income}}}
Financial Goals: {{{financialGoals}}}

Suggest a detailed budget plan:
`, // Removed the erroneous backticks here
});

const suggestBudgetFlow = ai.defineFlow(
  {
    name: 'suggestBudgetFlow',
    inputSchema: SuggestBudgetInputSchema,
    outputSchema: SuggestBudgetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
