'use server';

/**
 * @fileOverview A budget suggestion AI agent.
 *
 * - suggestBudget - A function that handles the budget suggestion process.
 * - SuggestBudgetInput - The input type for the suggestBudget function.
 * - SuggestBudgetOutput - The return type for the suggestBudget function.
 */

import {ai} from '@/ai/genkit';
// Zod import from 'genkit' might be fine, but direct import is also common.
// import {z} from 'genkit'; 
import { 
    SuggestBudgetInputSchema, 
    SuggestBudgetOutputSchema,
    type SuggestBudgetInput,
    type SuggestBudgetOutput
} from '@/ai/schemas';

// Export types that were previously defined here, now imported from ai/schemas.ts
export type { SuggestBudgetInput, SuggestBudgetOutput };

export async function suggestBudget(input: SuggestBudgetInput): Promise<SuggestBudgetOutput> {
  return suggestBudgetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBudgetPrompt',
  input: { schema: SuggestBudgetInputSchema }, // Use imported schema
  output: { schema: SuggestBudgetOutputSchema }, // Use imported schema
  prompt: `You are a personal finance advisor. Analyze the user's transaction history, income, and financial goals to suggest a budget plan.

Transaction History: {{{transactionHistory}}}
Income: {{{income}}}
Financial Goals: {{{financialGoals}}}

Suggest a detailed budget plan:
`,
});

const suggestBudgetFlow = ai.defineFlow(
  {
    name: 'suggestBudgetFlow',
    inputSchema: SuggestBudgetInputSchema, // Use imported schema
    outputSchema: SuggestBudgetOutputSchema, // Use imported schema
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
