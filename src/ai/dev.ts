
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-budget.ts';
import '@/ai/flows/summarize-transactions.ts';
import '@/ai/flows/get-latest-exchange-rates-flow.ts';
