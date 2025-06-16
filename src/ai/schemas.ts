
import { z } from 'zod';
import { Currency, CURRENCIES_INFO } from '@/lib/constants';
import type { ExchangeRates as AppExchangeRates } from '@/types';

// Schema for the input of the fetchExchangeRatesTool
export const FetchExchangeRatesToolInputSchema = z.object({
  date: z.string().optional().describe('The date for which to fetch exchange rates, in YYYY-MM-DD format. If not provided, fetches latest rates.'),
});
export type FetchExchangeRatesToolInput = z.infer<typeof FetchExchangeRatesToolInputSchema>;

// Schema for the output of the fetchExchangeRatesTool
export const ExchangeRateToolOutputSchema = z.object(
  Object.fromEntries(
    CURRENCIES_INFO.map(c => [c.code, z.number().positive().describe(`Exchange rate for ${c.code} to USD`)])
  )
).describe("Object containing exchange rates for all supported currencies against USD.");
export type ExchangeRateToolOutput = z.infer<typeof ExchangeRateToolOutputSchema>;


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

