import { config } from 'dotenv';
config(); // Load environment variables at the very beginning

// All other imports should come after dotenv.config()
// Genkit flows are removed as per instructions to remove Genkit dependencies.
// import '@/ai/flows/suggest-budget.ts';
// import '@/ai/flows/summarize-transactions.ts';
// import '@/ai/flows/get-latest-exchange-rates-flow.ts';

// This file is now largely empty as Genkit functionality is removed.
// It's kept to avoid breaking existing imports if any, but can be deleted if not used.