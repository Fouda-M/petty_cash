import { z } from 'zod';
import { Currency, CURRENCIES_INFO } from '@/lib/constants';
import type { ExchangeRates as AppExchangeRates } from '@/types';

// Schema for the output of the fetchExchangeRatesTool
export const ExchangeRateToolOutputSchema = z.object(
  Object.fromEntries(
    CURRENCIES_INFO.map(c => [c.code, z.number().positive().describe(`Exchange rate for ${c.code} to USD`)])
  )
).describe("Object containing exchange rates for all supported currencies against USD.");
export type ExchangeRateToolOutput = z.infer<typeof ExchangeRateToolOutputSchema>;


// Schema for the output of the getLatestExchangeRatesFlow
// Ensures all defined currencies in Currency enum are present.
export const GetLatestExchangeRatesFlowOutputSchema = z.object(
  Object.fromEntries(
    CURRENCIES_INFO.map(c => [c.code, z.number().positive()])
  )
).refine(data => {
    return Object.values(Currency).every(c => Object.prototype.hasOwnProperty.call(data, c));
}, { message: "Output must be a valid ExchangeRates object with all currency codes mapped to positive numbers." }) as z.ZodType<AppExchangeRates>;

export type GetLatestExchangeRatesFlowOutput = z.infer<typeof GetLatestExchangeRatesFlowOutputSchema>;


// Schemas for suggestBudget flow
export const SuggestBudgetInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe('A string containing the user transaction history.'),
  income: z.number().describe('The user monthly income.'),
  financialGoals: z.string().describe('The user financial goals.'),
});
export type SuggestBudgetInput = z.infer<typeof SuggestBudgetInputSchema>;

export const SuggestBudgetOutputSchema = z.object({
  suggestedBudget: z.string().describe('The suggested budget plan.'),
});
export type SuggestBudgetOutput = z.infer<typeof SuggestBudgetOutputSchema>;


// Schemas for summarizeTransactions flow
export const SummarizeTransactionsInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe(
      'A string containing the transaction history, including dates, amounts, and currencies.'
    ),
});
export type SummarizeTransactionsInput = z.infer<typeof SummarizeTransactionsInputSchema>;

export const SummarizeTransactionsOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the users spending habits, highlighting key trends and patterns.'
    ),
});
export type SummarizeTransactionsOutput = z.infer<typeof SummarizeTransactionsOutputSchema>;
