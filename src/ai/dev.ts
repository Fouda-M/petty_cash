
import { config } from 'dotenv';
config(); // Load environment variables at the very beginning

// All other imports should come after dotenv.config()
import '@/ai/flows/suggest-budget.ts';
import '@/ai/flows/summarize-transactions.ts';
import '@/ai/flows/get-latest-exchange-rates-flow.ts';
